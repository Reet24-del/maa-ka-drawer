---
title: "Maa ka Drawer: finding my mother’s household bills with open multilingual search"
published: false
tags: devchallenge, weekendchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01).*

## What I Built

A receipt can be saved and still be hard to find. You remember the washing machine, the shop, or what broke—not necessarily the filename or invoice number.

I built **Maa ka Drawer** for my mother: a small household receipt finder that combines open multilingual embeddings with PostgreSQL keyword and vector search. The goal is to make “find that bill” a smaller job.

I chose the problem for this prototype. I have not yet tested it with her, so I cannot claim that it has saved her time or quote feedback she has not given.

The app opens onto a drawer of illustrated cards. Hovering lifts and tilts a card; tapping or clicking opens the receipt. Search works over the saved text, and an original PDF or photo can stay attached. If the receipt does not state a warranty expiry, that field stays blank.

![The running Maa ka Drawer app with six fictional household receipts](https://raw.githubusercontent.com/Reet24-del/maa-ka-drawer/main/docs/demo/drawer.jpg)

## Demo

[Watch or download the 93-second demo video](https://github.com/Reet24-del/maa-ka-drawer/releases/download/v0.1.0/maa-ka-drawer-demo.mp4).

The video is a silent, captioned walkthrough assembled from screenshots captured during real interactions with the app. It shows Hindi search, receipt evidence, a no-match query, saving a PDF-backed receipt, archive, undo, and persistence after reload. It is not a continuous screen recording. Every demonstrated receipt is fictional.

[Demo release and setup notes](https://github.com/Reet24-del/maa-ka-drawer/releases/tag/v0.1.0) · [Expanded scene notes](https://github.com/Reet24-del/maa-ka-drawer/blob/main/docs/demo/transcript.md)

## Code

{% github Reet24-del/maa-ka-drawer %}

The repository includes the app, MIT license, PRD, schema, tests, evaluation queries and results. Run it locally with Node.js 22+, `npm ci`, `npm run build`, and `npm start`.

## How I Built It

The useful AI task here is retrieval. A Hindi query such as `कपड़े धोने वाली मशीन` can find an English washing-machine receipt even when the exact query words are absent.

The model is [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), using [Xenova's ONNX conversion](https://huggingface.co/Xenova/multilingual-e5-small) through Transformers.js. Quantized inference runs on the app server. Queries and receipt chunks become normalized, 384-dimensional vectors.

PostgreSQL stores source text, metadata, full-text search vectors and pgvector embeddings. Exact words and invoice identifiers matter, so keyword search remains part of the system. Reciprocal rank fusion combines keyword and semantic rankings. A similarity gate filters weak or ambiguous semantic matches. These scores are not probabilities.

The interface uses React and Vite; Express serves the API and built app. PDF.js renders originals inside the receipt view. Codex helped implement and test the project, and generated appliance illustrations provide visual cues. The illustrations are not photographs of my mother's possessions.

**Tiger Data integration status:** Tiger Data was the selected partner technology and its hybrid-search documentation informed this implementation. The remote PostgreSQL adapter is implemented, but the live Tiger Cloud connection is still awaiting account access. The demonstrated and benchmarked backend is local PGlite with pgvector. I am not claiming verified Tiger Cloud usage yet.

### What worked—and what did not

I ran a fixed evaluation over six fictional receipts and 18 queries:

| Search mode | Correct first result on 14 positive queries | Correct no-match responses on 4 negative queries |
|---|---:|---:|
| Keyword | 8/14 | 4/4 |
| Vector | 11/14 | 4/4 |
| Hybrid | 12/14 | 4/4 |

The [full query set and outcomes](https://github.com/Reet24-del/maa-ka-drawer/blob/main/docs/benchmark.json) are public. This is a small, builder-authored evaluation. A Hindi washing-machine phrase was rejected, and a Hinglish ceiling-fan query returned the purifier. Those failures limit how confidently I can hand this to someone else.

All 12 integration tests pass, covering retrieval, identifiers, validation, source-file serving, archive/undo and database persistence. Desktop and phone layouts were checked in the browser.

## Why Does Open Innovation Matter?

The open model gives this project a retrieval component I can run, inspect, replace and test without a hosted generative API. After the weights are downloaded, local mode keeps receipt data and inference on the laptop. A Tiger Cloud configuration would store receipt text and embeddings remotely; I would not describe that as fully offline.

The model does one limited job: help locate existing evidence. It does not write an answer about warranty coverage. A user can open the saved text and original document and see what the receipt actually says.

That distinction shaped the rest of the app. Receipt text is entered or pasted manually; there is **no automatic OCR**. Dates are confirmed by the user. Archiving is reversible. The prototype is for one household and has no public account system.

My next step is a real trial with my mother: ask her to find a bill, observe the words she uses, and improve retrieval against those examples. That feedback will matter more than adding another animation.
