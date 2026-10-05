import { useEffect,useRef,useState } from 'react';
import { Download, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { getDocument,GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
export default function OriginalSource({receipt}) {
  const url=`/api/receipts/${receipt.id}/source`;
  const canvas=useRef(null);const [pdf,setPdf]=useState(null);const [page,setPage]=useState(1);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(receipt.attachmentType!=='application/pdf')return;
    let active=true;setPdf(null);setPage(1);setError('');setLoading(true);
    const task=getDocument({url,isEvalSupported:false});
    task.promise.then(document=>{if(active)setPdf(document);}).catch(()=>{if(active){setError('Preview unavailable. You can still download the original.');setLoading(false);}});
    return()=>{active=false;task.destroy();};
  },[url,receipt.attachmentType]);
  useEffect(()=>{
    if(!pdf)return;let active=true;let rendering;setLoading(true);
    pdf.getPage(page).then(sheet=>{
      if(!active)return;
      const viewport=sheet.getViewport({scale:1.5});const element=canvas.current;
      element.height=viewport.height;element.width=viewport.width;
      rendering=sheet.render({canvasContext:element.getContext('2d'),viewport});
      return rendering.promise;
    }).then(()=>{if(active)setLoading(false);}).catch(e=>{if(active&&e.name!=='RenderingCancelledException'){setError('Could not show this page. Download the original to view it.');setLoading(false);}});
    return()=>{active=false;rendering?.cancel();};
  },[pdf,page]);
  if(!receipt.attachmentType)return null;
  return <div className="original-source">
    <div className="original-heading"><span>Original document</span><a href={url} download={receipt.attachmentName || 'receipt'} className="source-link">Download <Download size={15}/></a></div>
    {receipt.attachmentType.startsWith('image/')?<a href={url} target="_blank" rel="noreferrer" className="original-image"><img src={url} alt={`Original attached receipt for ${receipt.title}`}/></a>:<>
      {loading&&<p className="pdf-status"><LoaderCircle size={16} className="spin"/>Loading original…</p>}
      {error&&<p className="pdf-status" role="status">{error}</p>}
      <div className="pdf-viewport" role="region" aria-label="Original PDF preview" tabIndex={0}><canvas ref={canvas} className="pdf-page" aria-label={`Original PDF page ${page}`} hidden={!pdf||!!error}/></div>
      {pdf?.numPages>1&&<div className="pdf-controls"><button className="icon-button" aria-label="Previous PDF page" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={18}/></button><span>Page {page} of {pdf.numPages}</span><button className="icon-button" aria-label="Next PDF page" disabled={page>=pdf.numPages} onClick={()=>setPage(page+1)}><ChevronRight size={18}/></button></div>}
    </>}
  </div>;
}
