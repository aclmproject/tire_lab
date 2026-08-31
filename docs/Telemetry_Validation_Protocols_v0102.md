# Telemetry validation protocols — v0.10.2

## Short pressure screen

Purpose: screen setup pressure closure without claiming thermal stabilization.

- Lap 1 is warm-up and is excluded from the decision window.
- Use complete laps 2–5 for the initial pressure comparison.
- Report every wheel and both axle means against `PRESSURE_IDEAL`.
- Per-wheel guidance: within ±0.5 psi is `PASS`, ±0.5–1.5 psi is `REVIEW`, beyond ±1.5 psi is `FAIL`.
- The short screen cannot certify a historical temperature window or Thermal V2 equilibrium.

## Extended thermal observation

Purpose: determine whether pressure and core temperature have approached a repeatable engineering plateau before historical interpretation.

- Use rolling complete-lap windows and retain per-wheel core, surface, pressure, and wear channels.
- The current engineering stability screen is less than 0.10 °C/lap core slope and less than 0.03 psi/lap pressure slope at every wheel.
- These thresholds indicate signal stability only. They are not historical pass/fail targets.
- Preserve transient tread heating separately from core equilibrium. Low mean core temperature plus meaningful surface peaks does not, by itself, prove insufficient `FRICTION_K`.

## GT40 long-run application

The 1966 GT40 Mk II Monza 1966 run contains complete laps 1–33 and 198.576 km on the current tire set. Laps 30–33 closed pressure by axle (front −0.341 psi, rear +0.159 psi against 28 psi), while the final ten-lap core slopes remained approximately 0.149–0.202 °C/lap. Pressure slopes remained under 0.026 psi/lap.

Result: pressure stability screen passes, core stability screen does not. Classification is **NOT STABILIZED** and historical thermal status remains **UNRESOLVED**. No thermal or wear coefficient change is authorized.

The corrected post-run manifest must be used for identity. It records active installed `tyres.ini` SHA-256 `ed0af55967e196b860e801d8367a2c65ea1e37a6e2c1f1d884636f8fcfdd781d`; stale generated handoff hash `f1b2de1eebda16f1ae0eb7a94a298749fcdac18c98d44b178359c3e5835df23f` is provenance only.
