import { pipeline, env } from '@huggingface/transformers';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DATA_DIR, MODEL_ID } from './config.js';

env.cacheDir = path.join(DATA_DIR, 'models');
env.allowLocalModels = false;
let extractorPromise;
let queue = Promise.resolve();
export const modelState = { status: 'idle', model: MODEL_ID, dtype: 'q8', dimensions: 384 };

export async function loadModel() {
  if (!extractorPromise) {
    modelState.status = 'loading';
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8', device: 'cpu',
      session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
    }).then(model => { modelState.status = 'ready'; return model; }).catch(error => {
      modelState.status = 'error'; extractorPromise = undefined; throw error;
    });
  }
  return extractorPromise;
}

export async function embed(text, kind = 'query') {
  const input = `${kind}: ${text}`;
  const key = createHash('sha256').update(`${MODEL_ID}:q8:${input}`).digest('hex');
  const cacheDir = path.join(DATA_DIR, 'embeddings');
  const target = path.join(cacheDir, `${key}.json`);
  try {
    const cached = JSON.parse(await readFile(target, 'utf8'));
    if (cached.length === 384 && cached.every(Number.isFinite)) return cached;
  } catch { /* A cache miss is safe; run the actual model. */ }
  const run = async () => {
    const extractor = await loadModel();
    const output = await extractor(input, { pooling: 'mean', normalize: true, truncation: true });
    const vector = Array.from(output.data);
    if (vector.length !== 384 || !vector.every(Number.isFinite)) throw new Error('Invalid model output');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(target, JSON.stringify(vector));
    return vector;
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

export function chunkText(text, size = 600, overlap = 60) {
  const normalized = text.trim();
  const chunks = [];
  for (let start = 0; start < normalized.length; start += size - overlap) {
    chunks.push(normalized.slice(start, start + size));
    if (start + size >= normalized.length) break;
  }
  return chunks;
}

export async function disposeModel() {
  await queue;
  if (extractorPromise) { const model=await extractorPromise.catch(()=>null); await model?.dispose(); }
  extractorPromise=undefined; modelState.status='idle';
}
