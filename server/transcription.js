import { pipeline, env } from '@huggingface/transformers';
import path from 'node:path';
import { DATA_DIR } from './config.js';
env.cacheDir=path.join(DATA_DIR,'models');env.allowLocalModels=false;
const MODEL='onnx-community/whisper-small';
let modelPromise,working=false;
export const transcriptionState={status:'idle',model:MODEL};
export function loadTranscriber(){
 if(!modelPromise){transcriptionState.status='loading';modelPromise=pipeline('automatic-speech-recognition',MODEL,{dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}}).then(model=>{transcriptionState.status='ready';return model;}).catch(error=>{modelPromise=undefined;transcriptionState.status='error';throw error;});}
 return modelPromise;
}
export function decodePcm(encoded){
 if(typeof encoded!=='string'||encoded.length>2560000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Error('Invalid voice recording');
 const bytes=Buffer.from(encoded,'base64');if(bytes.length%4||bytes.length<3200||bytes.length>1920000)throw new Error('Voice recording must be between 0.05 and 30 seconds');
 const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(!samples.every(x=>Number.isFinite(x)&&Math.abs(x)<=1.01))throw new Error('Invalid voice samples');
 return samples;
}
export async function transcribe(samples,language='hi-IN'){
 if(working){const e=new Error('Another voice note is being transcribed. Try again shortly.');e.status=429;throw e;}
 working=true;
 try{
  let energy=0;for(const v of samples)energy+=v*v;
  if(Math.sqrt(energy/samples.length)<0.002)return {text:'',model:MODEL};
  const model=await loadTranscriber();
  const result=await model(samples,{language:language==='en-IN'?'english':'hindi',task:'transcribe',max_new_tokens:128,num_beams:1});
  return {text:String(result.text||'').trim(),model:MODEL};
 }finally{working=false;}
}
export async function disposeTranscriber(){if(modelPromise){const model=await modelPromise.catch(()=>null);await model?.dispose();}modelPromise=undefined;transcriptionState.status='idle';}
