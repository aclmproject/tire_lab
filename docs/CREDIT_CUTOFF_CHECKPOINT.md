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

- Original taxonomy/canonical-pack cutoff: focused suite **10 passed, 0 failed**; complete Node suite **59 passed, 0 failed, 0 skipped**.
- Current Windows corrective validation with both canonical ZIPs present: complete Node suite **82 passed, 0 failed, 0 skipped**.
- Native logger self-test passed with 84 columns, IEEE-754 wear precision and four distinct distance bases. PowerShell manifest merge/identity tests passed.
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

The post-run analyzer keeps the canonical short-pressure window separate from later-lap and extended-thermal observations. Literal AC laps 2–5 remain preferred; a session-relative rebase is allowed only after pit start, fresh/coherent distances, hash/compound identity, explicit out-lap exclusion and five coherent full timed laps are proven. It reports both raw and relative lap mappings and fails unresolved rather than silently rebasing. Missing pressure stays null, and distance bases are explicitly separated.

## Protocol, dossier, audit, and research status

- The 917K AI-reference baseline A, staggered B, 30F/35R C and independent C2 screens are complete on matching active/generated physics.
- Baseline A is `FAIL`; B, C and C2 are `REVIEW`. C2 safely maps raw AC laps 9–12 to session-relative laps 2–5 and repeats C within 0.023 psi.
- 30F/35R is reproducibly high on the loaded left tires. The retained setup-only whole-grid inference is 29F/34R; no further 917K driving is requested.
- The short screen does not start or certify historical thermal calibration; thermal remains unresolved and wear is store-only.
- The overnight M0–M5 and weakness corpus were inventoried. Accepted evidence remains staged; abstract-only, incomplete and temporally unsafe material remains deferred/quarantined. No Knowledge or numeric calibration promotion was made.
- The prior GT40 analysis was not repeated.

## First unfinished item

After the software-only telemetry correction is fully tested, pushed and packaged, the next live test is the first canonical 250F 24F/24R baseline in `docs/MASERATI_250F_LIVE_TEST_CARD_v0102.md`. Exit AC completely and launch a fresh session. No driving is admissible until the logger reports `physicsHashMatch=true`. Do not request another 917K run now.

## Blockers

- No physics or taxonomy blocker remains. Driving is blocked until the rebuilt installed logger reports `physicsHashMatch=true`.

## Guardrails preserved

- **NO THERMAL COEFFICIENT CHANGES.**
- **NO WEAR CHANGES.**
- **NO PRESSURE COEFFICIENT CHANGES.**
- **NO PRODUCTION TIRE-KNOWLEDGE NUMERIC PRIOR CHANGES.**
- Preserve raw telemetry and distinguish requested conditions from observed AC conditions.
- Do not infer universal suppliers from vehicle-specific evidence.
- Do not promote either short pressure screen into live historical thermal calibration.
- Preserve the four-host cross-ply program: Maserati 250F + Ford GT40 Mk II + Porsche 917K + Ford Escort RS1600.
