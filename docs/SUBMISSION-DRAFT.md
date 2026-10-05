---
title: "Maa ka Drawer: finding my mother’s household receipts with open AI and hybrid search"
published: false
tags: devchallenge, weekendchallenge, hf26challenge
---

**Draft — not ready to publish. Add the real demo and repository links, verify a live Tiger Data connection, and update only the claims that verification supports.**

*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01).*

## What I Built

I built Maa ka Drawer for my mother around one small task: finding the right household bill when it is needed. I chose this problem for the prototype; I have not yet tested it with her, so this is not a story about feedback she has already given me.

The app saves reviewed receipt text and an optional original photo or PDF. Ask for a receipt in everyday language, select a result, and read the evidence beside it. If a warranty date is missing, it stays missing. There is no chatbot making up an answer.

The six receipts in the demo are fictional. This version requires pasted or typed receipt text; it does not automatically read a photograph.

## Demo

Add a real deployed link or recorded demonstration before publishing. Suggested sequence: show the sample notice, search `कपड़े धोने वाली मशीन`, open the washing-machine evidence, try an unrelated passport query, and save a synthetic receipt with an original PDF. Demonstrate archive and undo.

## Code

Add the public repository URL before publishing. Source is currently saved locally in this project.

## How I Built It

The AI component is multilingual-e5-small, an open multilingual embedding model. I run its quantized ONNX weights locally through Transformers.js. Query and passage prefixes, mean pooling, normalization and 384-dimensional vectors follow the model's retrieval interface.

PostgreSQL holds both source text and vectors. Keyword search handles exact words and invoice identifiers. pgvector handles semantic similarity. Reciprocal rank fusion combines the candidate rankings, while a conservative similarity gate rejects some weak matches. The original document stays visible because retrieval should help someone find their evidence, not replace it.

**Tiger integration status:** the PostgreSQL adapter is ready for Tiger Cloud, but the currently measured implementation uses local PGlite/pgvector. Replace this paragraph with the exact verified Tiger Data setup only after connecting and testing it. Do not describe PGlite as Tiger Cloud.

### What the first test showed

On six synthetic receipts and 18 prewritten evaluation queries:

| Mode | Correct first result, positive queries | Correct no-match responses |
|---|---:|---:|
| Keyword | 8/14 | 4/4 |
| Vector | 11/14 | 4/4 |
| Hybrid | 12/14 | 4/4 |

The whole query set and outcomes are in `docs/benchmark.json`. This is a small builder-authored test, not proof of general accuracy. One Hindi phrase for a washing-machine bill was rejected; a Hinglish ceiling-fan query incorrectly returned a purifier receipt. Those failures matter, especially for the person I intend this to help.

During development, an unrelated passport query also exposed why a raw similarity threshold was not enough. Adding a gap check improved refusal on the development examples. The separate evaluation set above was then run with that gate fixed.

## Why Does Open Innovation Matter?

An open embedding model makes the retrieval stage inspectable and replaceable. Once downloaded, the model can run on the app server without sending each question to a closed model API. In local mode, the records and inference stay on the laptop. With Tiger Cloud configured, receipt text and vectors would be stored in that database, so I would not call that setup fully offline.

The system does not generate dates or warranty terms. It retrieves saved text and shows the original file. That keeps the useful AI task small enough to test directly.

## My Agent Session

Optional. Add a reviewed session link only if one is actually published. Do not expose credentials or family records.

## Prize Categories

Intended primary category: **Best Use of Tiger Data**. This is a pending claim until the actual chosen Tiger Data setup is verified and described above.

## What remains

A real test with my mother, broader Hindi/Hinglish coverage, and a better distinction between generic receipt words and item-specific intent. No family feedback is claimed yet.
