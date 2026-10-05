# Retrieval benchmark

Run: 2026-10-05T04:33:19.618Z

Model: Xenova/multilingual-e5-small, q8, 384 dimensions. Backend: local-pglite.

Top-1 correctness on 14 positive queries; empty results required on four no-match queries. Same corpus and embeddings for all modes. RRF k=60, exact identifier restriction. Local process; caches can affect timing.

Semantic cutoff/gap tuned only on the four development queries in development-probe.js before this run. Benchmark is a small builder-authored test, not a general quality claim.

| Mode | Positive top-1 | No-match refusals | Overall correct |
|---|---:|---:|---:|
| keyword | 8/14 | 4/4 | 12/18 |
| vector | 11/14 | 4/4 | 15/18 |
| hybrid | 12/14 | 4/4 | 16/18 |

| Query | Expected | Keyword | Vector | Hybrid |
|---|---|---|---|---|
| washing machine bill | Washing machine | ✓ Washing machine | ✓ Washing machine | ✓ Washing machine |
| water purifier filter replacement | Water purifier service | ✓ Water purifier service | ✓ Water purifier service | ✓ Water purifier service |
| three jar grinder | Mixer grinder | ✓ Mixer grinder | ✓ Mixer grinder | ✓ Mixer grinder |
| fridge purchase | Refrigerator | ✗ Washing machine | ✓ Refrigerator | ✓ Refrigerator |
| fan invoice | Ceiling fan | ✓ Ceiling fan | ✓ Ceiling fan | ✓ Ceiling fan |
| microwave oven receipt | Microwave | ✓ Microwave | ✓ Microwave | ✓ Microwave |
| कपड़े साफ करने की मशीन का बिल | Washing machine | ✗ No match | ✗ No match | ✗ No match |
| पानी के फिल्टर की सर्विस | Water purifier service | ✗ No match | ✓ Water purifier service | ✓ Water purifier service |
| मिक्सर ग्राइंडर की रसीद | Mixer grinder | ✗ No match | ✓ Mixer grinder | ✓ Mixer grinder |
| fridge ka bill | Refrigerator | ✗ No match | ✓ Refrigerator | ✓ Refrigerator |
| pankha kharidne ki receipt | Ceiling fan | ✗ Water purifier service | ✗ No match | ✗ Water purifier service |
| khana garam karne wala oven | Microwave | ✓ Microwave | ✗ No match | ✓ Microwave |
| KW-MX-803 | Mixer grinder | ✓ Mixer grinder | ✓ Mixer grinder | ✓ Mixer grinder |
| BH-FAN-628 | Ceiling fan | ✓ Ceiling fan | ✓ Ceiling fan | ✓ Ceiling fan |
| airline boarding pass | No match | ✓ No match | ✓ No match | ✓ No match |
| income tax filing acknowledgement | No match | ✓ No match | ✓ No match | ✓ No match |
| pet vaccination certificate | No match | ✓ No match | ✓ No match | ✓ No match |
| ZZ-UNKNOWN-404 | No match | ✓ No match | ✓ No match | ✓ No match |

## Limits

Synthetic six-document corpus; queries authored by the builder; only a few Hindi/Hinglish examples. This does not establish multilingual reliability on real receipts. Semantic scores are not probabilities. Similarity gates can reject valid ambiguous matches. No inference of missing warranty dates, no OCR, no latency SLA. Timings in benchmark.json include a mix of cold and cached query embeddings and must not be compared as a fair speed benchmark. Tiger Cloud performance has not been measured by this local run.
