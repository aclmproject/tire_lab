# ACLM Tire Lab credit-cutoff checkpoint

## Current version

- Application: v0.10.2 (unchanged).
- Knowledge: v1.7.1, a taxonomy-only successor to v1.7.0.
- Working branch: `codex/csp-thermal-v2`.
- No application release has been published from this working tree.

## Last completed task

The 1954–1958 Formula 1 / Grand Prix taxonomy gap was closed without renumbering or changing any existing class, family, measurement, scaling rule, or generator prior. Canonical Porsche 917K and Maserati 250F 6C TirePacks were then generated and verified from the clean Kunos control snapshots.

## Files modified

- `knowledge/ACLM_Tire_Knowledge_current.package.json`
- `knowledge/ACLM_Tire_Knowledge_latest.json`
- `src/payload/app/knowledge_fallback.json`
- `src/payload/app/knowledge_fallback.js`
- `src/payload/app/app.js`
- `docs/CREDIT_CUTOFF_CHECKPOINT.md`

## Files created

- `tools/build_knowledge_171_taxonomy.js`
- `knowledge/releases/ACLM_Tire_Knowledge_v1.7.1.json`
- `knowledge/releases/ACLM_Tire_Knowledge_v1.7.1_validation.json`
- `tests/v0102_250f_taxonomy.test.js`
- `tests/canonical_cutoff_packs.test.js`
- `artifacts/canonical_packs/ACLM_Porsche_917_K_TirePack.zip`
- `artifacts/canonical_packs/ACLM_Maserati_250F_6_cylinder_TirePack.zip`
- `docs/917K_LIVE_TEST_CARD_v0102.md`

## Tests run and results

- Focused taxonomy, canonical-pack, and post-run-analyzer suite: **10 passed, 0 failed**.
- Complete Node test suite: **59 passed, 0 failed, 0 skipped**.
- Browser generation validation passed for the 917K and 250F packs.
- Both packs contain 19 files, `tyres.ini VERSION=10`, CSP Thermal V2, extended-2 metadata, provenance, pressure reports, and active/generated identity metadata.
- The current knowledge package embedded-content SHA-256 was independently recomputed and matched.

## 917K canonical status

- Clean snapshot: `research_staging/clean_kunos_hosts/ks_porsche_917_k_clean_physics.zip`
- Snapshot SHA-256: `4d42e32400cd6f521c387826f3802c203600dac87fa89c6898d728b37cf23034`
- Profile: Porsche 917K, 1970, CLS035, FAM035, bias/cross-ply, supplier General / unknown.
- Output: one dry endurance compound named `Dry Endurance` (`D`).
- Canonical pack: `artifacts/canonical_packs/ACLM_Porsche_917_K_TirePack.zip`
- Pack SHA-256: `74fd82729ee2f2c250f03e6c7e7ee3667f9084ca15916a5e88ba731458cec963`
- Live test card: `docs/917K_LIVE_TEST_CARD_v0102.md`
- No Firestone or Goodyear supplier was assigned universally.

## 250F taxonomy and fixture status

- New stable class: **CLS102 — 1954-58 Formula 1 / Grand Prix**.
- Class maps to FAM002 and requires treaded bias/cross-ply construction.
- CLS002 and all other pre-existing class records remain byte-for-byte logically unchanged; no IDs were renumbered.
- The class does not define Pirelli, Dunlop, or any other universal supplier.
- The class explicitly prevents interpreting the 1957 fixture as Dunlop R5/FAM003.
- Curated fixture: CAR022, Maserati 250F 6C, 1957 works/lightweight.
- Fixture resolution: CLS102, FAM002, treaded bias/cross-ply, Pirelli through vehicle/year evidence only.
- Fixture evidence state: `PARTIALLY SOURCED`; supplier evidence is directly sourced, while undocumented pressure, temperature, loaded-radius, and exact-rate values remain engineering controls/provisional outputs.
- Clean snapshot: `research_staging/clean_kunos_hosts/ks_maserati_250f_6cyl_clean_physics.zip`
- Snapshot SHA-256: `47a6c184b1ca1a7639a2babb794b9ebddf370af12dde1209d2fad57418d21cb7`
- Output: one baseline compound named `Period Treaded Race` (`R`).
- Canonical pack: `artifacts/canonical_packs/ACLM_Maserati_250F_6_cylinder_TirePack.zip`
- Pack SHA-256: `0fa34b08f0f3c67f4f2fdf5542cddb42bbc7b348c14c7126b94d8a695456f10a`

## Knowledge v1.7.1 status

- Release SHA-256: `ca0b0fcf498e8f4714354f22ffef269cca1c813b3b19eda8eb9d1b77f0dd8954`
- Content SHA-256: `14f92adf97786556ac3472f05496a469bdfd0713b2b49fd4c146e529912ff14f`
- Counts: 85 families, 102 classes, 22 vehicle profiles, 149 sources, 184 measurements.
- Numeric collections frozen unchanged from v1.7.0: families, generator priors, measurements, and scaling rules.

## Post-run analyzer status

The existing post-run analyzer remains implemented and its regression tests pass. No live 917K calibration result has yet been ingested.

## Protocol, dossier, audit, and research status

- The 917K live engineering-control protocol is now fixed in the test card.
- No 917K live thermal calibration has started.
- No new historical research sweep, dossier expansion, or numeric calibration audit was started in this pass.
- The prior GT40 analysis was not repeated.

## First unfinished item

Capture one controlled Porsche 917K live telemetry session exactly as specified by `docs/917K_LIVE_TEST_CARD_v0102.md`, then run the existing post-run analyzer against the CSV and matching run manifest. Treat the result as an engineering-control observation; do not fit or alter thermal, wear, pressure, or production knowledge numeric parameters from one run.

## Exact next command after capture

```powershell
node tools/analyze_post_run_telemetry.js --csv '<917K telemetry CSV>' --manifest '<matching .run-manifest.json>' --out artifacts/917k/live_1x
```

## Blockers

- The next step requires a new human-driven Assetto Corsa telemetry capture.
- No code or taxonomy blocker remains for the 917K or 250F canonical fixtures.

## Guardrails preserved

- **NO THERMAL COEFFICIENT CHANGES.**
- **NO WEAR CHANGES.**
- **NO PRESSURE COEFFICIENT CHANGES.**
- **NO PRODUCTION TIRE-KNOWLEDGE NUMERIC PRIOR CHANGES.**
- Preserve raw telemetry and distinguish requested conditions from observed AC conditions.
- Do not infer universal suppliers from vehicle-specific evidence.
- Do not start live thermal calibration until the controlled 917K session exists.
