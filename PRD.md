# Maa ka Drawer — Product requirements

Status: implementation approved by the user; reviewed 5 October 2026. Primary category: Best Use of Tiger Data. Challenge deadline: 5 October 2026, 12:29 PM IST.

## Product and user

Build a simple household receipt finder for the builder’s mother. A person should be able to ask for an appliance bill in everyday language and find the original record without remembering its filename or exact English wording. The mother is the intended recipient; her particular habits, pain points and feedback have not yet been observed. Family validation remains pending.

The first version is a single-household prototype running on the builder’s laptop. A public submission can use synthetic receipts and a recorded demo. Public deployment with personal household records requires authentication and is outside this initial release.

## Core promise

Find the saved document, show the evidence, and never manufacture a purchase amount or warranty date. Open AI helps retrieve meaning. The database combines that with exact words. This is document retrieval, not an unconstrained answer generator.

## Required flow

1. Open a calm, readable drawer of saved receipts. Clearly identify synthetic sample records.
2. Enter an English, Hindi or Hinglish search. Hinglish quality must be measured rather than assumed.
3. See ranked matches with title, merchant/category, purchase date when provided, and a short saved-text excerpt.
4. Select a match to see all saved text, source attachment if available, user-entered facts, and the difference between a source document and a manually entered note.
5. Add a document: required title and receipt text; optional category, merchant, purchase date, explicit warranty-expiry date, and original JPG/PNG/PDF. Confirm that typed facts have been checked against the source. Review/save must succeed before it appears in the drawer.
6. Archive an unneeded record with an undo action. Search and list exclude archived records.
7. Empty, loading, invalid input, database unavailable, model loading/failed, and no-match states are visible and recoverable. Never quietly substitute fake AI results.

## MVP acceptance criteria

- AC1: Saving a receipt and refreshing retains it; list and detail agree.
- AC2: At least one semantically phrased English or Hindi query finds a relevant receipt even when literal keyword search does not; measured on disclosed synthetic data using an actual open model.
- AC3: Exact invoice identifiers remain findable. Compare keyword, vector and hybrid search on the same corpus.
- AC4: Hybrid ranking is executed as SQL over real PostgreSQL/pgvector, using reciprocal rank fusion. On Tiger Cloud, store source text, metadata and embedding chunks there. Record backend identity accurately.
- AC5: The project works locally while cloud access is pending, using an explicitly labelled embedded PostgreSQL/pgvector development database. This local mode is not reported as a Tiger Cloud connection. Actual Tiger Data integration must be verified before claiming it in the submission.
- AC6: Blank or unrelated searches produce a clear state. Similarity thresholds are empirical heuristics, not confidence probabilities. Never infer warranty status from a purchase date.
- AC7: Original image/PDF uploads remain accessible after restart; unsupported types and oversized files are rejected. No SVG or HTML uploads. Uploaded receipt text is data, never executable instructions.
- AC8: Archive and undo work without losing source data. Parameterized SQL prevents query text being interpreted as SQL.
- AC9: Main flow works with keyboard and at 390px width; labelled inputs, visible focus, readable contrast and large touch targets.
- AC10: Automated tests exercise persistence, search/no-match, exact identifiers, archive/undo, and input validation. Browser testing covers the primary workflow and responsive layout.
- AC11: Benchmark report lists model, corpus, exact queries, expected documents, scoring method, measured rankings/latencies and failures. No invented performance numbers or user quotes.

## Architecture

React + Vite client; Node/Express service. A local open multilingual embedding model runs through Transformers.js and ONNX Runtime. Model candidate: multilingual-e5-small (384 dimensions); verify model availability and license. Cache weights in the project’s ignored data directory. Prefix model inputs as required by its model card. Chunk document text to fit the model context; query and document embeddings use identical model/version and normalization.

Database adapter targets a Tiger Cloud PostgreSQL connection supplied through DATABASE_URL. Use pgvector cosine distance, PostgreSQL full-text search with a language-neutral configuration, and reciprocal rank fusion. Keyword and vector search share metadata filters and active-document constraints. Small demo corpus permits exact vector search; do not claim scale benchmarks. Enable Tiger-specific search extensions if available and tested; do not call plain full-text ranking BM25.

Local development fallback: persistent PGlite with its pgvector extension; same schema and core SQL where supported. Backend status is exposed in a technical health endpoint and documentation. No silent cloud-to-local fallback if a configured cloud database fails.

Data model: documents (UUID, title, category, merchant, source text, optional provided dates, sample flag, attachment metadata, created timestamp, archived flag); chunks (document ID, chunk text, 384-dimensional vector, text-search vector). File attachments live in the ignored local data directory in this release. Store no credentials in source control or API responses.

## Scope boundaries

Original scope: reviewed manual entry with optional originals. The accepted additions below extend this to voice and OCR. No financial transactions, medical advice, warranty interpretation, reminders, accounts, arbitrary web retrieval, public multi-user hosting or family sharing.

## Experience

An approachable document drawer, not an admin dashboard. Warm ivory, deep olive, ink text, generous spacing, serif heading and clear sans-serif controls. Desktop has a receipt list and adjacent evidence panel; mobile stacks them. Primary actions: Search and Add receipt. Persistent sample-data notice for seeded records. No sponsor jargon in the household task flow. Database and model details belong in docs and technical status.

## Delivery order and time budget

1. PRD review, dependency/model feasibility and schema (20 minutes).
2. Persistence, actual model inference, hybrid SQL and API tests (45 minutes).
3. Responsive interface and add/search/detail/archive flows (45 minutes).
4. Browser checks, disclosed benchmark, README and submission evidence (30 minutes).
5. Remaining buffer for Tiger Cloud connection, mother’s test and recording. Publish only when the entry has real code/demo links; deadline remains 12:29 PM IST.

## Submission evidence

Lead with the mother’s intended task and why exact keyword plus semantic search helps it. Include actual Tiger Data usage, open model/license, architecture, keyword-versus-hybrid benchmark and a failure case. State that sample receipts are synthetic and family feedback is pending until genuinely received. A small public-post category scan informed category choice; competition counts do not belong in the product story.

Sources: https://dev.to/challenges/hacktoberfest-weekend-2026-10-01 ; https://dev.to/page/hacktoberfest-weekend-challenge-26-10-01-contest-rules ; https://www.tigerdata.com/docs/learn/tutorials/hybrid-search ; https://huggingface.co/intfloat/multilingual-e5-small

## Approved visual revision — 3D flashcards

The user requested the landing page show multiple appliance-image flashcards with cursor-driven enlargement and 3D depth. This supersedes the original receipt list/detail split: use a responsive card gallery, hover lift/tilt, keyboard focus treatment, touch tap, and a receipt-detail modal. Keep source evidence, search, add, filters, archive and undo. Respect reduced motion. Illustrations are generic item imagery; never imply they are the user's actual purchased product.

## Accepted addition: voice entry (October 5)

User requested spoken receipt capture, such as “bijli bill 400 ka aaya hai.” Add a microphone recorder and audio-file alternative in the existing Add receipt form. Transcribe Hindi/Indian English using an open model on the local app server. Suggest an editable title/category and explicitly stated amount. Keep the original transcript, do not infer invoice number, payment status or dates, and require review before saving. Limit recordings to 30 seconds. Audio is temporarily playable and discarded when the form closes; only reviewed receipt text is persisted.

## Accepted addition: receipt OCR (October 5)

Upload a JPG, PNG or PDF (6 MB maximum) and extract English/Hindi text. Suggest a recognised bill or appliance title/category without overwriting existing typed text. Use embedded PDF text where available and OCR for scanned pages, limited to three pages. Keep the complete original attached. Require review, preserve unknown dates, and keep a manual path if extraction fails. Recognise a synthetic electricity bill and a kettle PDF in the browser; verify the saved original remains available.
