import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { DATA_DIR } from './config.js';

let workerPromise;
let busy=false;
async function worker() {
  if(!workerPromise) {
    const cachePath=path.join(DATA_DIR,'ocr');
    await mkdir(cachePath,{recursive:true});
    workerPromise=createWorker(['eng','hin'],1,{cachePath,logger:()=>{}}).catch(error=>{workerPromise=null;throw error;});
  }
  return workerPromise;
}
export async function readReceiptImage(bytes) {
  if(busy)throw Object.assign(new Error('Another receipt is being read. Please try again shortly.'),{status:429});
  busy=true;
  let timer;
  try {
    const image=await sharp(bytes,{limitInputPixels:40_000_000}).rotate().resize({width:2400,height:3200,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).png().toBuffer();
    const run=async()=>{const engine=await worker();return engine.recognize(image);};
    const result=await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('OCR timed out')),120000);})]);
    return {text:result.data.text.trim().slice(0,12000),engine:'Tesseract.js (English + Hindi)'};
  } catch(error) {
    await disposeOcr();
    throw error;
  } finally {clearTimeout(timer);busy=false;}
}
export async function disposeOcr() {const pending=workerPromise;workerPromise=null;if(pending)await pending.then(w=>w.terminate()).catch(()=>{});}
