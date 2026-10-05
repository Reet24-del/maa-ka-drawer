import { useRef } from 'react';
import { ArrowUpRight, FileText } from 'lucide-react';
import { niceDate } from './api.js';

const illustrations = [
  [/washing|washer|laundry/i, 'washer', '0% 0%'],
  [/purifier|\bro\b|water filter/i, 'purifier', '50% 0%'],
  [/mixer|grinder|blender/i, 'mixer', '100% 0%'],
  [/refrigerator|fridge/i, 'fridge', '0% 100%'],
  [/ceiling fan|\bfan\b|pankha/i, 'fan', '50% 100%'],
  [/microwave|oven/i, 'microwave', '100% 100%'],
];

export default function ReceiptCard({ receipt, query, onOpen }) {
  const surface = useRef(null);
  const illustration = illustrations.find(([pattern]) => pattern.test(receipt.title));

  function tilt(event) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Measure the stationary wrapper so the moving card never feeds back into its own angle.
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    surface.current.style.setProperty('--tilt-x', `${(0.5 - y) * 12}deg`);
    surface.current.style.setProperty('--tilt-y', `${(x - 0.5) * 14}deg`);
  }
  function reset() {
    surface.current?.style.removeProperty('--tilt-x');
    surface.current?.style.removeProperty('--tilt-y');
  }

  return <div className="flashcard-slot" onPointerMove={tilt} onPointerLeave={reset} onPointerCancel={reset}>
    <button ref={surface} className={`flashcard ${illustration?.[1] || 'generic'}`} onClick={() => onOpen(receipt)} aria-label={`Open ${receipt.title} receipt`} aria-haspopup="dialog">
      <span className="card-art" aria-hidden="true">
        {illustration ? <span className="appliance-image" style={{ backgroundPosition: illustration[2] }}/> : <span className="generic-paper"><FileText size={74} strokeWidth={1}/><span>{receipt.category}</span></span>}
      </span>
      <span className="card-caption"><span className="card-title">{receipt.title}</span><span className="card-meta">{receipt.merchant || receipt.category} · {niceDate(receipt.purchaseDate)}</span><ArrowUpRight className="card-arrow" size={22} strokeWidth={1.4}/>
      {query && <span className="card-match">{receipt.exactMatch === 1 ? 'Contains your exact words' : Number(receipt.lexicalScore) > 0 ? 'Matched words in the receipt' : 'Related meaning in the receipt'}</span>}
      </span>
    </button>
  </div>;
}
