# Porsche 917K — short pressure screen

Status: baseline A and pressure-corrected B completed on the clean unpacked Kunos host. Corrected B improved the canonical laps 2–5 result from `FAIL` to `REVIEW`; retain the TirePack and hold physics.

- Tire Lab class/family: CLS035 / FAM035
- Active tire SHA-256: `2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4`
- Supplier: General / unknown
- Dry baseline: `Dry Endurance (D)` / internal `medium`
- Driver metadata: `AI_REFERENCE`
- Track: Kunos `ks_monza66`
- Warmers: OFF
- Tire wear request: 1×
- Fuel consumption: OFF; observed fuel remained 30 L
- Damage: OFF
- Lap 1: warm-up only
- Decision window: complete laps 2–5

The corrected run recorded 32.365 / 32.529 psi front and 38.398 / 38.616 psi rear in the decision window against 32 / 38 psi ideals. LF/LR passed; RF/RR were REVIEW by +0.529 / +0.616 psi.

Do not repeat the baseline. Do not use this short screen to certify the historical thermal window. Before one final pressure confirmation, use a build that records A/B role and intended per-corner pressure adjustments in the sidecar; v0.10.2 preserved observed starts but not those intent fields.
