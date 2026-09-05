# ACLM Historical Tire Lab — current project checkpoint

Checkpoint basis: application v0.11.0, Knowledge v1.9.0, branch `codex/calspan-architecture-v011`.

## 2026-09-04 Calspan architecture update

- Fully ingested the supplied 9-volume Calspan retrieval index: 3,630 pages, 380 Appendix B IDs, 358 test packages and 708 measurement-page locators.
- Preserved the Volume I 378-procured versus Appendix B 380-indexed discrepancy; no silent reconciliation.
- Added hierarchical identity, four-class applicability, a six-stage evidence-to-production pipeline, construction-generation and force/moment/transient/pressure/thermal/geometry/wet/wear relationship architecture.
- Added per-pack `ACLM_EVIDENCE_MODEL.json` and `ACLM_PARAMETER_CONFIDENCE.json`; the PDF report exposes evidence/model status.
- Calspan contributes zero digitized force-curve points and no production numerical changes. Generic evidence cannot override racing-family/event evidence.
- Knowledge v1.9.0: 85 families, 102 classes, 23 profiles, 158 sources and 184 production measurements. Release SHA-256 `29aeb92f2a1f10ccc752e7ce3d52a440befd40fcd2a7ed2f8654c6b449806fa2`; content SHA-256 `6b77f7d3807cfb30d9f1129652b6254c5e37d36a155a30db7e4d7379f24b90f0`.
- Canonical research totals are now 2,484 evidence records and 1,313 sources.
- All 100 tests pass; all six milestone fixture file hashes are unchanged.

## Completed software work

- The post-run analyzer prefers valid literal AC laps 2–5 and can fail-safely rebase a fresh pit-start capture whose AC lap counter was reused. It reports relative and raw AC lap mappings plus the selection basis.
- Pit/outlaps and partial laps cannot enter the decision window. Ambiguous, interrupted, mid-track, insufficient-moving-sample, mixed, stale, compound-mismatched or physics-hash-mismatched captures remain `INCOMPLETE/UNRESOLVED`.
- Missing pressure values remain null and make the screen unresolved; they cannot produce artificial −32/−38 psi failures.
- Per-lap distance is a current-tire-set lap span. Logger-cumulative, session, stint and tire-set distance bases remain separately labelled.
- The TirePack handoff now carries stable canonical IDs where identity is proven, visible pressure role/ID/corrections, intent-completeness warnings and session-start lap advice.
- Duplicate-start protection and `physicsHashMatch=true` fail-closed behavior remain mandatory.
- The import compatibility gate accepts only current v0.10.4 or certified canonical v0.10.2 schema-1.1 handoffs, always with exact imported `tyres.ini` SHA-256 verification. Unsupported versions remain rejected.

No tire-physics, pressure/compliance, Thermal V2, wear, LUT or Knowledge numerical value changed.

## Porsche 917K result

- Every accepted run uses active/generated `tyres.ini` SHA-256 `2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4` with `physicsHashMatch=true`.
- Baseline A: `FAIL`.
- Corrected B: `REVIEW` (staggered); LF/LR pass, RF/RR narrowly review. `04:48:54` is authoritative and `04:48:55` remains excluded as a duplicate.
- The 30 psi front / 35 psi rear confirmation C uses literal AC laps 2–5 and returns `REVIEW`.
- Independent C2 is a fresh capture whose AC counter began at lap 7. Raw lap 7 is excluded pit/out-lap, raw lap 8 is relative warm-up lap 1, and raw laps 9–12 are relative decision laps 2–5. Raw lap 16 is partial and excluded; complete raw laps 12–15 are reported separately as the later-lap diagnostic. It returns `REVIEW` and agrees with C within 0.023 psi.
- C2 records approximately 33.355/32.521/39.359/38.579 psi (LF/RF/LR/RR), all `REVIEW`, against 32F/38R ideal. Its sidecar role is `unclassified` with a blank TirePack ID and zero corrections; the setup clicks are therefore not independently sidecar-proven.
- C/C2 prove 30F/35R is reproducibly high on the loaded left tires. The best balanced whole-psi-grid inference is 29F/34R at all axle corners, setup-only.
- The 917K short-pressure phase is complete. Request no further 917K driving now. Thermal remains **UNRESOLVED** and wear remains **STORE, DO NOT FIT**.

## Four-host program

The fixed set remains Maserati 250F + Ford GT40 Mk II + Porsche 917K + Ford Escort RS1600.

- 250F: CLS102/FAM002 canonical pack verified; the first hash-matched 24F/24R AI baseline is the next live test.
- GT40: evidence retained, but generated-vs-active `STALE/HASH_MISMATCH` blocks fitting or new interpretation.
- 917K: host-specific short-pressure phase complete; no shared retune.
- Escort: same-tire A/B and AI fixture retained; thermal/wear unresolved.

## Research state

The full 2026-09-02 through 2026-09-04 research archive and the new Calspan complete index are consolidated under `research_import/`: 2,484 canonical evidence records and 1,313 canonical sources. The Calspan layer additionally preserves 3,630 page records, 380 identity rows, 358 packages and 708 observation locators without promoting them into production measurements.

Knowledge v1.9.0 adds the Calspan corpus, hierarchical identity and executable evidence/model architecture. Its generator priors, measurements, scaling rules, fitment overrides, classes and all production numerical collections are unchanged from v1.8.0. Release SHA-256 is `29aeb92f2a1f10ccc752e7ce3d52a440befd40fcd2a7ed2f8654c6b449806fa2`; content SHA-256 is `6b77f7d3807cfb30d9f1129652b6254c5e37d36a155a30db7e4d7379f24b90f0`.

The canonical fixture hash gate found no generated `tyres.ini`, LUT, thermal or wear drift. All 100 repository tests passed.

The earlier M0–M5 and weakness-corpus inventory remains in `docs/OVERNIGHT_RESEARCH_INGEST_2026-09-01.md`. Abstract-only, inaccessible, incomplete, OCR-unverified and temporally unsafe material remains deferred or quarantined in the new unresolved queue.

## Next unfinished item

Run the canonical Maserati 250F live card only after installing the certified v0.10.4 application and the unchanged canonical v0.10.2 TirePack into the car. Exit AC completely, launch a fresh session, import the installed car, select AI_REFERENCE/baseline, verify `physicsHashMatch=true`, and collect the 24 psi all-corner short screen. Do not begin another 917K run.

## Guardrails

- No driving or calibration use unless `physicsHashMatch=true`.
- No thermal, wear, pressure/compliance or production Knowledge numeric retune.
- Keep class-B Calspan OCR coefficients and every derived/reconstructed value out of production physics until source proof and controlled validation are complete.
- Preserve raw CSVs/manifests, requested versus observed conditions, identity, A/B role, corrections and duplicate exclusions.
- Vehicle/year supplier evidence must not become a universal family/class supplier.
