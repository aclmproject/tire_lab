# Escort RS1600 pressure/compliance calibration gate — v0.9.2

The Brands Hatch GP baseline used the fresh FAM023/CLS022 CSP Thermal V2 tire and its untouched generated pressures. Stabilized pressure was approximately 2 psi below `PRESSURE_IDEAL` on the left and 3 psi below on the right. Every wheel therefore fails the new pressure-closure gate (absolute error above 1.5 psi).

The simultaneous report of excessive carcass compliance and near rollover/tripping is retained as evidence, not converted directly into a coefficient change. Pressure and compliance remain coupled across `RATE`, `FLEX`, `FLEX_GAIN`, `PRESSURE_STATIC`, `PRESSURE_IDEAL`, `PRESSURE_SPRING_GAIN`, `PRESSURE_FLEX_GAIN` and `PRESSURE_D_GAIN`.

## Generator audit

The existing automatic `PRESSURE_STATIC` solve is not a fixed ideal-minus-offset rule. It is a first-order constant-volume ideal-gas prediction from cold reference temperature to the compound thermal target. That is now reported honestly for every generated axle/compound as:

- generated static and ideal pressure;
- predicted hot rise and stabilized pressure;
- predicted closure error and classification;
- tire dimensions and estimated internal volume, load, construction, compound and reference duty;
- factors still awaiting calibration rather than silently being treated as solved.

The current predictor does not yet close dimensional growth, carcass compliance, flex/rolling heat or track duty into the pressure-rise equation. It is not retuned in this release.

## Same-tire A/B

Run A is the untouched baseline. Run B must use the identical generated tire and change setup cold pressure only: +2 psi FL/RL and +3 psi FR/RR. Compare stabilized pressure, core and I/M/O temperatures, load, wheel slip, lateral acceleration, steering response, wear signal and subjective compliance/direction-change feedback. Standard AC shared memory does not expose a dedicated per-wheel slip-angle array, so that channel is used only when another verified source supplies it.

If run B reaches the generated ideal and substantially fixes the excessive compliance, prioritize the cold-pressure/pressure-rise calculation. If it does not, continue the carcass and pressure-gain audit. Do not raise pressures arbitrarily above historical evidence.

An untouched baseline with severe rollover/tripping is flagged `GENERATED BASELINE UNSAFE FOR CONTINUED HIGH-SPEED VALIDATION`; a short diagnostic run is sufficient. No global, FAM023, thermal, grip, wear or compliance coefficient changes are made in v0.9.2.
