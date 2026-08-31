# Interrupted-run recovery completion matrix

Overall status: **MILESTONE 3 ABSTRACT-HARVEST CHECKPOINT COMPLETE; OVERALL RESEARCH PARTIAL — CONTINUATION REQUIRED.**

The interrupted run resumed at the unique-document deduplication gate. The NASA/SAE duplicate representation was removed, replaced from the already retrieved candidate pool, and the final 200-record Layer E checkpoint passed its reference, closure-semantics, protected-file and output-hash gates. No numerical Tire Lab value, knowledge release, application file, build or release was changed by this research checkpoint.

## Original requirement status

| Phase | Status after recovery | Output/file | Evidence |
|---|---|---|---|
| A. Curated high-priority source ingestion | COMPLETE for Milestones 1–2 | `source_reviews.jsonl`; Milestone 1/2 checkpoints | Existing reviewed records preserved; no reprocessing. |
| B. Original 50-source research packet | PARTIAL | Milestone 2 source task ledger | 20 reviewed; 35 deferred. |
| C. 500-record parent corpus | COMPLETE as registration, not review | Milestone 1/2 Layer B records | 500 stable records registered. |
| D. First 5,000 priority records | PARTIAL | Milestone 2 Layer C/D ledgers | 5,000 registered; first 250 Layer D targets dispositioned; broader execution remains. |
| E. Broader abstract/source-discovery layer | COMPLETE for this checkpoint | `layer_e_source_reviews.jsonl` | 200 unique `ABSTRACT_ONLY` reviews. |
| F. Deduplication | COMPLETE for this checkpoint | `quality_gates.json`; `source_identity_index.json` | 200 unique IDs, normalized titles and canonical URLs; 0 duplicates with Milestone 2. One interrupted-run NASA/SAE duplicate was removed before finalization. |
| G. Source provenance | COMPLETE for this checkpoint | `harvest_provenance.json`; `layer_e_source_reviews.jsonl` | Archive, identifier/DOI/report number, canonical URL, retrieval authority and abstract fingerprint persisted. |
| H. Full-text versus abstract-only classification | COMPLETE for processed records | `source_reviews.jsonl` | Review state remains explicit; all 200 new records are `ABSTRACT_ONLY`. |
| I. Measurement extraction | PARTIAL overall; COMPLETE as no-promotion decision for Layer E | `evidence_candidates.jsonl`; `numeric_dataset_candidates.json` | 12 prior measurements preserved; 0 new measurements. Twenty-one abstract numeric signals remain discovery flags only. |
| J. Observation extraction | COMPLETE for processed Layer E records | `layer_e_evidence_candidates.jsonl` | 48 new observations; 72 unified observations. |
| K. Scaling-rule extraction | COMPLETE for processed Layer E records | `layer_e_evidence_candidates.jsonl` | 71 new scaling rules; 79 unified scaling rules. |
| L. Historical constraints | COMPLETE as preservation; no new Layer E promotion | `evidence_candidates.jsonl` | 13 prior constraints preserved; 0 new abstract-derived constraints. |
| M. Affected family/class mappings | PARTIAL | `layer_e_to_existing_targets.jsonl`; report §5 | General mechanics mapped; historical supplier/car/class transfer remains open. |
| N. Confidence-gap updates | PARTIAL | `layer_d_status_updates.jsonl` | 12 general-mechanics targets partially supported; supplier/class gaps remain open. |
| O. Evidence-to-generator mapping | NOT STARTED | `checkpoint_summary.json` | No numerical or canonical prior promoted. |
| P. Knowledge-master persistence | NOT STARTED by this checkpoint | `scope_guard.json` | Knowledge release unchanged. |
| Q. Knowledge version/hash | NOT STARTED by this checkpoint | `scope_guard.json` | No version or release hash changed. |
| R. Research impact report | COMPLETE | `MILESTONE_3_RESEARCH_IMPACT_REVIEW.md` | Counts, gap impact, model decisions and next targets recorded. |
| S. Quality-gate checks | COMPLETE | `quality_gates.json`; `output_hashes.json` | All gates pass; evidence references resolve; no abstract became a measurement; protected files match. |
| T. Engineering/code changes | EVIDENCE/REQUIREMENTS COMPLETE; IMPLEMENTATION NOT STARTED | `engineering_evidence_register.jsonl`; `outstanding_engineering_requirements.jsonl` | Escort and GT40 pressure/thermal findings, GT40 construction regression and logger-distance requirement persisted. No code/build/release action taken. |

## Requested completion totals

- Total unique source identities: **517**.
- Unique reviewed identities across Milestones 1–3: **249**.
- Full-text reviewed: **8**.
- Primary scans reviewed: **13**.
- Primary period pages reviewed: **5**.
- Abstract-only: **213**.
- Metadata-only registered identities: **76**.
- Secondary retrospective reviews: **10**.
- Inaccessible: **2**.
- Duplicate representations in final Layer E: **0**; one cross-archive duplicate encountered and deduplicated during recovery.
- Promoted measurements: **12 unified; 0 new in Milestone 3**.
- Promoted observations: **72 unified; 48 new in Milestone 3**.
- Promoted scaling rules: **79 unified; 71 new in Milestone 3**.
- Promoted historical constraints: **13 unified; 0 new in Milestone 3**.
- Direct period historical-racing reviews preserved: **10**.
- Corroboration-only Layer E target mappings: **454**.
- Targets claimed `CLOSED_WITH_DIRECT_EVIDENCE`: **0**. Seven first-batch targets have direct reviewed-source support (four primary-scan, three abstract-only) but are not inflated into historical supplier/car/class closure.
- Targets partially supported by Layer E: **12**.
- First Layer D batch processed: **250** — 7 direct-source matches, 12 newly partially supported through Layer E, 231 without direct/partial closure.
- Layer E records processed: **200**.
- Layer A records still deferred: **35**.
- Layer C priority records registered but not yet executed: **5,000**.
- Layer E full-text follow-up still outstanding: **200**, prioritized by evidence density and historical directness.

## Remaining high-priority gaps and next checkpoint

1. Full-text pressure/deflection/thermal/transient review of the highest-density Tire Science and Technology sources already identified.
2. Period Group 2/ETCC supplier or team setup sheets with cold/hot pressure and I/M/O pyrometer context.
3. Correctly regenerate and retest cross-ply FAM022 after construction-provenance and pressure-prediction fixes.
4. Full-text wear/slip-energy sources with measured wear, temperature and grip/stiffness change.
5. Period 1993–96 BPR/JGTC/IMSA supplier manuals or team records.

The next research checkpoint must resume from these existing stable source IDs. It must not repeat the completed 200-document abstract discovery pass.
