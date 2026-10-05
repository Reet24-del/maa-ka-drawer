import { mkdtemp,rm,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { openDatabase } from '../server/db.js';
import { ReceiptRepository,SEMANTIC_MIN,SEMANTIC_GAP,SEMANTIC_STRONG } from '../server/repository.js';
import { MODEL_ID } from '../server/config.js';
import { samples } from '../server/samples.js';
// Queries and expected IDs fixed before this benchmark's first run.
// Development queries live in development-probe.js and are not reported as held-out.
const cases=[
 ['washing machine bill',0,'English'],
 ['water purifier filter replacement',1,'English'],
 ['three jar grinder',2,'English'],
 ['fridge purchase',3,'English'],
 ['fan invoice',4,'English'],
 ['microwave oven receipt',5,'English'],
 ['कपड़े साफ करने की मशीन का बिल',0,'Hindi'],
 ['पानी के फिल्टर की सर्विस',1,'Hindi'],
 ['मिक्सर ग्राइंडर की रसीद',2,'Hindi'],
 ['fridge ka bill',3,'Hinglish'],
 ['pankha kharidne ki receipt',4,'Hinglish'],
 ['khana garam karne wala oven',5,'Hinglish'],
 ['KW-MX-803',2,'Identifier'],
 ['BH-FAN-628',4,'Identifier'],
 ['airline boarding pass',null,'No match'],
 ['income tax filing acknowledgement',null,'No match'],
 ['pet vaccination certificate',null,'No match'],
 ['ZZ-UNKNOWN-404',null,'No match'],
];
const directory=await mkdtemp(path.join(os.tmpdir(),'maa-benchmark-'));
const {db,kind}=await openDatabase({directory,url:null});
const repo=new ReceiptRepository(db);await repo.seed();
const outcomes=[];
for(const [query,index,language] of cases){
 const expectedId=index===null?null:samples[index].id;
 for(const mode of ['keyword','vector','hybrid']){
  const result=await repo.search(query,{mode});
  outcomes.push({query,language,mode,expectedId,expectedTitle:index===null?'No match':samples[index].title,actualId:result.results[0]?.id||null,actualTitle:result.results[0]?.title||'No match',correct:expectedId===(result.results[0]?.id||null),rank:expectedId?result.results.findIndex(x=>x.id===expectedId)+1:null,resultCount:result.results.length,elapsedMs:result.elapsedMs,results:result.results.map(x=>({id:x.id,title:x.title,similarity:x.similarity,keywordRank:x.keywordRank,vectorRank:x.vectorRank}))});
 }
}
const report={runAt:new Date().toISOString(),backend:kind,model:MODEL_ID,dtype:'q8',dimensions:384,corpus:'Six disclosed synthetic household receipts in server/samples.js',method:'Top-1 correctness on 14 positive queries; empty results required on four no-match queries. Same corpus and embeddings for all modes. RRF k=60, exact identifier restriction. Local process; caches can affect timing.',tuning:'Semantic cutoff/gap tuned only on the four development queries in development-probe.js before this run. Benchmark is a small builder-authored test, not a general quality claim.',thresholds:{minimum:SEMANTIC_MIN,gap:SEMANTIC_GAP,strong:SEMANTIC_STRONG,relativeWindow:0.035},outcomes};
await mkdir('docs',{recursive:true});await writeFile('docs/benchmark.json',JSON.stringify(report,null,2));
let md=`# Retrieval benchmark\n\nRun: ${report.runAt}\n\nModel: ${MODEL_ID}, q8, 384 dimensions. Backend: ${kind}.\n\n${report.method}\n\n${report.tuning}\n\n| Mode | Positive top-1 | No-match refusals | Overall correct |\n|---|---:|---:|---:|\n`;
for(const mode of ['keyword','vector','hybrid']){const rows=outcomes.filter(x=>x.mode===mode);md+=`| ${mode} | ${rows.filter(x=>x.expectedId&&x.correct).length}/14 | ${rows.filter(x=>!x.expectedId&&x.correct).length}/4 | ${rows.filter(x=>x.correct).length}/18 |\n`;}
md+='\n| Query | Expected | Keyword | Vector | Hybrid |\n|---|---|---|---|---|\n';
for(const [query,index] of cases){const rows=outcomes.filter(x=>x.query===query);md+=`| ${query} | ${index===null?'No match':samples[index].title} | ${rows.map(x=>`${x.correct?'✓':'✗'} ${x.actualTitle}`).join(' | ')} |\n`;}
md+='\n## Limits\n\nSynthetic six-document corpus; queries authored by the builder; only a few Hindi/Hinglish examples. This does not establish multilingual reliability on real receipts. Semantic scores are not probabilities. Similarity gates can reject valid ambiguous matches. No inference of missing warranty dates, no OCR, no latency SLA. Timings in benchmark.json include a mix of cold and cached query embeddings and must not be compared as a fair speed benchmark. Tiger Cloud performance has not been measured by this local run.\n';
await writeFile('docs/BENCHMARK.md',md);console.log(md);await db.close();await rm(directory,{recursive:true,force:true});
