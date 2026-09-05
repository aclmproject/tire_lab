# Full research ingestion report

## Outcome

Every supplied archive and workbook was opened, hashed, recursively inventoried, normalized into a canonical evidence/source model, deduplicated by source and meaning, and linked back to its original archive paths. No production tire-physics file or numerical production value was changed.

## Processing totals

- Top-level inputs processed: 75 (74 ZIPs and 1 workbook).
- Recursive archive layers: 100.
- File occurrences inspected: 7571.
- Unique file payloads: 766.
- Exact duplicate file occurrences collapsed: 6805.
- Top-level ZIPs participating in exact-duplicate groups: 22 across 8 groups (14 redundant copies beyond one retained representative); partially overlapping ZIP files: 26.
- Raw evidence candidates: 3885; canonical evidence records: 2478; duplicate/near-duplicate evidence rows collapsed: 1407.
- Canonical sources: 1304; raw source mentions deduplicated: 4678.
- Evidence records new to the current v1.7.1 repository source/claim state: 2461.
- Contradiction/supersession relationships: 21; rejected claims retained: 2; strengthened claims: 110.
- Numeric records classified: 1616, including 232 class-A validated historical numeric records and 1384 bounded/derived/experimental records.
- Unresolved research trails retained: 316.
- Archive/member read failures: 0/0.

## Ten most important knowledge improvements

1. Pirelli Stelvio/Stelvio Corsa is now the canonical 250F product-family branch. The 1953 5.90-15 drawing supplies a six-ply, 34-degree construction anchor, while the exact 1957 carcass material remains unresolved.
2. The 1957 Maserati 250F baseline is narrowed to 5.50x16 front and 7.00x16 rear, with documented 16/17-inch alternatives retained as event/chassis branches rather than erased.
3. Porsche 917 supplier identity is resolved by team, chassis and event: 917-023 Goodyear in its 1970 winning period, later Firestone in Martini use, and a JW Automotive Firestone anchor at Watkins Glen 1970.
4. 917 wet and intermediate hardware is split into distinct branches, including Brands Hatch Firestone wheel envelopes; candidate Firestone size strings remain quarantined pending period corroboration.
5. 917 failure evidence now separates puncture, tread separation/chunking, burst and casing/thermal pathways. The Le Mans alignment-to-heating-to-burst chain is retained as an event-specific mechanism.
6. Cross-ply physics now has a source-linked multi-node thermal architecture with separate deflection, slip/braking, road, ambient and cavity pathways plus asymmetric yaw hot spots.
7. NACA/NBS evidence strengthens pressure-, load- and deflection-dependent relaxation, loaded/effective radius, pneumatic trail, aligning torque, combined slip and contact-pressure load sensitivity.
8. The Calspan 1976 workbook contributes 25 visually checked tire identities and 528 raw OCR-derived force-model coefficient rows (470 canonical after exact/semantic deduplication), with page-level provenance and explicit class-B test-prior quarantine.
9. Group C and late-1970s WSC families gain exact supplier/event tire and rim tuples, plus evidence that bias, mixed and radial construction transitions must be resolved by car and event.
10. 1990s WSC/LMP and GT evidence now preserves supplier competition and 16-to-17-to-18-inch geometry generations, while modern bulletins add controlled-test priors for pressure/camber/stint coupling without back-projecting them into historical production values.

## Important contradictions and resolutions

- **Hybrid LMP1 Gen1 2012 Toyota TS030 geometry** — contradicted by: CONTRADICTS over-broad square-hybrid chronology; creates 2012–13 wide/staggered Gen1. (contradicted).
- **Maserati 250F product naming** — rejected because: Strengthens Stelvio; rejects blanket Stella Bianca default. (strengthened).
- **Michelin legacy 90s WSC/LMP continuation geometry** — narrowed by: Adds geometry sanity/continuation reference with strict period quarantine. (active).
- **917-023 conflicting failure claim** — rejected because: Conflicts with stronger sources. (rejected).
- **917-023 Monza engine-overrev claim** — rejected because: Contradiction isolated and downgraded. (rejected).
- **917-023 Monza puncture DNF** — contradicted by: Puncture explanation strengthened; engine-overrev claim contradicted. (strengthened).
- **Audi R10 2006 rear-tire durability regression** — contradicted by: Contradicts monotonic/simple continuity assumption; R10 imposed rear-tire duty penalty. (strengthened).
- **Courage C41/C52 supplier transition** — narrowed by: Adds supplier-lineage transition but quarantines suspect front-size number. (active).
- **Ferrari 333 SP base wheel architecture** — contradicted by: Strengthens base 16-inch architecture but opens explicit rear-width contradiction. (contradicted).
- **Ferrari 333 SP Le Mans 1996 Pirelli geometry** — narrowed by: Adds 1996 Pirelli 17-inch branch with narrower wheel widths. (active).
- **Maserati 250F size menu** — narrowed by: Narrows candidate combinations. (strengthened).
- **Porsche 917K** — rejected because: Reject tire-change frequency as dry-wear proxy. (active).
- **Porsche 917K — 917-023 wet architecture** — narrowed by: Adds evidence that wet setup narrowed at least front rim geometry. (active).
- **Dunlop early Porsche SP pressure gap** — narrowed by: No promotion; candidate explicitly quarantined. (active).
- **Thermal aging of cord** — narrowed by: Narrows exact primary extraction target. (active).
- **Maserati 250F product naming** — strengthened by: Supplier-origin Stelvio evidence rejects a blanket Stella Bianca default while preserving event sub-spec uncertainty. (resolved at family level; event sub-spec open).
- **Porsche 917-023 Monza retirement** — contradicted by: The secondary engine-over-rev account is rejected in favor of the stronger multi-source puncture-related damage record. (rejected competing cause retained).
- **Porsche 917 supplier identity** — narrowed by: Firestone and Goodyear evidence applies by team, chassis and event; no universal 917 supplier assignment is valid. (event-resolved, globally unresolved).
- **Dunlop R6/R7 chronology** — narrowed by: Period evidence shows track- and axle-specific coexistence rather than a simple one-way generation replacement. (coexisting sub-families retained).
- **Ferrari 333 SP geometry** — superseded by: The one-family geometry assumption is replaced by a 16-inch base, 17-inch mid-decade and 18-inch late-decade chronology. (multi-generation chronology retained).

## Current ten weakest family evidence gaps

- **FAM004 Late-60s tire-war F1** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM005 1971-73 Formula slick cross-ply** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM006 Late-70s/early-80s high-load slick** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM008 Late-80s Group A touring radial** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; degradation; failure_behavior; force_moment_data. Gap: aligning_torque_trail; degradation; failure_behavior; force_moment_data
- **FAM009 Early one-make GT radial** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM011 ITC/DTM advanced touring radial** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM013 Early-2000s FIA GT / ALMS radial** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM014 2000s NASCAR radial stock-car** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM015 Modern control road-race radial** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior
- **FAM016 Formula Ford cross-ply control tire** — 3.6/10, mostly reconstructed. Weakest: aligning_torque_trail; camber_behavior; degradation; failure_behavior. Gap: aligning_torque_trail; camber_behavior; degradation; failure_behavior

## Numeric evidence discipline

Class A values are direct, source-specific historical measurements or operating specifications. Class B values are test priors, including every Calspan coefficient transcribed through OCR. Class C values are derived/reconstructed. Class D values are ACLM experiments. No B, C or D value was promoted into A and no value was written into production physics.

`productionNumericChangesRecommended = false`

## Exact next research priorities

1. Recover Calspan 1976 Volumes IV-IX (or verified page images) and independently proof the 528 raw OCR coefficient rows (470 canonical after deduplication) against their tables before any coefficient is eligible to move beyond class B.
2. Obtain the 1957 Pirelli 250F carcass specification, especially cord material, ply count/angles and the event-specific 5.50x16 and 7.00x16 constructions; do not back-project the 1953 5.90-15 drawing.
3. Resolve Porsche 917 wet/intermediate Firestone size strings and 1970 event-by-event supplier/chassis mappings from entry sheets, team records or period technical sheets.
4. Recover full General/GenCorp, Goodyear D460G/P195/70R14 and Clemson/NTMP source documents behind the current document graph; prioritize force/moment tables, pressure conventions and specimen identity.
5. Target the scorecard's weakest families with primary force/moment, aligning-torque/pneumatic-trail, camber, degradation and failure data, beginning with FAM004, FAM005, FAM006, FAM008 and FAM009.
6. Acquire period tire/rim technical sheets for Group 2/4/5/6, Group C and 1990s WSC/LMP event branches to close construction-generation and supplier ambiguity without merging event-specific tuples.

## Knowledge architecture changes

- Added a versioned consolidated evidence archive with canonical source IDs, contradiction links, numeric classes and complete archive/file lineage.
- Added nonnumeric family architecture notes for 250F/Stelvio, 917 event/supplier/failure branches, Group C construction transitions and 1990s WSC geometry generations.
- Added a 1970 Porsche 917K event-resolved vehicle profile with no universal supplier and no pressure or tire-physics numeric defaults.
- Kept structural service life separate from tread wear and simulator degradation.

## Validation

- CSV and JSON outputs are UTF-8, schema-checked and parseable.
- Canonical evidence and source IDs are unique.
- Every rejected record retains a reason or state-change explanation.
- Evidence classes were normalized only from explicit source labels; abstract-only and OCR-derived limitations remain visible.
- The pre-commit production-physics guard scan found no `tyres.ini`, LUT, thermal, wear or physics-file change.

## Files created or updated

- `FULL_RESEARCH_INGESTION_REPORT.md`
- `RESEARCH_ARCHIVE_INVENTORY.csv`
- `MASTER_EVIDENCE_LEDGER.csv`
- `MASTER_SOURCE_MANIFEST.csv`
- `CONTRADICTIONS_AND_SUPERSESSIONS.csv`
- `UNRESOLVED_RESEARCH_QUEUE.md`
- `TIRE_FAMILY_COVERAGE_SCORECARD.csv`
- `NUMERIC_EVIDENCE_CLASSIFICATION.csv`
- `INGESTION_PROVENANCE.json`
- `knowledge/releases/ACLM_Tire_Knowledge_v1.8.0.json`
- `knowledge/releases/ACLM_Tire_Knowledge_v1.8.0_validation.json`
- `knowledge/ACLM_Tire_Knowledge_current.package.json`
- `knowledge/ACLM_Tire_Knowledge_latest.json`
- `src/payload/app/knowledge_fallback.json`
- `src/payload/app/knowledge_fallback.js`
- `docs/RESEARCH_KNOWLEDGE_CHECKPOINT.md`
- `docs/CURRENT_PROJECT_CHECKPOINT.md`
- `tools/consolidate_research_archives.py`
- `tools/build_knowledge_180_archive.js`
- `tools/validate_research_import.py`
- `tests/research_archive_ingestion.test.js`

## Git

The final handoff records the validated branch, commit SHA and push result; Git history remains the durable authority.
