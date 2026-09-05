# ACLM Historical Tire Lab — research and Knowledge checkpoint

## Frozen authority

- Knowledge version: v1.8.0.
- Release SHA-256: `73cdc1cc8ba62383c6370adcac776a1f20f035b0bac481b2e4ba94d1d0ffb60c`.
- Content SHA-256: `0f0835e652ec8b73ae184f10159483892603a9c51e8a03160c4398395d6c8216`.
- Counts: 85 families, 102 classes, 23 vehicle profiles, 149 sources, 184 measurements.
- Generator priors, measurements, scaling rules, fitment overrides, classes and every production numerical collection are byte-semantically frozen unchanged from v1.7.1.

## Full archive consolidation — 2026-09-04

All 74 supplied ZIP files and the Calspan 1976 workbook were opened and recursively inspected. The archive graph contains 100 ZIP layers and 7,571 file occurrences representing 766 unique payloads. Exact payload hashing collapsed 6,805 duplicate file occurrences; semantic/source deduplication collapsed 3,885 raw evidence candidates to 2,478 canonical records. The consolidated manifest contains 1,304 canonical sources, 21 explicit contradiction/supersession relationships, 1,616 classified numeric records and 316 unresolved trails. Eight exact-duplicate top-level archive groups contain 22 ZIP files, or 14 redundant copies beyond one representative per group. No archive, member or parse errors remain.

The authoritative outputs are under `research_import/`. `INGESTION_PROVENANCE.json` preserves every top-level input hash, recursive member path and member hash; `RESEARCH_ARCHIVE_INVENTORY.csv` records duplicate and overlap disposition. The original ZIPs, PDFs and workbook remain untouched in the supplied research directory.

## Material knowledge improvements

- The Pirelli Stelvio/Stelvio Corsa branch is canonical for the relevant Maserati 250F evidence. A 1953 5.90-15 primary drawing anchors six plies and 34-degree construction, but is not projected onto the unresolved 1957 5.50x16 front and 7.00x16 rear carcasses.
- The 1957 250F baseline is narrowed to 5.50x16 front and 7.00x16 rear. Other 16/17-inch combinations remain explicit event/chassis branches.
- Porsche 917 suppliers are resolved at event/team/chassis scope: 917-023 Goodyear in its 1970 winning period, later Firestone in Martini use, and a JW Automotive Firestone anchor at Watkins Glen 1970. No universal 917 supplier is asserted.
- 917 dry, intermediate and wet hardware are separate evidence branches. Candidate Firestone wet/intermediate size strings remain quarantined until period corroboration.
- 917 failure language is normalized into puncture, tread separation/chunking, burst and casing/thermal pathways; the Le Mans alignment-to-heating-to-burst chain remains event-specific.
- Cross-ply thermal evidence now supports a source-linked multi-node architecture separating deflection, slip/braking, road, ambient and cavity pathways, including asymmetric yaw hot spots.
- NACA/NBS material strengthens the architecture for pressure/load/deflection-dependent relaxation, loaded and effective radius, pneumatic trail, aligning torque, combined slip and contact-pressure load sensitivity.
- The Calspan workbook contributes 25 visually checked tire identities and 528 raw OCR-derived force-model coefficient rows, collapsed to 470 canonical coefficient records after exact/semantic deduplication. All remain class B test priors pending independent proof against source volumes.
- Group C, late-1970s WSC and 1990s WSC/LMP/GT evidence now preserves exact event/supplier/rim/tire branches and bias/mixed/radial construction transitions rather than blending generations.

## Contradictions and supersessions

- The blanket Maserati 250F `Stella Bianca` default is rejected; the stronger product-family branch is Pirelli Stelvio/Stelvio Corsa, while exact 1957 construction material remains unresolved.
- The 917 Monza engine-overrev explanation is not a tire-failure record; documented puncture evidence remains separately scoped.
- Universal 917 Firestone or Goodyear assignments are superseded by event/team/chassis-specific supplier branches.
- Dunlop R6 and R7 evidence is preserved as track/axle coexistence, not a single linear replacement.
- Ferrari 333 SP geometry is split into distinct generation/event branches; anomalous C41 37/65 material is quarantined rather than normalized into a family default.

## Negative results and unresolved work

Archive-search dead ends, access failures, abstract-only leads, missing pages, ambiguous product codes, unresolved pressure conventions and unevaluated OCR remain in `UNRESOLVED_RESEARCH_QUEUE.md`. Rejected claims are retained with reasons in `MASTER_EVIDENCE_LEDGER.csv`, and their relationships are explicit in `CONTRADICTIONS_AND_SUPERSESSIONS.csv`.

The ten lowest-score families remain mostly reconstructed. Their recurring deficits are primary force/moment data, aligning torque/pneumatic trail, camber response, degradation and failure behavior. The first family targets are FAM013, FAM023, FAM022, FAM021 and FAM020; the complete 85-family matrix and P0/P1 gaps are in `TIRE_FAMILY_COVERAGE_SCORECARD.csv`.

## Numeric evidence discipline

- Class A is restricted to direct, source-specific historical measurements or operating specifications with traceable provenance.
- Class B contains bounded test priors, including all Calspan OCR coefficients.
- Class C contains derived or reconstructed values.
- Class D contains ACLM experiments.
- No B, C or D value was promoted to A; no new pressure, force/moment, thermal, wear, loaded-radius or degradation number was installed in production physics.
- Structural service life remains separate from tread wear and simulator degradation.

## Exact next priorities

1. Recover Calspan 1976 Volumes IV-IX or verified page images and independently proof all 528 raw OCR coefficient rows (470 canonical after deduplication).
2. Obtain the 1957 Pirelli 250F carcass specification: cord material, ply count/angles and event-specific 5.50x16 and 7.00x16 construction.
3. Resolve Porsche 917 wet/intermediate Firestone size strings and event-by-event 1970 supplier/chassis mappings from primary records.
4. Recover the full General/GenCorp, Goodyear D460G/P195/70R14 and Clemson/NTMP documents behind the current citation graph, prioritizing force/moment tables and specimen identity.
5. Acquire period Group 2/4/5/6, Group C and 1990s WSC/LMP technical sheets to close supplier, construction-generation and rim/tire ambiguity without merging event branches.

## Research guardrails

- Simulator closure is engineering evidence, not historical proof.
- Stable temperature or pressure slopes do not establish a historical operating window.
- Period survival requirements do not become virtual-kilometre wear curves.
- No source may silently overwrite a production numerical prior; evidence class, scope, limitation and provenance must remain explicit.
- The four-host cross-ply program continues to preserve 250F + GT40 + 917K + Escort as separate fixtures.
