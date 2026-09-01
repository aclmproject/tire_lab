# Overnight research ingestion — 2026-09-01

## Decision

The overnight corpus is fully registered as **research staging**, not production Tire Knowledge. It materially strengthens evidence architecture, coupled pressure/thermal/wear methodology, wet/intermediate applicability and provenance discipline, but it does not justify changing Knowledge v1.7.1, any historical numeric prior, any scaling rule, or tire physics. Stable staging IDs and the existing milestone registries remain authoritative; no duplicate source IDs were created in this pass.

## Continuation reconciliation

The post-analyzer continuation re-inventoried the checked-in corpus rather than restarting acquisition. The Milestone-4 store contains 39 uniquely identified retrieved PDFs: 30 already represented by the reviewed source register and nine still pending review. There are no duplicate acquired IDs and no duplicate reviewed IDs. No new finding was promoted during this reconciliation.

The nine quarantined retrieved-but-unreviewed records are `E-SRC-0077`, `E-SRC-0082`, `E-SRC-0083`, `E-SRC-0093`, `E-SRC-0099`, `E-SRC-0101`, `E-SRC-0121`, `E-SRC-0126` and `E-SRC-0129`. Their presence on disk is not a review. No unnamed, temporary or unfinished PDF was treated as evidence; any such artifact remains excluded until it has a stable source ID, a complete-file check, full-text review, provenance and applicability assessment.

Next source-review priority is period primary or supplier material that can close a named racing-host gap. The NASA reports remain useful primary technical sources for architecture, but aircraft/runway findings stay indirect and may not be transferred numerically to a racing family. Within the pending set, period force/deflection and pressure work (`E-SRC-0082`, `E-SRC-0083`) precedes later overview material; racing supplier/period sources with explicit vehicle, event and year scope outrank all of them for production historical claims.

## Inventory and disposition

| Staging checkpoint | Material reviewed/registered | Evidence quality and result | Disposition |
|---|---|---|---|
| `checkpoint_000_first_5000` | 55 Layer-A tasks, 500 Layer-B tasks, first 5,000 of a verified 50,000 Layer-C corpus; 242 bibliographic candidates | Registration and lineage only; 5,555 rows are auditable and no evidence was promoted | Accepted as provenance/queue infrastructure; deferred for source review |
| `checkpoint_001_milestone1` | 17 actual source reviews; 26 candidates: 11 observations, 6 measurements, 1 scaling rule, 1 event-supplier record, 4 methods, 3 constraints | Two full texts, eight primary scans, six abstract-only, one inaccessible | Accepted in staging with the recorded evidence type and scope; abstract-only claims remain limited |
| `checkpoint_002_milestone2_working` | Unified 317 identities and 74 candidates: 24 observations, 12 measurements, 8 scaling rules, 5 event-supplier records, 4 methods, 13 constraints, 3 compound-applicability and 5 source-methodology records | Exact lineage and compatibility validation passed; one unresolved conflict remains | Accepted in staging; no numeric model promotion |
| `checkpoint_003_milestone3_archive_first` | 200 unique archive documents and 525 candidates across thermal, wear, force/moment, pressure, wet, construction and transient topics | All 200 are abstract-only (A2/B1); 406 methodology, 48 observation and 71 scaling candidates; no measurements promoted | Provisional only. Useful for architecture and acquisition routing, not class-specific or numeric calibration |
| `checkpoint_004_milestone4_fulltext` | 30 targeted full texts with stable `E-SRC-*` identities; 10 measurements, 18 observations, 10 scaling rules and 8 methodology records (46 typed findings) | Full-text technical review; pressure architecture strongly supported, thermal architecture supported without a global multiplier, wear architecture supported but calibration insufficient | Accepted in staging. The records in `FULLTEXT_*.jsonl` are the exact incorporated findings; none overwrite production values |
| `checkpoint_005_milestone5_engineering` | Five cross-era engineering fixtures and the v0.10.0 evidence-constrained architecture checkpoint | Application regression evidence, not a new historical corpus | Retained as engineering-control history; superseded application identity is not promoted |
| `weakness_10000_checkpoint_000_audit` | 10,000 target rows, 1,000 P0 rows, 50 seeds | 443 temporal-label conflicts, 140 partial overlaps and 7 duplicate target tuples identified | Original targets quarantined/non-destructively corrected before acquisition; not evidence |
| `weakness_10000_checkpoint_001_seed_review` | Seven real documents resolved, six full-text reviewed, one inaccessible; 13 candidates | 4 measurements, 4 historical observations, 3 event-supplier and 2 scaling records | Accepted in staging with explicit limitations; 43 seeds and all 1,000 P0 targets remain unfinished |
| `weakness_10000_checkpoint_002_target_correction_proposal` | Non-destructive correction proposal for 1,000 P0 targets | 443 proposed class relabels, 140 date narrowings, 417 unchanged; proposal only | Deferred pending review; original IDs and fields remain intact |

## Findings incorporated into staging

- The 46 Milestone-4 full-text findings remain the strongest overnight technical material. They support coupled pressure/load/deflection/temperature treatment, load-sensitive stiffness and force behavior, thermal-network reasoning rather than one global heat multiplier, and separation of wear architecture from historical-life calibration. Their exact sources, dates, URLs/files, evidence classes, applicability and limitations are preserved in `research_staging/checkpoint_004_milestone4_fulltext/FULLTEXT_SOURCE_REGISTER.jsonl`, `FULLTEXT_MEASUREMENTS.jsonl`, `FULLTEXT_OBSERVATIONS.jsonl`, `FULLTEXT_SCALING_RULES.jsonl` and `FULLTEXT_METHODOLOGY.jsonl`.
- The weakness-seed review adds load- and vehicle-specific wet/intermediate applicability: the light Porsche 908, heavier Matra and heavy Group 2 Camaro evidence indicates that one universal mixed-weather compound menu is unsafe. This supports menu architecture only; it does not supply dry-tire coefficients or universal supplier assignments.
- Period BRM V16 external-heat/failure material is retained as secondary, vehicle-specific context. It does not transfer to the BRM P48 and does not alter FAM021/FAM023 physics.
- Event-supplier evidence remains scoped to its vehicle/event/year. It may strengthen a dossier but never makes a supplier universal to a class or family.
- The milestone lineage, duplicate identities (`SRC025`/`SRC098` and `SRC030`/`SRC081`), conflict registers and immutable hashes remain part of the accepted provenance layer.

## Deferred findings

- All 183 unified abstract-only sources remaining after Milestone 4 and all 525 Milestone-3 abstract-derived candidates require full-text review before numeric or class-specific use.
- Nine retrieved-but-unreviewed full texts, 35 deferred Layer-A items, 43 unreviewed weakness seeds, the 1,000-row P0 queue and remaining Layer-C corpus remain queued. Registration volume is not evidence quality.
- Pressure-pyrometer, racing setup-book, supplier technical, stint telemetry and wet/intermediate full texts remain the highest-value acquisition targets.
- Architecture candidates may inform future code design only after separate review and regression; they do not authorize changes in this release.

## Rejected or quarantined claims

- The original 10,000 Layer-D targets were quarantined and replaced non-destructively because class/era labels were unsafe; the 443 temporal conflicts and 140 partial overlaps cannot be treated as historical facts.
- Dimensional measurement pressure is not accepted as historical hot racing pressure without race-use evidence.
- Race distance, survival anecdotes or “two Grands Prix on one set” claims are not converted directly to AC virtual-kilometre wear curves.
- Aircraft, road-car or rig measurements are not transferred directly to a racing family without load, construction, scale and duty-cycle applicability.
- Qualitative heat, failure or supplier narratives do not become exact temperature windows, wear cliffs or universal supplier assignments.
- No universal 120 °C target, averaged axle pressure, global thermal multiplier or inverse-fit coefficient is accepted from this batch.

## Four-host impact

| Host | Material impact | Remaining limit |
|---|---|---|
| Maserati 250F | Existing primary dossier and CLS102/FAM002/Pirelli fixture-only resolution remain coherent | No new source proves absolute racing pressure, temperature, loaded radius or exact vertical rate; live hash-matched baseline remains next |
| Ford GT40 Mk II | Event-supplier and qualitative high-speed/failure context remains useful | Active/generated hash mismatch still blocks fitting; no new numeric pressure/thermal claim is promoted |
| Porsche 917K | Coupled-network methodology supports conservative interpretation of the completed short-pressure evidence | No new direct historical 917K pressure/temperature evidence; Thermal V2 remains unresolved and wear store-only |
| Ford Escort RS1600 | Vehicle/load-specific compound-menu evidence strengthens the case against one universal class menu | No new full-text finding closes FAM023 absolute pressure or temperature gaps |

## Production authority after ingestion

- Application identity advances to v0.10.3 for telemetry-analysis integrity only.
- Knowledge remains v1.7.1: release SHA-256 `ca0b0fcf498e8f4714354f22ffef269cca1c813b3b19eda8eb9d1b77f0dd8954`, content SHA-256 `14f92adf97786556ac3472f05496a469bdfd0713b2b49fd4c146e529912ff14f`.
- Production families, classes, measurements, generator priors and scaling numerics are unchanged.
- No candidate Knowledge release is created because this batch does not yet offer a taxonomy/evidence-safe change requiring promotion.
