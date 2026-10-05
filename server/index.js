import { openDatabase } from './db.js';
import { ReceiptRepository } from './repository.js';
import { createApp } from './app.js';
import { PORT } from './config.js';
import { disposeModel } from './embeddings.js';
import { disposeTranscriber } from './transcription.js';
import { disposeOcr } from './ocr.js';
const state={status:'starting',kind:process.env.DATABASE_URL ? 'connecting' : 'local-pglite'};
const server=createApp(state).listen(PORT,process.env.HOST || '127.0.0.1',()=>console.log(`Maa ka Drawer: http://${process.env.HOST || '127.0.0.1'}:${PORT}`));
try {
  const {db,kind}=await openDatabase(); state.db=db; state.kind=kind; state.repo=new ReceiptRepository(db);
  await state.repo.seed(); state.status='ready'; console.log(`Ready (${kind}). Open multilingual embeddings + actual pgvector SQL.`);
} catch(error) { state.status='error'; console.error('Startup failed:',error.name,error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[connection redacted]')); }
let stopping=false;
async function stop() {
  if(stopping)return; stopping=true;
  await new Promise(resolve=>server.close(resolve));
  await disposeModel();
  await disposeTranscriber();
  await disposeOcr();
  if(state.db)await state.db.close();
  process.exitCode=0;
}
process.on('SIGINT',stop); process.on('SIGTERM',stop);
