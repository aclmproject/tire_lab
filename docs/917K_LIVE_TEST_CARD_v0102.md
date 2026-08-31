# Porsche 917K canonical baseline — live test card

## Identity gate

- App: ACLM Historical Tire Lab v0.10.2
- Car: Kunos `ks_porsche_917_k`
- TirePack: `artifacts/canonical_packs/ACLM_Porsche_917_K_TirePack.zip`
- TirePack SHA-256: `74fd82729ee2f2c250f03e6c7e7ee3667f9084ca15916a5e88ba731458cec963`
- Profile: 1970 / CLS035 / FAM035 / bias-cross-ply / General / unknown
- Compound: Dry Endurance (`D`)
- Required physics identity: `car.ini` `VERSION=extended-2`; `tyres.ini` `VERSION=10`; CSP Thermal V2

Do not start analysis unless the logger reports an active/generated physics hash match.

## Controlled session

- Track: Kunos Monza 1966, road-course layout. This is an engineering control, not a claim of exact event fitment.
- Session: Practice; one out lap, six clean timed laps, one in lap.
- Driver: human.
- Tire wear: 1x.
- Fuel consumption: OFF.
- Damage: OFF.
- Tire blankets/warmers: OFF.
- Requested air: 26 °C.
- Requested road: 26 °C; record the AC-observed road temperature separately and treat telemetry as authoritative.
- Track grip/weather: fixed and recorded; no time progression.
- Setup: otherwise unchanged from the Kunos baseline.
- Cold pressure selections: 28 psi LF/RF and 33 psi LR/RR, the nearest imported 1 psi setup-grid values to the generated 27.7/33.5 psi reference.
- Logger: ACLM native logger at 10 Hz, started before leaving the pits and stopped only after the in lap.

## Driving and contamination rules

- Build pace progressively for the out lap; do not weave, spin the driven tires, lock brakes, cut the course or deliberately scrub the tread.
- Use representative race pace for the six timed laps.
- Mark every spin, lock-up, off-track, contact, pit reset, teleport, pause or setup change. Any such lap is incident/contaminated, not clean calibration evidence.
- Do not change tire pressures, compound, fuel, weather or assists during the run.

## Required review outputs

- Actual air/road temperature and session settings.
- Identity hashes and manifest match status.
- Complete/partial laps and clean/incident classification.
- Per-wheel starting, peak and late-stint core/surface temperatures; I/M/O spread where available.
- Per-wheel starting and stabilized pressure, including error from 32 psi front / 38 psi rear generated ideal values. These are provisional engineering outputs, not historical pressure evidence.
- Per-wheel loads, slip, high-slip events and wear/grip-health at full float precision.
- Distance bases: logger cumulative, session, stint and current tire set.

## Decision rule

This is the first 1x clean baseline only. Report the observed closure and contamination state; do not change thermal, wear or pressure coefficients from this run alone. Do not schedule accelerated-wear testing until the clean 1x CSV and sidecar manifest have been reviewed.
