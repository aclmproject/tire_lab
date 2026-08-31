# Porsche 917K — short pressure screen

Status: ready after the clean Kunos `ks_porsche_917_k` data is unpacked and a current v0.10.2 CSP Thermal V2 TirePack is generated.

- Tire Lab class/family: CLS035 / FAM035
- Supplier: General / unknown
- Dry baseline: `Dry endurance specification`
- Driver: AI reference
- Track: Kunos Spa
- Warmers: OFF
- Tire wear: 1x
- Fuel consumption: OFF
- Damage: OFF
- Starting fuel: 60 L fixed; do not alter between runs
- Setup pressures: unchanged generated axle recommendations
- Lap 1: warm-up only
- Decision window: complete laps 2–5

Report starting pressure/core, per-lap pressure, late per-wheel pressure, axle means, and error from `PRESSURE_IDEAL`. Do not use this short screen to certify the historical thermal window.

Generation is deliberately blocked while the installed Kunos host exposes only `data.acd`; do not substitute a mod car or approximate profile.
