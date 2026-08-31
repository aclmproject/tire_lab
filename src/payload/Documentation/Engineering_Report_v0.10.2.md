# ACLM Historical Tire Lab v0.10.2 — engineering report

v0.10.2 is a software-integrity corrective release. It does not alter Thermal V2 coefficients, wear curves, `VIRTUALKM`, or production Tire Knowledge v1.7.0 numeric priors.

The native logger now hashes the active installed loose physics and referenced tire LUTs, separates generated configuration from active installed physics and observed runtime state, and marks stale handoffs `STALE/HASH_MISMATCH`. Active hashes, AC's observed compound, actual track, and recorded starting state are authoritative for the run; generated fields remain provenance.

Validation now separates a short pressure screen (lap 1 warm-up, complete laps 2–5) from extended thermal observation. Engineering slope thresholds indicate stability only and are not historical targets.

The 198.576 km GT40 run is pressure-stable but not core-stable. Its thermal and wear calibration remain unresolved, and its wear trace is retained as **STORE, DO NOT FIT** evidence.

Focused 1970 Porsche 917K research resolves CLS035/FAM035 and leaves supplier unknown. Generation waits for the clean Kunos host's `data.acd` to be unpacked; no mod or approximate-profile substitute is used.
