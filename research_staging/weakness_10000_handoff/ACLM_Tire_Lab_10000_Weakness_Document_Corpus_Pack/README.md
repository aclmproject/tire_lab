# ACLM Tire Lab — 10,000-Document Weakness-Closure Pack

This package is a targeted acquisition and ingestion plan for **10,000 unique real documents**, weighted toward the evidence gaps exposed by BRM/Escort telemetry and the current Tire Lab architecture.

It is intentionally different from the earlier 50,000 structured-work-unit corpus. Here the unit of completion is a **real source document**. The manifest does not claim those 10,000 documents have already been obtained or read.

## Package statistics
- Acquisition targets: 10,000
- P0 immediate targets: 1,000
- Shards: 20 × 500
- Fresh web-verified seed pages after URL deduplication against the previous 500 corpus: 50

## Files
- `DESKTOP_INGESTION_PROMPT.txt` — master instructions
- `DOCUMENT_ACQUISITION_MANIFEST.jsonl` — 10,000 targets
- `DOCUMENT_ACQUISITION_MANIFEST.csv` — inspection copy
- `P0_FIRST_1000.jsonl` — immediate milestone
- `VERIFIED_FRESH_SEED_SOURCES.csv` — fresh starting sources
- `WEAKNESS_MATRIX.csv` — target weighting
- `DEDUP_AND_EVIDENCE_RULES.md` — quality gates
- `SHARD_INDEX.csv` + `shards/` — 20 × 500

Recommended workflow: Sol High → read master prompt → P0 1,000 only → evidence-impact report → then process remaining shards. Do not let the research crawler rewrite physics while it is still acquiring sources.
