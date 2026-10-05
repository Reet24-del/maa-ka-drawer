# Maa ka Drawer

Find household bills in everyday language and keep the original document beside the result. Built for the author's mother for DEV's Hacktoberfest Weekend Challenge, with Tiger Data selected as the primary partner category.

**Current status:** working local prototype. Actual open multilingual embeddings and PostgreSQL/pgvector queries are tested. The Tiger Cloud adapter is implemented, but a live Tiger Cloud connection is **not yet verified**. The local development database is PGlite; it must not be described as a Tiger Cloud service.

## Demo and code

[93-second captioned demo](https://github.com/Reet24-del/maa-ka-drawer/releases/download/v0.1.0/maa-ka-drawer-demo.mp4) · [Release notes](https://github.com/Reet24-del/maa-ka-drawer/releases/tag/v0.1.0) · [Demo scene notes](docs/demo/transcript.md)

The silent video is assembled from real browser captures, not a continuous screen recording. It uses only synthetic receipts.

![Maa ka Drawer receipt gallery](docs/demo/drawer.jpg)

## Run

Requires Node.js 22 or newer with `--env-file-if-exists` support.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API runs at http://127.0.0.1:4318. First inference downloads the open model from Hugging Face into `.data/models`; subsequent use reuses that cache. The app does not call a hosted generative AI service. A model download may require several hundred MB and a network connection. `.data/` holds persistent records, model cache, embedding cache, and original attachments. Keep that directory to retain receipts.

For a built version:

```sh
npm run build
npm start
```

Open http://127.0.0.1:4318. The server binds to 127.0.0.1 by default. This is a single-household local prototype, with no account system. Do not expose it publicly with real family records.

## Use Tiger Cloud

1. Create or select a Tiger Cloud PostgreSQL service.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` locally to the service's PostgreSQL connection string. Keep it out of chat, screenshots and version control.
3. Restart the API. It creates dedicated `documents`, `chunks`, and `app_meta` tables and enables `vector` if permitted. Use a dedicated development database/schema; the current table names are unqualified.
4. Inspect `/api/health`: it should report `tiger-cloud`, an actual model state, and the search method. A custom Tiger hostname may appear as `postgresql`; inspect the connection destination privately rather than relabelling another provider.
5. Save a synthetic receipt, search it, restart, retrieve it again, and record that evidence before claiming the Tiger Data integration.

TLS certificate verification is enabled for remote databases. A configured connection failure does not silently fall back to local storage. Cloud text and vectors are stored remotely; originals currently remain in the app's local `.data/uploads` directory. Model inference stays on the app server. Do not claim a cloud configuration is completely offline or that no data leaves the computer.

## What works

- Browse illustrated 3D receipt cards; mouse hover lifts and tilts them, keyboard and touch open the receipt dialog.
- Add reviewed receipt text, optional merchant/category/dates, and a JPG/PNG/PDF original.
- Search in everyday language using an open multilingual embedding model, exact words and hybrid ranking.
- Read the original PDF inside the app, page by page, or view an original image. Download sources.
- Keep missing warranty dates blank. No inferred dates, no free-form generated answer.
- Archive a record and undo the action without deleting it.
- Six explicitly fictional sample receipts for a reproducible demo.

Text is entered manually. This version **does not perform OCR**. Mother-specific feedback is pending; no use or satisfaction claim has been made on her behalf.

## How search works

`Xenova/multilingual-e5-small` provides ONNX weights for the MIT-licensed `intfloat/multilingual-e5-small` model. Transformers.js runs q8 inference on CPU. Use `query:` and `passage:` prefixes, mean pooling and L2 normalization. Each vector has 384 dimensions. Receipt text is divided into overlapping chunks (600 characters with 60-character overlap) with truncation at the model's context limit. Extremely dense scripts may still be truncated; this is a documented prototype limitation.

PostgreSQL stores metadata, source text, chunk vectors and full-text vectors. The retrieval query in `server/repository.js` combines:

1. Language-neutral PostgreSQL full-text matches and exact substring matches.
2. pgvector cosine similarity over active receipt chunks.
3. Reciprocal rank fusion (`k=60`) at document level, with exact phrase priority.
4. A conservative heuristic: minimum semantic similarity 0.78; candidates within 0.035 of the best; either a best score of at least 0.84 or a 0.02 gap between the best two documents. Exact-looking invoice queries require the full identifier.

These scores are **not confidence probabilities**. The gate can miss relevant receipts. Keyword search uses OR semantics, so generic words can also return poor matches. The benchmark records both kinds of failure. No claim of BM25: this version uses PostgreSQL's built-in full-text ranking, not `pg_textsearch`. No scale-performance claim: vector distance is an exact scan over a tiny corpus.

## Evidence and tests

```sh
npm test
npm run benchmark
```

The tests use an isolated temporary local database and actual embeddings, not mocked AI responses. Benchmark output is in `docs/BENCHMARK.md` and `docs/benchmark.json`. On the first disclosed 18-query run, hybrid found the correct first result on 12/14 positive queries versus 8/14 for keywords, and returned no result on 4/4 negative queries. Two Hindi/Hinglish cases failed. This builder-authored six-document test is not general proof of accuracy.

See:

- `PRD.md` — requirements and acceptance criteria.
- `docs/PRD-REVIEW.md` — pre-build self-review.
- `docs/VERIFICATION.md` — implemented checks, visual review and remaining limitations.
- `docs/SUBMISSION-DRAFT.md` — factual draft with verified public repository/demo links; live Tiger verification remains pending.

## Attribution

- [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), MIT, and [ONNX conversion](https://huggingface.co/Xenova/multilingual-e5-small).
- [Transformers.js](https://github.com/huggingface/transformers), Apache-2.0.
- [pgvector](https://github.com/pgvector/pgvector), PostgreSQL License; [PGlite](https://github.com/electric-sql/pglite), Apache-2.0.
- [Tiger Data hybrid search documentation](https://www.tigerdata.com/docs/learn/tutorials/hybrid-search) informed the hybrid retrieval approach.
- React, Vite, Express, Lucide icons, PDF.js, node-postgres and Zod; see their package licenses.

Built with AI assistance. Sample receipt text is synthetic. The generated design concept is an implementation reference; the application UI and receipt text are native code.
