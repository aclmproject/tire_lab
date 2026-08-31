# ACLM Historical Tire Lab v0.10.2 — engineering report

v0.10.2 is a software-integrity corrective release. It does not alter Thermal V2 coefficients, wear curves, `VIRTUALKM`, or production Tire Knowledge v1.7.0 numeric priors.

The native logger now identifies the physics actually installed for the live AC car. At session start it resolves the Assetto Corsa root, hashes loose `data/tyres.ini`, `car.ini`, and referenced wear/temperature LUTs, matches AC's observed compound string to the installed compound section, and records active `PRESSURE_STATIC` and `PRESSURE_IDEAL`. The sidecar preserves four distinct layers: generated configuration, active installed physics, observed AC condition, and observed runtime state.

If generated and active `tyres.ini` hashes disagree, the sidecar reports `STALE/HASH_MISMATCH`. The installed hash, observed compound, actual track, and recorded starting state become authoritative for the run; the generated handoff remains nested provenance. Packed `data.acd` remains explicitly unresolved rather than falsely hash-identified.

Validation now separates a short pressure screen (lap 1 warm-up, complete laps 2–5) from extended thermal observation. The extended engineering screen uses rolling complete laps and requires every-wheel slopes below 0.10 °C/lap core and 0.03 psi/lap pressure. These are signal-stability thresholds, not historical targets.

The 198.576 km GT40 Monza run demonstrated why the separation matters: late axle pressure closure passed, but final core slopes did not. Its thermal status remains unresolved. Its substantial AC wear signal is preserved as `GT40-LONG-RUN-WEAR-FIXTURE-001` with a **STORE, DO NOT FIT** decision.

Focused Porsche 917K research resolves the ACLM selection to CLS035/FAM035 and leaves supplier unknown. The clean Kunos host is installed but exposes only `data.acd`; generation is intentionally blocked until Content Manager creates a loose `data` folder. No mod-host substitution or approximate profile generation was accepted.
