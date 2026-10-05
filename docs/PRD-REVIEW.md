# PRD self-review

Reviewed before implementation on 5 October 2026. This is a requirements review, not proof that the application already works.

| Check | Finding and resolution |
|---|---|
| Challenge fit | A new project for the builder’s mother, open embeddings at the core, code and demo required. Personal story and feedback remain unverified. |
| Sponsor substance | Tiger Data holds text and vectors and executes hybrid retrieval. A logo or unused connection is insufficient. Cloud access is pending; distinguish local pgvector from actual Tiger Cloud. |
| Three-hour feasibility | Removed automatic OCR, general chat, reminders, voice, multi-user accounts and public private-data hosting. Manual text entry plus an original attachment is the required path. |
| AI availability | No hosted closed-model API key required. A multilingual open model must be downloaded and benchmarked. Model failure is visible; keyword-only degradation, if added, must be labelled. |
| Truthfulness | Never calculate a warranty end date from assumptions; show user-verified fields and original source. Sample data and absent originals are labelled. |
| Privacy | Bind prototype to localhost. Do not upload real family records for public testing. Synthetic demo data only unless the user specifically chooses otherwise. |
| Search quality | Same corpus for keyword/vector/hybrid, expected IDs fixed before running, report misses and no-match failures. Small synthetic benchmark cannot establish general performance. |
| Persistence | Database and source attachments survive restart. Archive/undo avoids accidental permanent loss. |
| Acceptance tests | AC1–AC11 are measurable and map to API, benchmark and browser evidence. No test passes are claimed yet. |
| External blockers | Tiger Cloud login/connection may require user participation; continue all independent implementation meanwhile. |

Disposition: proceed with this reduced MVP. Required release evidence: actual model inference, persistent receipts, working SQL search, browser-tested flow, documented backend and honest benchmark. Actual Tiger Cloud verification remains a separate gate before any cloud integration claim.

## Implementation checkpoint

Working local MVP built. Twelve functional tests pass; desktop/mobile browser flow checked; an 18-query benchmark and its two failed positive cases are documented. Actual Tiger Cloud connection and mother testing remain pending. See VERIFICATION.md for observed results, not inferred completion.
