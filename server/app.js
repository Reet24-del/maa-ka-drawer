import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { receiptSchema, searchSchema, validateAttachment } from './validation.js';
import { DATA_DIR } from './config.js';
import { modelState } from './embeddings.js';
import { SEMANTIC_MIN } from './repository.js';
import { decodePcm, transcribe, transcriptionState } from './transcription.js';
import { readReceiptImage } from './ocr.js';

export function createApp(state) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    // Local single-household app: reject cross-origin requests with side effects.
    const origin = req.get('origin');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && origin) {
      const allowed = [process.env.APP_ORIGIN, 'http://127.0.0.1:5173','http://localhost:5173',`http://${req.get('host')}`].filter(Boolean);
      if (!allowed.includes(origin)) return res.status(403).json({error:'This origin is not allowed.'});
    }
    next();
  });
  app.use(express.json({limit:'9mb'}));
  app.get('/api/health', (req,res) => res.json({
    status:state.status, database:state.kind, model:modelState, transcription:transcriptionState,
    search:{method:'PostgreSQL full-text + pgvector cosine + reciprocal rank fusion',semanticMinimum:SEMANTIC_MIN},
    error:state.status==='error' ? 'Startup failed. Check the server log and database/model access.' : undefined,
  }));
  app.use('/api', (req,res,next) => state.status==='ready' ? next() : res.status(503).json({error:state.status==='error'?'The drawer could not start. Check the database connection and restart.':'Preparing the search model and receipt drawer. Please try again shortly.'}));
  app.get('/api/receipts', async (req,res) => {
    const params=searchSchema.parse({q:'',category:req.query.category});
    res.json({receipts:await state.repo.list(params.category)});
  });
  app.post('/api/transcribe', async (req,res) => {
    if(!req.body||!['hi-IN','en-IN'].includes(req.body.language)||req.body.sampleRate!==16000)return res.status(400).json({error:'Use Hindi or Indian English with 16 kHz audio.'});
    let samples;try{samples=decodePcm(req.body.audio);}catch{return res.status(400).json({error:'Invalid voice recording. Record up to 30 seconds and try again.'});}
    try{res.json(await transcribe(samples,req.body.language));}catch(error){res.status(error.status||503).json({error:error.status===429?error.message:'Local transcription could not finish. Try again, or type your note. The first use downloads the open speech model.'});}
  });
  app.post('/api/ocr', async (req,res) => {
    const file=req.body?.attachment;
    if(!file||!['image/png','image/jpeg'].includes(file.type)||typeof file.data!=='string')return res.status(400).json({error:'Choose a PNG or JPG image for OCR.'});
    let bytes;try{bytes=validateAttachment(file);}catch{return res.status(400).json({error:'Invalid receipt image. Choose a JPG or PNG up to 6 MB.'});}
    try{res.json(await readReceiptImage(bytes));}catch(error){res.status(error.status||422).json({error:error.status===429?error.message:'Could not read this image. Try a clearer photo, or enter the text yourself.'});}
  });
  app.get('/api/search', async (req,res) => {
    const p=searchSchema.parse(req.query);
    res.json(await state.repo.search(p.q,p));
  });
  app.get('/api/receipts/:id', async (req,res) => {
    if (!isUuid(req.params.id)) return res.status(400).json({error:'Invalid receipt ID'});
    const receipt=await state.repo.detail(req.params.id);
    if (!receipt) return res.status(404).json({error:'Receipt not found'});
    res.json({receipt});
  });
  app.post('/api/receipts', async (req,res) => {
    const input=receiptSchema.parse(req.body);
    const bytes=validateAttachment(input.attachment);
    let attachment;
    if (bytes) {
      const dir=path.join(DATA_DIR,'uploads'); await mkdir(dir,{recursive:true});
      const ext={'image/jpeg':'.jpg','image/png':'.png','application/pdf':'.pdf'}[input.attachment.type];
      attachment={path:path.join(dir,randomUUID()+ext),type:input.attachment.type,name:path.basename(input.attachment.name)};
      await writeFile(attachment.path,bytes,{mode:0o600});
    }
    try { res.status(201).json({receipt:await state.repo.save(input,{attachment})}); }
    catch (error) { if(attachment) await unlink(attachment.path).catch(()=>{}); throw error; }
  });
  app.patch('/api/receipts/:id/archive', async (req,res) => {
    if(!isUuid(req.params.id)||typeof req.body.archived!=='boolean') return res.status(400).json({error:'Invalid archive request'});
    if(!await state.repo.archive(req.params.id,req.body.archived)) return res.status(404).json({error:'Receipt not found'});
    res.json({ok:true});
  });
  app.get('/api/receipts/:id/source', async (req,res) => {
    if(!isUuid(req.params.id)) return res.status(400).end();
    const attachment=await state.repo.attachment(req.params.id);
    if(!attachment?.attachment_path) return res.status(404).json({error:'No original attached'});
    res.setHeader('Content-Type',attachment.attachment_type);
    res.setHeader('Content-Disposition',`inline; filename="receipt${path.extname(attachment.attachment_path)}"`);
    res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
    res.sendFile(attachment.attachment_path,{dotfiles:'allow'});
  });
  app.use('/api',(req,res)=>res.status(404).json({error:'Unknown API route'}));
  const dist=path.resolve('dist');
  app.use(express.static(dist));
  app.get('/{*path}',(req,res)=>res.sendFile(path.join(dist,'index.html')));
  app.use((error,req,res,next)=>{
    if(error.name==='ZodError') return res.status(400).json({error:error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')});
    if(error.type==='entity.too.large') return res.status(413).json({error:'This upload is too large. Maximum attachment size is 6 MB.'});
    if(error instanceof SyntaxError && 'body' in error) return res.status(400).json({error:'Invalid JSON'});
    if(/attachment|File content/.test(error.message)) return res.status(400).json({error:error.message});
    console.error('[request error]',error.name,error.code || '');
    res.type('application/json').status(500).json({error:'The request failed. Your saved receipts are safe; please try again.'});
  });
  return app;
}
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
