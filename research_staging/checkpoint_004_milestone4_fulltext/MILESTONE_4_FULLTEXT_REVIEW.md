# MILESTONE 4 - TARGETED FULL-TEXT TECHNICAL REVIEW

Milestone status: **COMPLETE.** Overall research status: **PARTIAL - CONTINUATION REQUIRED.**

This checkpoint reviewed actual full text from 30 already-discovered public NASA/government technical reports and scans. It did not repeat abstract discovery, change production knowledge, modify application files, build, or release.

## Final counts

- Existing full-text candidates retrieved: 39.
- Full-text sources selected/attempted: 30.
- Full-text sources successfully reviewed: 30.
- Primary scans/government technical reports reviewed: 30.
- Abstract-only remaining across the unified reviewed corpus: 183.
- Access blocked in the selected public batch: 0.
- New direct measurements: 7.
- New source-derived measurement records: 3.
- New observations: 18.
- New scaling/methodology relationships: 10.
- New methodology records: 8.
- New historical constraints: 0.
- Formula-level findings: 10.
- Research targets newly partially supported: 8 general-mechanics targets.
- Research targets newly closed by sufficiently specific evidence: 0.
- Numerical generator priors changed: 0.
- Application files changed by M4: 0.
- Build/release made: NO.

## Evidence impact

Pressure architecture is now strongly supported for redesign, but numerical family fitting is not. The literature distinguishes contained-air temperature from tread/carcass sensors, shows pressure-load-deflection-footprint coupling, and shows construction-specific stiffness response. No reviewed source quantifies racing-tire hot volume growth.

Thermal architecture is supported as a layered network with separate flex/hysteresis and slip/friction heat paths. The literature makes a 20-30 C tread/core difference physically plausible in principle because local sensor locations and time constants differ, but it does not validate the contaminated GT40 run or an absolute FAM022/FAM023 optimum.

Wear architecture is supported around footprint pressure and slip velocity (energy exposure), with nonlinear separation between abrasion and performance. Historical competitive-life and AC-vKm calibration remain open.

## Top 10 findings most likely to affect the next Tire Lab engineering update

1. Cold-to-hot pressure must use contained/cavity-air temperature and absolute pressure; tread or carcass temperature is not an interchangeable gas temperature.
2. Volume growth is a real missing term, but this batch does not justify a racing-tire volume-growth coefficient.
3. Load, pressure, deflection, footprint and construction form a coupled system; the v0.9.2 one-dimensional closure prediction is architecturally inadequate.
4. Bias-ply, bias-belted and radial-belted tires have materially different pressure/load stiffness regressions, validating the severity of the stale-Radial GT40 bug.
5. Higher deflection increases sidewall/shoulder flex heat, directly supporting the corrected-pressure Escort interpretation.
6. Yaw/slip heat is concentrated nearer the tread surface, while cyclic flex heat is stronger in carcass/sidewall regions; Thermal V2 needs distinct paths and nodes.
7. Contained-air time constants can be much slower than tread transients; 20-27 minute equilibrium was measured in one road-tire study.
8. Wear architecture should integrate contact pressure times local slip velocity, then apply compound/construction/temperature response; distance alone is insufficient.
9. Physical tread loss and performance loss are nonlinear and observable-specific; neither is automatically competitive racing life or AC grip-health.
10. No reviewed source establishes FAM023 or FAM022 absolute historical temperature targets, so a global historic-tire thermal multiplier remains unjustified.

## Required implementation order (unchanged)

1. Fix construction state/provenance and cross-field validation.
2. Redesign pressure prediction around contained-air temperature, absolute pressure, volume correction, load and construction.
3. Regenerate tires and retest Escort plus correctly constructed GT40.
4. Reassess Thermal V2 transfer coefficients across multiple families.
5. Only then calibrate wear-energy-to-vKm and WEAR_CURVE behavior.

No production code is written in this checkpoint.
