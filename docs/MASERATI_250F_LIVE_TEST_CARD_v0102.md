# Maserati 250F canonical baseline — live test card

Purpose: collect the first controlled AI-reference pressure screen for the canonical v0.10.2 Maserati 250F TirePack. This is a simulator engineering-control observation. It does not certify a historical pressure or temperature window.

## Stop gate — complete before driving

- Install the canonical TirePack into the Kunos `ks_maserati_250f_6c` car, not into Tire Lab.
- In Tire Lab, import the car after installation and verify the embedded telemetry identity.
- Logger status must state **Active installed physics hash MATCH** and the manifest must record `physicsHashMatch=true`.
- If the UI reports `STALE`, `HASH_MISMATCH`, an unresolved active hash, or any car other than `ks_maserati_250f_6c`, stop. Do not drive and do not reinterpret the result.

## Canonical identity

| Field | Required value |
|---|---|
| Application / Knowledge | v0.10.2 / v1.7.1 |
| Car | Kunos Maserati 250F 6 cylinder (`ks_maserati_250f_6c`) |
| Historical profile | 1957, CLS102, FAM002, treaded bias/cross-ply |
| Supplier scope | Pirelli for this vehicle/year fixture only; not universal |
| Compound | `Period Treaded Race (R)`; internal slot `medium` |
| Canonical TirePack SHA-256 | `0fa34b08f0f3c67f4f2fdf5542cddb42bbc7b348c14c7126b94d8a695456f10a` |
| Generated `PRESSURE_STATIC` | 23.7 psi front / 23.9 psi rear |
| Continuous setup recommendation | 23.73 psi front / 23.86 psi rear |
| Achievable setup selection | 24 psi LF / 24 psi RF / 24 psi LR / 24 psi RR |
| Provisional `PRESSURE_IDEAL` | 28 psi front / 28 psi rear |

The active `tyres.ini` SHA-256 is learned from the installed canonical pack and recorded by the logger. Do not copy a hash from another host or run.

## Tire Lab fields

- Calibration reference driver: `AI reference` (`AI_REFERENCE`). This is set in Tire Lab, not in Content Manager.
- Pressure A/B role: `baseline`.
- TirePack ID: `Maserati-250F-v0102-canonical`.
- Intended pressure corrections: 0 / 0 / 0 / 0 psi.
- Warmers requested: OFF.
- Tire wear request: 1×.
- Requested air / road: 26 °C / 26 °C; observed AC values remain authoritative.

## Assetto Corsa / Content Manager session

- Exit Assetto Corsa completely before setup. Install the TirePack into the car through Content Manager, then launch a **fresh AC session** so the AC lap counter and session state reset.
- Import the newly installed `ks_maserati_250f_6c` car into Tire Lab before starting the logger.
- Track: Kunos Monza 1966 (`ks_monza66`).
- Driver: AI control for the entire recorded stint.
- Setup: 24 psi at all four corners.
- Tire blankets/warmers: OFF.
- Fuel: start at 30 L; fuel consumption OFF.
- Damage: OFF.
- Tire wear: 1×.
- Conditions: dry and fixed. Do not change setup or session controls after logging starts.
- Logger: 10 Hz. Start it in the pits before releasing AI control. If logger status says the AC session already appears beyond lap 1, exit AC and start a fresh session.

## Laps and decision window

Run one out-lap, six complete timed laps, then return to the pits. Lap 1 is warm-up only. Complete laps 2–5 are the canonical pressure decision window; laps 6–7 are retained as later observation and must not replace the short-screen result.

After stopping in the pits, click **Stop & flush CSV**, then **Import & analyze latest log**. Preserve both CSV and matching manifest.

## Decision rules

- Per wheel, absolute hot error at or below 0.5 psi is `PASS`; above 0.5 through 1.5 psi is `REVIEW`; above 1.5 psi is `FAIL`.
- Report every wheel plus front- and rear-axle averages.
- Observed starting pressure, air, road, fuel, aids, temperatures and wear are authoritative; requested fields are intent only.
- Do not run a corrected B screen until the baseline is reviewed and its intended correction is explicitly recorded.
- Do not change pressure coefficients, Thermal V2 coefficients, wear curves, or production knowledge priors from this single screen.
- Thermal and wear channels are **STORE, DO NOT FIT**. The short screen cannot prove thermal stabilization or historical accuracy.
