import { openDatabase } from '../server/db.js';
import { ReceiptRepository } from '../server/repository.js';
const {db}=await openDatabase({directory:'.data/development-probe',url:null});const repo=new ReceiptRepository(db);await repo.seed();
for(const q of ['कपड़े धोने वाली मशीन','मसाला पीसने वाला मिक्सर','passport renewal appointment','school admission fee']){
 const r=await repo.search(q,{mode:'vector'});console.log(JSON.stringify({q,results:r.results.map(x=>[x.title,Number(x.similarity.toFixed(4))])}));
}
await db.close();
