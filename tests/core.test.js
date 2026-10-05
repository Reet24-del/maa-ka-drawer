import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.js';
import { ReceiptRepository } from '../server/repository.js';
import { createApp } from '../server/app.js';
import { samples } from '../server/samples.js';

const temp=await mkdtemp(path.join(os.tmpdir(),'maa-drawer-tests-'));
let {db}=await openDatabase({directory:temp,url:null});
let repo=new ReceiptRepository(db);
await repo.seed();
const state={status:'ready',kind:'local-pglite',repo};
const server=createApp(state).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const api=async(route,options={})=>fetch(base+route,{...options,headers:{'Content-Type':'application/json',...options.headers}});
let added;

test('OCR API rejects non-image and disguised upload bodies',async()=>{
  for(const body of [null,{attachment:{type:'application/pdf',data:'JVBERi0='}},{attachment:{type:'image/png',data:Buffer.from('<html>not an image</html>').toString('base64')}}]) {
    assert.equal((await api('/api/ocr',{method:'POST',body:JSON.stringify(body)})).status,400);
  }
});

test('voice API rejects malformed audio and does not hallucinate from silence',async()=>{
 for(const body of [{language:'hi-IN',sampleRate:8000,audio:'abcd'},{language:'hi-IN',sampleRate:16000,audio:'not-base64!'}]){
  assert.equal((await api('/api/transcribe',{method:'POST',body:JSON.stringify(body)})).status,400);
 }
 const silence=new Float32Array(16000);
 const response=await api('/api/transcribe',{method:'POST',body:JSON.stringify({language:'hi-IN',sampleRate:16000,audio:Buffer.from(silence.buffer).toString('base64')})});
 assert.equal(response.status,200);assert.equal((await response.json()).text,'');
});

test('seeded sample dates are exactly stored, unknown warranty stays null',async()=>{
 assert.equal((await repo.list()).length,6);
 assert.equal((await repo.detail(samples[3].id)).warrantyEndDate,null);
 assert.equal((await repo.detail(samples[0].id)).warrantyEndDate,'2028-09-14');
});
test('Hindi semantic retrieval finds the English receipt while keyword does not',async()=>{
 const query='कपड़े धोने वाली मशीन';
 assert.equal((await repo.search(query,{mode:'keyword'})).results.length,0);
 assert.equal((await repo.search(query)).results[0]?.id,samples[0].id);
});
test('unrelated development query is refused by semantic ambiguity gate',async()=>{
 assert.equal((await repo.search('passport renewal appointment')).results.length,0);
});
test('exact invoice lookup returns only that invoice; unknown identifier returns none',async()=>{
 const found=await repo.search('HA-2026-0914');
 assert.deepEqual(found.results.map(x=>x.id),[samples[0].id]);
 assert.equal((await repo.search('ZZ-NOT-9999')).results.length,0);
});
test('category filter applies to vector and keyword candidates',async()=>{
 const found=await repo.search('RO service',{category:'Services'});
 assert.ok(found.results.length>0);
 assert.ok(found.results.every(x=>x.category==='Services'));
});
test('input rejects unconfirmed facts and invalid dates',async()=>{
 for(const patch of [{checked:false},{purchaseDate:'2026-02-31'},{receiptText:'too short'}]){
 const res=await api('/api/receipts',{method:'POST',body:JSON.stringify({title:'QA kettle',category:'Appliances',receiptText:'QA KETTLE — Fictional purchase record. Invoice QA-001.',checked:true,...patch})});
 assert.equal(res.status,400);
 }
});
test('rejects disguised executable uploads',async()=>{
 const res=await api('/api/receipts',{method:'POST',body:JSON.stringify({title:'QA kettle',receiptText:'A fictional kettle receipt for QA only.',checked:true,attachment:{name:'fake.png',type:'image/png',data:Buffer.from('<html><script>alert(1)</script></html>').toString('base64')}})});
 assert.equal(res.status,400);
});
test('add, search, archive and undo preserve the receipt',async()=>{
 const res=await api('/api/receipts',{method:'POST',body:JSON.stringify({title:'QA kettle',category:'Appliances',merchant:'Synthetic QA shop',receiptText:'QA KETTLE — Synthetic record only. Invoice QA-KETTLE-9000. Electric kettle. Total INR 900. No warranty date.',checked:true})});
 assert.equal(res.status,201);added=(await res.json()).receipt;
 assert.equal(added.warrantyEndDate,null);
 assert.equal((await repo.search('QA-KETTLE-9000')).results[0].id,added.id);
 await repo.archive(added.id,true);assert.equal((await repo.search('QA-KETTLE-9000')).results.length,0);
 await repo.archive(added.id,false);assert.equal((await repo.search('QA-KETTLE-9000')).results[0].id,added.id);
});
test('valid original attachment is served with a safe media type',async()=>{
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0XQAAAAASUVORK5CYII=';
 const res=await api('/api/receipts',{method:'POST',body:JSON.stringify({title:'QA attached source',category:'Other',receiptText:'Synthetic QA attachment record, not a real purchase.',checked:true,attachment:{name:'source.png',type:'image/png',data:png}})});
 assert.equal(res.status,201);const receipt=(await res.json()).receipt;
 const source=await api(`/api/receipts/${receipt.id}/source`);
 assert.equal(source.status,200);
 assert.equal(source.headers.get('content-type'),'image/png');
 assert.deepEqual(Buffer.from(await source.arrayBuffer()),Buffer.from(png,'base64'));
 const saved=await repo.attachment(receipt.id);await repo.archive(receipt.id,true);
 await rm(saved.attachment_path,{force:true});
});
test('parameterized query safely handles SQL-like input',async()=>{
 await repo.search("'; DROP TABLE documents; --");
 assert.equal((await repo.list()).length,7);
});
test('cross-origin mutation is rejected',async()=>{
 const res=await api(`/api/receipts/${samples[0].id}/archive`,{method:'PATCH',headers:{origin:'https://unrelated.example'},body:JSON.stringify({archived:true})});assert.equal(res.status,403);
});
test('persistence survives closing and reopening PostgreSQL',async()=>{
 await db.close();({db}=await openDatabase({directory:temp,url:null}));repo=new ReceiptRepository(db);state.repo=repo;
 assert.equal((await repo.detail(added.id)).title,'QA kettle');
 assert.equal((await repo.search('QA-KETTLE-9000')).results[0].id,added.id);
});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();await rm(temp,{recursive:true,force:true});});
