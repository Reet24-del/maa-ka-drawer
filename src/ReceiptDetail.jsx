import { Archive, FileText } from 'lucide-react';
import { niceDate } from './api.js';
import { lazy, Suspense } from 'react';
const OriginalSource=lazy(()=>import('./OriginalSource.jsx'));
export default function ReceiptDetail({receipt,onArchive,archiving}) {
  if(!receipt) return <aside className="evidence empty-evidence"><FileText size={36}/><h2>A place for the proof.</h2><p>Select a receipt to see its saved text and original document.</p></aside>;
  return <aside className="evidence" id="receipt-evidence" aria-label="Receipt evidence">
    <div className="evidence-heading"><h2>{receipt.title}</h2><p>{receipt.isSample?'Sample receipt':'Saved receipt'}</p></div>
    {receipt.attachmentType && <Suspense fallback={<p className="pdf-status">Loading original…</p>}><OriginalSource receipt={receipt} key={receipt.id}/></Suspense>}
    <article className="receipt-paper" aria-label="Saved receipt text"><pre>{receipt.receiptText}</pre></article>
    <p className="source-caption">{receipt.attachmentType?'Saved receipt text. Check the original above.':'Saved receipt text. No original attached.'}</p>
    {!receipt.isSample && <dl className="facts"><div><dt>Purchase date</dt><dd>{niceDate(receipt.purchaseDate)}</dd></div><div><dt>Warranty ends</dt><dd>{receipt.warrantyEndDate?niceDate(receipt.warrantyEndDate):'Not stated — check the original'}</dd></div></dl>}
    {receipt.isSample && !receipt.warrantyEndDate && <p className="missing-fact">Warranty expiry is not recorded. We won’t guess it.</p>}
    <div className="evidence-footer"><span>{receipt.isSample?'Fictional sample · dates supplied in demo text':'You confirmed these details against the source'}</span><button className="quiet-button" onClick={()=>onArchive(receipt)} disabled={archiving}><Archive size={15}/>{archiving?'Archiving…':'Archive'}</button></div>
  </aside>;
}
