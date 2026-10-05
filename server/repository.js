import { randomUUID } from 'node:crypto';
import { embed, chunkText } from './embeddings.js';
import { samples } from './samples.js';
import { MODEL_ID } from './config.js';

const SELECT = `id, title, category, merchant, receipt_text AS "receiptText",
  purchase_date::text AS "purchaseDate", warranty_end_date::text AS "warrantyEndDate",
  checked, is_sample AS "isSample", attachment_type AS "attachmentType",
  attachment_name AS "attachmentName", archived, created_at AS "createdAt"`;

// E5 similarities cluster high even for unrelated text. This cutoff is a heuristic,
// recorded in benchmark output, never shown as a probability or an accuracy claim.
export const SEMANTIC_MIN = Number(process.env.SEMANTIC_MIN || 0.78);
export const SEMANTIC_GAP = 0.02;
export const SEMANTIC_STRONG = 0.84;

export class ReceiptRepository {
  constructor(db) { this.db = db; }
  async list(category = 'All') {
    return (await this.db.query(`SELECT ${SELECT} FROM documents
      WHERE archived = FALSE AND ($1 = 'All' OR category = $1)
      ORDER BY is_sample ASC, sort_order ASC, created_at DESC`, [category])).rows;
  }
  async detail(id) {
    return (await this.db.query(`SELECT ${SELECT} FROM documents WHERE id = $1`, [id])).rows[0];
  }
  async attachment(id) {
    return (await this.db.query('SELECT attachment_path, attachment_type, attachment_name FROM documents WHERE id = $1', [id])).rows[0];
  }
  async save(input, { id = randomUUID(), isSample = false, sortOrder = 1000, attachment = null } = {}) {
    const parts = chunkText(input.receiptText);
    const chunks = [];
    for (const part of parts) {
      const content = `${input.title}\n${input.merchant || ''}\n${part}`;
      chunks.push({ content, embedding: await embed(content, 'passage') });
    }
    await this.db.transaction(async tx => {
      await tx.query(`INSERT INTO documents
        (id,title,category,merchant,receipt_text,purchase_date,warranty_end_date,checked,is_sample,sort_order,attachment_path,attachment_type,attachment_name)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id,input.title,input.category || 'Other',input.merchant || '',input.receiptText,input.purchaseDate || null,input.warrantyEndDate || null,!!input.checked,isSample,sortOrder,attachment?.path || null,attachment?.type || null,attachment?.name || null]);
      for (const chunk of chunks) {
        await tx.query(`INSERT INTO chunks (id,document_id,content,embedding,search_vector)
          VALUES ($1,$2,$3,$4::vector,to_tsvector('simple',$3))`,
        [randomUUID(),id,chunk.content,JSON.stringify(chunk.embedding)]);
      }
    });
    return this.detail(id);
  }
  async archive(id, archived) {
    const rows = (await this.db.query(`UPDATE documents SET archived = $2 WHERE id = $1 RETURNING id`, [id,archived])).rows;
    return rows.length > 0;
  }
  async seed() {
    const existingModel = (await this.db.query("SELECT value FROM app_meta WHERE key = 'embedding_model'")).rows[0]?.value;
    if (existingModel && existingModel !== `${MODEL_ID}:q8`) throw new Error('Embedding model changed: explicit reindex required');
    await this.db.query("INSERT INTO app_meta (key,value) VALUES ('embedding_model',$1) ON CONFLICT (key) DO NOTHING", [`${MODEL_ID}:q8`]);
    for (let index = 0; index < samples.length; index++) {
      if (!await this.detail(samples[index].id)) await this.save(samples[index], { id: samples[index].id,isSample:true,sortOrder:index });
    }
  }
  async search(query, { category = 'All', mode = 'hybrid', limit = 12 } = {}) {
    const text = query.trim();
    if (!text) return { results: await this.list(category), elapsedMs: 0, mode, query: '' };
    const started = performance.now();
    const queryVector = mode === 'keyword' ? [1,...Array(383).fill(0)] : await embed(text, 'query');
    const isIdentifier = /^[A-Za-z][A-Za-z0-9_-]*[-_][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*$/.test(text);
    // For ordinary-language inputs use OR semantics for lexical candidates.
    // SQL text remains fixed; user query travels only as a bound value.
    const lexical = text.match(/[\p{L}\p{N}]+/gu)?.join(' OR ') || '';
    const result = await this.db.query(`
      WITH active AS (
        SELECT c.*, d.title, d.merchant, d.receipt_text
        FROM chunks c JOIN documents d ON d.id=c.document_id
        WHERE d.archived=FALSE AND ($3='All' OR d.category=$3)
      ), scored AS (
        SELECT document_id,
          MAX(1-(embedding <=> $2::vector)) AS similarity,
          MAX(ts_rank_cd(search_vector,websearch_to_tsquery('simple',$1))) AS lexical_score,
          MAX(CASE WHEN position(lower($4) in lower(title || ' ' || merchant || ' ' || receipt_text))>0 THEN 1 ELSE 0 END) AS exact_match
        FROM active GROUP BY document_id
      ), keyword AS (
        SELECT document_id, ROW_NUMBER() OVER (ORDER BY exact_match DESC,lexical_score DESC,document_id) AS rank
        FROM scored WHERE lexical_score>0 OR exact_match=1
      ), stats AS (
        SELECT MAX(similarity) AS best, COUNT(*) AS total,
          COALESCE((SELECT similarity FROM scored ORDER BY similarity DESC LIMIT 1 OFFSET 1),0) AS second
        FROM scored
      ), semantic AS (
        SELECT document_id, ROW_NUMBER() OVER (ORDER BY similarity DESC,document_id) AS rank
        FROM scored CROSS JOIN stats
        WHERE similarity >= $5 AND similarity >= stats.best-0.035
          AND (stats.best >= 0.84 OR (stats.total>1 AND stats.best-stats.second >= 0.02))
      ), ranked AS (
        SELECT s.*, k.rank AS keyword_rank, v.rank AS vector_rank,
          CASE WHEN $6='keyword' THEN COALESCE(1.0/(60+k.rank),0)
            WHEN $6='vector' THEN COALESCE(1.0/(60+v.rank),0)
            ELSE COALESCE(1.0/(60+k.rank),0)+COALESCE(1.0/(60+v.rank),0) END AS score
        FROM scored s LEFT JOIN keyword k USING(document_id) LEFT JOIN semantic v USING(document_id)
      )
      SELECT d.id,d.title,d.category,d.merchant,d.receipt_text AS "receiptText",
        d.purchase_date::text AS "purchaseDate",d.warranty_end_date::text AS "warrantyEndDate",
        d.checked,d.is_sample AS "isSample",d.attachment_type AS "attachmentType",d.attachment_name AS "attachmentName",
        r.similarity,r.lexical_score AS "lexicalScore",r.keyword_rank AS "keywordRank",r.vector_rank AS "vectorRank",r.score,r.exact_match AS "exactMatch"
      FROM ranked r JOIN documents d ON d.id=r.document_id
      WHERE r.score>0 AND ($8=FALSE OR r.exact_match=1)
      ORDER BY CASE WHEN $6='vector' THEN 0 ELSE r.exact_match END DESC,r.score DESC,r.similarity DESC,d.id LIMIT $7
    `, [lexical, JSON.stringify(queryVector), category, text, SEMANTIC_MIN, mode, limit, isIdentifier]);
    return { results: result.rows, elapsedMs: Math.round(performance.now()-started), mode, query:text };
  }
}
