# BRM P48 CSP Thermal V2 A/B calibration — v0.9.1

## Decision

This controlled warm-start/cold-start pair is accepted as a calibration fixture. It does **not** authorize a global thermal retune, a BRM/Dunlop family retune, a `FRICTION_K` increase, a pressure change, or a shortened wear curve.

The implemented diagnostic is:

> surface heating present; low core equilibrium may be caused by the surface/carcass/core transfer and/or heat rejection balance rather than insufficient friction heat generation.

The warm-start and cold-start runs began about 34 °C apart but were within 0.9 °C per wheel after approximately 14 km. This independently demonstrates convergence toward the same natural equilibrium. Rear surface peaks of approximately 88–89 °C also show that substantial transient surface heating is present.

## Intended versus measured temperature

The current FAM003 reconstruction prior has a 76 °C center and 25 °C width prior. Its generated dry-race performance curve has an approximately 70.5–81.5 °C full-grip plateau and a broader approximately 62.3–92.3 °C working region. These are reconstruction priors, not direct period measurements.

Measured late-run cores were approximately 45.3–56.3 °C. Surface p95 values were approximately 59.1–73.0 °C, with the rear-left surface p95 inside the broad intended region. The mismatch must therefore be audited as a coupled network across:

- `SURFACE_TO_CARCASS`
- `CARCASS_TO_SURFACE`
- `CARCASS_TO_CORE`
- `CORE_TO_CARCASS`
- `CORE_TO_AMBIENT`
- `SURFACE_TO_AMBIENT`
- `COOL_FACTOR`
- `CARCASS_ROLLING_K`

No one coefficient is changed merely to raise a displayed temperature.

## Pressure audit

The current FAM003 prior generates `PRESSURE_IDEAL=26 psi` and an approximately 20.2 psi cold start. The observed stabilized pressures were approximately 22.2–23.5 psi.

- **A — evidence for 22–24 psi hot:** M132 gives 24 psi hot in the current Dunlop Vintage/R5 guide for an approximately 500 kg vehicle. This is useful manufacturer application evidence but is not a direct 1960 BRM race-pressure measurement.
- **B — cold pressure too low:** not currently supported. The approximately 20.2 psi generated start closely matches the 20 psi cold guidance in M131.
- **C — ideal pressure too high:** the leading pressure-only hypothesis. The 26 psi prior is above the 24 psi guide and the observed equilibrium.
- **D — thermal/pressure coupling wrong:** unresolved. The modest observed pressure rise and low core equilibrium could also expose a coupling error.

The approximately 27 psi values in M001–M020 and M120–M130 are controlled dimensional/homologation measurement pressures. They are not treated as historical racing-pressure targets. No pressure value is changed in v0.9.1.

## Wear audit

The 1× no-warmer run covered approximately 36.74 km. Every raw wear channel remained exactly 100 in the supplied CSV. This is recorded as “no resolvable change at source precision,” not proof of literally zero physical wear.

The native logger now writes IEEE-754 single-precision shared-memory values using round-trip formatting and records `aid_tire_rate`. The analyzer retains exact start/end text and numeric values and calculates raw delta from start plus real-km and virtual-km rates when their distance channels exist.

The third BRM run is definitively classified as **5× accelerated wear — incident/abuse test**, not a normal stint calibration. It covered approximately 32.43 km. FL and FR remained at 100.000000; RL ended at 99.693832 and RR at 99.822067. RL first left the plateau around 23.81 km and RR around 26.46 km. Several spins and high-slip incidents especially affected the driven rear tires, and degradation accelerated during the largest rear-slip/high-temperature events.

The application may report 32.43 km × 5 as approximately 162.2 km of nominal multiplier exposure, with plateau exposures of approximately 119 km RL and 132 km RR. Every such value is labeled:

> NOMINAL MULTIPLIER-NORMALIZED EXPOSURE — NOT A DIRECT HISTORICAL LIFE ESTIMATE.

For incident/abuse data the analyzer blocks grip-health-delta division by five. VIRTUALKM remains load/stress dependent, the wear curve contains an initial plateau, slip and thermal incidents are nonlinear, and grip changes can feed back into later slip. The result is provisionally encouraging for the intended `USE_LOAD=1` behavior, but it does not justify increasing or decreasing BRM wear.

The regression fixture preserves the distinction between normal-distance wear, load-sensitive wear, slip/abuse-sensitive wear, thermal-abuse wear and the final `WEAR_CURVE` grip mapping. Period durability evidence remains compatible with very low wear for contemporary reinforced-nylon Dunlop racing tires. The BRM wear LUT remains unchanged.

## Test-condition authority

The user-requested 26 °C air / 26 °C road condition and observed 26 °C air / 37 °C road condition are stored separately. Recorded AC physics telemetry is authoritative for the actual run. A requested/observed mismatch is retained as evidence and does not invalidate the run by itself.

## Next controlled test

No additional BRM wear test is requested. The next target is a freshly generated period-correct CSP Thermal V2 Ford Escort RS1600 tire: 1× wear, warmers off, clean human-driven 6–7 lap stint, unchanged generated pressures, fuel consumption off, damage off and controlled weather. Record actual air/road temperature, cold warm-up, surface and core temperatures, pressure equilibrium, I/M/O spread and the raw AC wear/grip-health signal. Review that clean 1× dataset before considering a 5× Escort test.
