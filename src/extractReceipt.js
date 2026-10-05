import { getDocument,GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { request } from './api.js';
GlobalWorkerOptions.workerSrc=workerUrl;
async function imageText(data,type,signal) {
  return (await request('/api/ocr',{method:'POST',signal,body:JSON.stringify({attachment:{name:'receipt',type,data}})})).text;
}
export async function extractReceipt(file,{signal,onProgress=()=>{}}={}) {
  if(file.size>6*1024*1024)throw new Error('Please choose a file smaller than 6 MB.');
  if(!['image/jpeg','image/png','application/pdf'].includes(file.type))throw new Error('Choose a JPG, PNG or PDF.');
  if(file.type!=='application/pdf') {
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this image.'));reader.readAsDataURL(file);});
    onProgress('Reading English and Hindi text… First use downloads the OCR models.');
    return {text:await imageText(data,file.type,signal),note:'Photo text read with OCR. Check every amount and date.'};
  }
  const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
  let pdf;
  try {
    pdf=await task.promise;const pages=Math.min(pdf.numPages,3);const texts=[];
    for(let n=1;n<=pages;n++) {
      signal?.throwIfAborted();onProgress(`Reading PDF page ${n} of ${pages}…`);
      const page=await pdf.getPage(n);const content=await page.getTextContent();
      let text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
      if(text.replace(/\s/g,'').length<20) {
        const original=page.getViewport({scale:1});const scale=Math.min(2,2400/Math.max(original.width,original.height));
        const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        text=await imageText(canvas.toDataURL('image/png').split(',')[1],'image/png',signal);
        canvas.width=0;canvas.height=0;
      }
      texts.push(text);
    }
    return {text:texts.join('\n\n').slice(0,12000),note:pdf.numPages>3?'Read the first 3 pages only. The complete original will be attached.':'PDF text extracted. Check every amount and date.'};
  } finally {await task.destroy();}
}
