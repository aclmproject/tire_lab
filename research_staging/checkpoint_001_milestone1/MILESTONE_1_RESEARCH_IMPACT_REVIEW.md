# ACLM Tire Lab — Milestone 1 Research Impact Review

Date: 2026-08-29  
Knowledge baseline: Tire Knowledge v1.7.0 / schema 1.2.0  
Mode: research staging only; no canonical promotion, physics edit, app rebuild, or release

## Executive result

The unified handoff is registered and integrity-checked. Layer A contains 55 curated source/tasks, Layer B contains 500 research tasks, the first-priority Layer C pilot contains 5,000 tasks, and the complete Layer C corpus contains 50,000 records. Every one of the 5,555 checkpoint tasks has an auditable status.

This checkpoint performed an actual source review on 17 Layer A items: 2 full-text pages, 8 primary/period pages, 6 official abstracts, and 1 inaccessible source. It produced 26 evidence candidates. The other 38 Layer A sources and the dependent unresolved tasks remain explicitly deferred; registration is not being misrepresented as evidence review.

The statuses `FULL_TEXT_EVIDENCE_PROMOTED` and `PRIMARY_SCAN_EVIDENCE_PROMOTED` mean promoted from research task to the **staged evidence-candidate layer**. Nothing has been promoted into the canonical Tire Knowledge master.

## A. Ingestion ledger

- Layer A registered: 55
- Layer B registered: 500
- Layer C priority pilot registered: 5,000
- Full Layer C corpus verified: 50,000
- Checkpoint rows without a status: 0
- Orphan parent references: 0
- Duplicate task IDs: 0

Task status accounting:

| Status | Count |
|---|---:|
| ABSTRACT_ONLY_LIMITED_EVIDENCE | 616 |
| FULL_TEXT_EVIDENCE_PROMOTED | 2 |
| PRIMARY_SCAN_EVIDENCE_PROMOTED | 8 |
| DUPLICATE_PARENT_TASK_SATISFIED | 14 |
| INACCESSIBLE | 123 |
| DEFERRED_UNTIL_SOURCE_REVIEW | 2,712 |
| DEFERRED_WAITING_FOR_PARENT_EVIDENCE | 2,080 |

The large abstract/inaccessible counts include status propagation through dependent Layer B/C lineages; they are not counts of independently reviewed documents.

## B. Source review summary

| Review state | Layer A source/tasks |
|---|---:|
| FULL_TEXT_REVIEWED | 2 |
| PRIMARY_SCAN_REVIEWED | 8 |
| ABSTRACT_ONLY | 6 |
| INACCESSIBLE | 1 |
| METADATA_ONLY / deferred | 38 |
| SECONDARY_CITATION_ONLY | 0 |

- Existing canonical source expanded: 0. The SRC001 expansion task remains deferred, so no duplicate or unsupported expansion was created.
- Bibliographic candidates in the A/B identity map: 242, plus 10 non-source research missions.
- Candidates not matched to the existing 145-source knowledge library: 99. These are candidates, not approved canonical sources.
- Existing IDs represented: all 145.

Two pre-existing bibliographic duplicate groups were found and retained for cleanup review:

1. SRC025 and SRC098 — Dunlop Vintage R5 Range.
2. SRC030 and SRC081 — Michelin GT tire stint behavior at Sebring.

No IDs were silently deleted or merged.

## C. Evidence candidates

| Evidence type | Count |
|---|---:|
| Observation | 11 |
| Measurement | 6 |
| Scaling rule | 1 |
| Historical constraint | 3 |
| Event/supplier evidence | 1 |
| Calibration method | 4 |
| **Total** | **26** |

High-value findings:

- Thermal warm-up, contained-air pressure rise, deflection, hysteresis, and energy dissipation must be treated as a coupled transient. The EPA source is useful for mechanism and test design, not racing absolute coefficients.
- The 1968 South African GP report gives a direct example of using a pressure increment to correct tread-temperature distribution. Its local 120 C tread observation is event-specific and cannot become a universal historic optimum.
- Period Formula One evidence distinguishes post-stop tread I/M/O needle-probe readings from core or cavity telemetry.
- Reported F1 pressure ranges differ materially by era and construction. The 1982 and 1989 records remain separate and contextualized.
- Tread thickness, belt/carcass construction, load, camber, circuit surface, and temperature repeatedly appear as interacting variables. This supports validation coverage, not a universal numeric retune.
- The 1994 All-Japan GT source contributes class-weight and tire-allocation constraints, including removal of qualifying tires.
- Dunlop's 2017 LMP2 development account supports a validation chain spanning virtual modeling, machine testing, multiple chassis, surface types, and driver correlation.

## D. Duplicate, not-applicable, and no-direct-source outcomes

- Duplicate bibliographic groups in existing knowledge: 2
- Parent-task duplicate satisfactions: 14
- NOT_PRESENT_OR_NOT_APPLICABLE: 0 at this checkpoint
- NO_DIRECT_SOURCE_FOUND: 0 at this checkpoint

No unattempted discovery task was falsely labeled as “no source found.” It remains deferred.

## E. Conflict register

One contextual divergence is retained:

- A 1982 F1 account reports approximately 12–15 psi, with pressure state unspecified.
- A 1989 Goodyear radial account reports operating pressures of approximately 18–20 psi front and 16–18 psi rear, varying by track and climate.

These values will not be averaged. Supplier, year, construction, axle, test condition, and cold/hot state must be resolved before any generator mapping.

## F. Confidence gap delta

Improved:

- Stronger separation of tread surface, post-stop tread I/M/O, cavity temperature, and whole-tire dissipation observables.
- Direct period support for pressure/profile tuning and historically low F1 operating pressures in specific eras.
- Better construction-specific context for crossply, steel-braced/radial, and tread-thickness effects.
- Better validation-method lineage for modern LMP2 and abstract-level NASCAR/race-tire modeling work.

Still unresolved:

- Cold-versus-hot state for the 1982 pressure range.
- Measurement location for the 1975 Goodyear temperature figures.
- Applicable numerical mapping from historical temperature/pressure evidence to Assetto Corsa `PRESSURE_STATIC`, `PRESSURE_IDEAL`, thermal-transfer coefficients, or LUTs.
- Full-text support for six SAE abstract-only records.
- Remaining 38 Layer A source reviews and most first-5,000 dependent lenses.

## G. Model impact proposals

No numerical generator changes are authorized by this checkpoint.

Staged proposals only:

1. Add a validation requirement that every temperature datum declares its observable/location.
2. Keep pressure evidence scoped by cold/hot/operating/unspecified state.
3. Validate pressure-profile effects against I/M/O tread distributions rather than a single temperature number.
4. Add construction/era-specific test coverage before changing pressure or thermal priors.
5. Treat surface type, load, camber, and chassis as coverage axes in modern LMP2 validation.
6. Represent event tire-allocation rules separately from compound-performance physics.

Rejected unsupported inferences:

- 120 C is not a universal 1960s racing optimum.
- 220 F is not automatically a core-temperature optimum.
- 12–15 psi and 18–20/16–18 psi are not interchangeable or averageable.
- Passenger/light-duty equilibrium timing is not a racing warm-up constant.
- Earthmover cavity-temperature practice is not a racing pressure target.
- Abstract claims do not justify Tire Lab coefficients.

## H. Affected family/class matrix

| Candidate family/class area | Evidence impact | Current action |
|---|---|---|
| 1968 Formula One / Dunlop crossply | Pressure-profile and local tread-temperature evidence | Stage historical constraint; no coefficient change |
| 1975 Formula One / Goodyear dry and wet | Era-specific temperature statements, location unresolved | Preserve with measurement-location warning |
| 1980 Formula Two / Pirelli steel-braced vs Goodyear crossply | Construction-specific camber/lateral-stiffness behavior | Add validation coverage proposal |
| 1982 Formula One | Post-stop I/M/O method and pressure range | Preserve pressure-state ambiguity |
| 1989 Formula One / Goodyear radial | Axle-specific operating-pressure range | Stage era/supplier prior proposal only |
| 1966 Le Mans GT40 | Event-specific Firestone-to-Goodyear account | Fitment/event candidate only |
| 1994 All-Japan GT | Class weight and tire-allocation rules | Family/menu historical constraint candidate |
| 2017 LMP2 | Multi-chassis, load/pressure/camber and surface validation | Validation-method candidate |
| NASCAR oval | Slip-heat mechanism from abstract | Abstract-only; no constants |
| Passenger/light-duty and earthmover | Mechanism/measurement architecture | Explicitly excluded from racing absolutes |

## I. Integrity test results

- Unique evidence IDs: pass
- Valid evidence-to-source references: pass
- Source-review row for every Layer A task: pass
- Ledger row for every registered checkpoint task: pass
- Distinct source-review statuses preserved: pass
- Abstract-only claims limited to accessible abstracts: pass
- Measurement locations retained where known and ambiguity retained where unknown: pass
- No canonical knowledge write: pass
- No numerical generator change: pass
- No app build or release: pass

Output hashes are recorded in `checkpoint_summary.json`.

## J. Priority recommendations for the next batch

1. Finish the 38 deferred Layer A reviews, prioritizing primary regulations, manufacturer technical booklets, and open government reports.
2. Retrieve full text for the six SAE abstract-only items through lawful access; keep abstract limits until then.
3. Expand SRC001 only after section/page-level rereview; do not create a new source.
4. Resolve pressure state and measurement location for the 1982 and 1975 F1 records.
5. Review the 1996 IMSA GTS rulebook pages for tire size, wheel, and class restrictions.
6. Convert the 26 candidates into canonical-schema candidates with explicit affected family/class IDs, but do not promote until review.
7. Process the first 5,000 child lenses selectively against reviewed parents; leave unrelated lenses deferred rather than inventing negative findings.
8. Run the next integrity checkpoint before any knowledge-version increment.

## Files

- `source_reviews.jsonl`: one row per Layer A source/task.
- `evidence_candidates.jsonl`: staged typed evidence; no canonical IDs assigned.
- `conflict_register.jsonl`: retained contextual divergence.
- `lineage_registry.jsonl`: A/B/C lineage with propagated status.
- `ingestion_ledger.jsonl`: auditable checkpoint status for all 5,555 registered tasks.
- `source_identity_index.json`: bibliographic identity/dedup map.
- `checkpoint_summary.json`: counts, limitations, integrity, and hashes.

