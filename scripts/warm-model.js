import { embed, modelState } from '../server/embeddings.js';
const started = performance.now();
const vector = await embed('washing machine warranty');
console.log(JSON.stringify({ ...modelState, dimensions: vector.length, elapsed_ms: Math.round(performance.now()-started) }));
