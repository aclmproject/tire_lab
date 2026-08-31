# ACLM Tire Lab — 10,000-Target Weakness Corpus Intake Report

Date: 2026-08-29  
Disposition: staging only; P0 milestone **not complete**

## Outcome

The ZIP is structurally intact and safe to retain, but the first 1,000-target acquisition manifest is not safe to execute literally without a temporal/class correction pass.

Package integrity passed:

- ZIP SHA-256: `aa52ee6597c6653aab273cb7fc75190615cd28c8c25170c19bfe2ccd13542df8`
- Manifest SHA-256 matches `PACK_STATS.json`.
- 10,000 manifest rows and 10,000 unique IDs.
- 20 shards × 500 rows cover the manifest exactly.
- P0 contains exactly 1,000 unique targets and matches the manifest's P0 set.

## Critical target-quality finding

Of the first 1,000 targets:

| Scope audit | Count |
|---|---:|
| Temporal/class conflict | 443 |
| Partial temporal overlap | 140 |
| Temporally plausible under explicit rule | 125 |
| No obvious conflict under the limited rules | 292 |

Examples of generated conflicts include:

- BPR GT1 assigned to years before the 1994–96 championship.
- “Le Mans GT1” assigned to 1960s–80s periods before that category label existed.
- GT40/1960s endurance assigned to 1992–96.
- Group C/IMSA GTP assigned to 1966–71.
- Group A/DTM and JGTC/GT500 assigned to 1972–76.
- Group 2/ETCC assigned to the 1990s and 2000s.

These targets were quarantined as `OUT_OF_SCOPE_PENDING_TARGET_CORRECTION`. They were not searched and were not mislabeled `NO_DOCUMENT_FOUND`, because the defect is in the generated target rather than proof that no relevant document exists.

The 140 partial-overlap targets remain pending but must use narrowed dates. No original manifest row was overwritten.

## Seed-source review

Seven unique documents were bibliographically resolved from the verified seed list:

- 6 full-text period/technical pages reviewed.
- 1 NASA document identity retained as `INACCESSIBLE` because the NTRS page returned HTTP 403 in this environment.
- 43 supplied seeds remain unreviewed.

These reviews produced 13 staged evidence candidates:

| Evidence type | Count |
|---|---:|
| Measurement | 4 |
| Historical observation | 4 |
| Event/supplier evidence | 3 |
| Scaling rule | 2 |

By weakness:

| Weakness | Evidence candidates |
|---|---:|
| W01 pressure/temperature/setup | 2 |
| W04 wet/intermediate | 5 |
| W05 construction/materials | 1 |
| W06 supplier compounds | 1 |
| W07 fitment/geometry/regulations | 1 |
| W09 damage/break-up | 2 |
| W10 thermal transfer/external heating | 1 |

## Highest-impact findings

### Car/load-specific mixed-weather menus

The 1969 Watkins Glen report says lightweight Porsche 908s could use Dunlop 970 intermediates in changing conditions, while the heavier Matras risked overheating them if the circuit remained dry and selected Dunlop 184 dry tires. This is direct event evidence that the same compound architecture was not equally suitable across vehicle loads.

A 1973 Group 2 Camaro report independently states that the heavy car needed two or three intermediate choices for damp conditions, whereas lighter saloons could use one. It also ties vehicle mass to construction development and reports 10×15-inch front and 14×15-inch rear wheels.

Impact: Tire Lab should eventually support car/load-specific compound-menu applicability. These accounts do not define a universal mass threshold or numerical heat-generation coefficient.

### Historical intermediate and failure identity

- A 1972 Elan test records Dunlop 350 Intermediate, size 200/550-13, with an 8.5-inch rim-width limit.
- A 1978 Group 1 Capri account reports Goodyear G57 failures in Spa practice, Dunlop substitution for qualifying, modified G57s for the race, and Michelin intermediates selected for damp rather than fully wet conditions.
- The 1979 US GP East account supplies qualitative cold warm-up difficulty and an event-specific Michelin-versus-Goodyear wet comparison, but no numeric optimum tire temperature.

### BRM external-heating evidence

The secondary BRM history quotes a 1953 Dunlop test: 4–6 mm tread, 42 psi, 90–95 mph for nine minutes, approximately 65 C tread temperature, and rear-tire airstream temperature substantially above ambient depending on exhaust placement.

Limitations:

- The underlying Dunlop report was not independently obtained.
- The measurements apply to the 1953 BRM V16, not the later P48.
- The air-stream measurement is not a carcass/core or cavity temperature.
- OCR ambiguity and the unusual reported inflation values require checking against the original report.

This is useful as an external-heat/failure validation case, not as a BRM P48 thermal or pressure prior.

## P0 milestone status

The requested 1,000-target milestone is not complete:

- P0 targets satisfied by an exact unique document: 0
- P0 targets remaining: 1,000
- Unique seed documents reviewed/resolved separately: 7

The seed documents were not forced onto mismatched P0 targets merely to raise the count.

Before acquisition resumes, the 443 temporal conflicts should be corrected or replaced and the 140 partial overlaps narrowed. Only then should 500-target acquisition shards begin.

A non-destructive proposal has now been generated at `../weakness_10000_checkpoint_002_target_correction_proposal/P0_FIRST_1000_CORRECTION_PROPOSAL.jsonl`. It preserves every original target ID, class, date range, and search query alongside 443 proposed class relabels and 140 proposed date narrowings. The supplied manifest remains untouched; these proposals require review before acquisition.

## Physics and knowledge impact

Numerical generator changes justified now: **none**.

Potential non-numerical knowledge/architecture candidates after canonical review:

1. Vehicle/load-specific dry/intermediate/wet menu applicability.
2. Separate damp/intermediate and heavy-rain evidence states.
3. Event-specific supplier/compound/failure records.
4. External heat-source metadata distinct from internal tire heat generation.
5. Exact fitment records for Dunlop 350 Intermediate and the 1973 Group 2 Camaro.

Escort/FAM023 pressure and temperature evidence remains unresolved. The new batch does not justify changing its cold-pressure prediction, carcass stiffness, thermal network, wear curve, or AC VIRTUALKM mapping.

## Files

- `checkpoint_summary.json` — reviewed-source and evidence counts.
- `seed_source_reviews.jsonl` — one row for each supplied seed and its current status.
- `seed_evidence_candidates.jsonl` — staged evidence with limitations and model disposition.
- Previous audit checkpoint:
  - `../weakness_10000_checkpoint_000_audit/pack_audit.json`
  - `../weakness_10000_checkpoint_000_audit/p0_acquisition_ledger.jsonl`
  - `../weakness_10000_checkpoint_000_audit/temporal_scope_flags.jsonl`
- Target-correction proposal:
  - `../weakness_10000_checkpoint_002_target_correction_proposal/P0_FIRST_1000_CORRECTION_PROPOSAL.jsonl`
  - `../weakness_10000_checkpoint_002_target_correction_proposal/correction_summary.json`
