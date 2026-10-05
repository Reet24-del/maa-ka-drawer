import { useEffect,useRef,useState } from 'react';
import { Archive, Search, Plus, LoaderCircle, X } from 'lucide-react';
import { request } from './api.js';
import ReceiptCard from './ReceiptCard.jsx';
import ReceiptDialog from './ReceiptDialog.jsx';
import AddReceipt from './AddReceipt.jsx';

export default function App() {
  const [health,setHealth]=useState(null),[all,setAll]=useState([]),[results,setResults]=useState([]),[selected,setSelected]=useState(null);
  const [draft,setDraft]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('All');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[adding,setAdding]=useState(false),[archiving,setArchiving]=useState(false),[notice,setNotice]=useState(null);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const requestId=useRef(0); const searchRef=useRef(null);
  useEffect(()=>{
    let alive=true;let timer;
    async function poll(){try{const h=await request('/api/health');if(!alive)return;setHealth(h);if(h.status==='ready')await refresh();else if(h.status!=='error')timer=setTimeout(poll,1800);}catch(e){if(alive){setError('Cannot reach the drawer. Make sure the app server is running.');timer=setTimeout(poll,5000);}}}
    poll();return()=>{alive=false;clearTimeout(timer);};
  },[]);
  async function refresh(preferId) {
    const data=await request('/api/receipts');setAll(data.receipts);
    await runSearch(query,category,preferId,data.receipts);
  }
  async function runSearch(text,filter=category,preferId=null,known=null) {
    const id=++requestId.current;setBusy(true);setError('');setQuery(text.trim());setCategory(filter);
    try{
      let found;
      if(!text.trim()) {const data=known?{receipts:known}:await request('/api/receipts');if(id!==requestId.current)return;setAll(data.receipts);found=data.receipts.filter(x=>filter==='All'||x.category===filter);}
      else {const data=await request(`/api/search?${new URLSearchParams({q:text,category:filter})}`);found=data.results;}
      if(id!==requestId.current)return;
      setResults(found);setSelected(previous=>found.find(x=>x.id===(preferId||previous?.id))||found[0]||null);
    }catch(e){if(id===requestId.current)setError(e.message);}finally{if(id===requestId.current)setBusy(false);}
  }
  function search(event){event.preventDefault();runSearch(draft);}
  async function archive(receipt){setArchiving(true);setError('');try{await request(`/api/receipts/${receipt.id}/archive`,{method:'PATCH',body:JSON.stringify({archived:true})});setNotice({text:`${receipt.title} archived.`,id:receipt.id});setDetailsOpen(false);await refresh();}catch(e){setError(e.message);}finally{setArchiving(false);}}
  async function undo(){const id=notice.id;try{await request(`/api/receipts/${id}/archive`,{method:'PATCH',body:JSON.stringify({archived:false})});setNotice({text:'Receipt restored.'});await refresh(id);}catch(e){setError(e.message);}}
  function useExample(value){setDraft(value);runSearch(value);}
  function onSaved(receipt){setQuery('');setDraft('');setCategory('All');setNotice({text:`${receipt.title} saved.`});request('/api/receipts').then(data=>{setAll(data.receipts);setResults(data.receipts);setSelected(data.receipts.find(x=>x.id===receipt.id));}).catch(e=>setError(e.message));}
  const ready=health?.status==='ready';
  return <>
    <header className="site-header"><a className="brand" href="/" aria-label="Maa ka Drawer home"><span className="drawer-icon" aria-hidden="true"><Archive size={35} strokeWidth={1.5}/></span>Maa ka Drawer</a><button className="primary add-button" onClick={()=>setAdding(true)} disabled={!ready}><Plus size={20}/>Add receipt</button></header>
    <main>
      <section className="intro" aria-labelledby="main-heading"><h1 id="main-heading">A little less searching.</h1><p>Your household bills, right where you need them.</p>
        <form className="search-form" role="search" onSubmit={search}><div className="search-input"><Search size={26}/><input ref={searchRef} aria-label="Search your receipts" placeholder="Try “washing machine warranty”" value={draft} maxLength={300} onChange={event=>setDraft(event.target.value)} disabled={!ready}/>{draft&&<button type="button" className="icon-button clear-input" aria-label="Clear search" onClick={()=>{setDraft('');runSearch('');searchRef.current?.focus();}}><X size={18}/></button>}</div><button className="primary search-button" disabled={!ready||busy}>{busy?<LoaderCircle className="spin" size={21}/>:'Search'}</button></form>
        <div className="examples"><span>Try a search:</span>{[['Washing machine','Washing machine'],['RO service','RO service'],['Mixer bill','Mixer bill']].map(([label,value])=><button disabled={!ready} key={label} onClick={()=>useExample(value)}>{label}</button>)}</div>
      </section>
      {!ready&&<div className="startup" role="status">{health?.status==='error'?<><strong>The drawer couldn’t start.</strong><span>Check the database connection and restart the server.</span></>:<><LoaderCircle className="spin" size={20}/><span>Preparing your drawer. The open search model may take a minute on the first run.</span></>}</div>}
      {error&&<div className="error-banner" role="alert"><span>{error}</span>{ready&&<button onClick={()=>runSearch(query)}>Try again</button>}</div>}
      {ready&&<>
        <p className="sample-notice gallery-notice">{all.some(r=>r.isSample)?'Sample drawer · Fictional receipts for trying things out':'Your drawer · Saved receipts and source documents'}</p>
        <div className="workspace card-workspace" aria-busy={busy}>
          <section className="receipts" aria-label="Receipt cards"><div className="list-heading"><h2>{query?'Search results':'Your receipts'}</h2><span aria-live="polite">{query?`${results.length} found`:`${all.length} saved`}</span></div>
            <div className="filters" role="group" aria-label="Filter receipts">{['All','Appliances','Services',...(all.some(r=>r.category==='Other')?['Other']:[])].map(value=><button className={category===value?'active':''} aria-pressed={category===value} onClick={()=>runSearch(query,value)} key={value}>{value}</button>)}</div>
            {query&&<div className="search-summary"><span>For “{query}”</span><button onClick={()=>{setDraft('');runSearch('');}}>Show all receipts</button></div>}
            <div className={`card-gallery ${busy?'pending':''}`}>
              {results.map(receipt=><ReceiptCard key={receipt.id} receipt={receipt} query={query} onOpen={item=>{setSelected(item);setDetailsOpen(true);}}/>)}
            </div>
            {!busy&&results.length===0&&<div className="empty-list"><Search size={30}/><h3>{query?'No clear match in this drawer.':'Nothing here yet.'}</h3><p>{query?'Try an item name, shop or invoice number. Only saved receipts can be found.':'Add a receipt, or choose another category.'}</p></div>}
          </section>

        </div>
      </>}
    </main>
    {notice&&<div className="toast" role="status"><span>{notice.text}</span>{notice.id&&<button onClick={undo}>Undo</button>}<button className="icon-button" aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={16}/></button></div>}
    <ReceiptDialog open={detailsOpen} receipt={selected} onClose={()=>setDetailsOpen(false)} onArchive={archive} archiving={archiving}/>
    <AddReceipt open={adding} onClose={()=>setAdding(false)} onSaved={onSaved}/>
  </>;
}
