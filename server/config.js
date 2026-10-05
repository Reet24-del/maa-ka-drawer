import path from 'node:path';
export const DATA_DIR = path.resolve(process.env.DATA_DIR || '.data');
export const MODEL_ID = 'Xenova/multilingual-e5-small';
export const DIMENSIONS = 384;
export const PORT = Number(process.env.PORT || 4318);
