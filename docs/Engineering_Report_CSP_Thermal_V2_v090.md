# ACLM Tire Lab v0.9.0 — CSP Thermal V2 engineering report

## Root cause

v0.8.2 treated three independent CSP mechanisms as one label. It emitted AC v10 tires and extended contact rays, but did not emit `[THERMAL_MODEL] VERSION=2` or `THERMAL2_*` carcass/core sections. Its Kunos thermal blocks also used nonzero `CORE_TRANSFER`, `INTERNAL_CORE_TRANSFER` and `ROLLING_K`, which current CSP V1/V2 documentation marks obsolete.

## Implementation

- `thermal_v2.js` is a deterministic, testable heat-pathway calculator and CSP/INI validator.
- `app.js` now emits required Kunos `THERMAL_*` sections plus matching `THERMAL2_*` sections for every compound in CSP mode. Vanilla mode retains the v0.8.2 Kunos path and does not enable V2.
- CSP mode emits `[THERMAL_MODEL] VERSION=2`, 2 lateral × 4 longitudinal rays per side, 60° maximum ray angle, low-speed doubling and smoothed load sensitivity.
- Imported `car.ini` is preserved byte-for-byte except its `[HEADER] VERSION` value becomes `extended-2`. Tire-only packs carry an explicit requirement warning.
- Every export includes `ACLM_THERMAL_V2_CALIBRATION.json` with inputs, estimates, coefficients, evidence confidence, rays and formula/prior provenance.
- Pressure solving, wear curves, historical families, reports, graphs, ZIP output, import and update/install behavior remain in place. Wear was not retuned.

## Physics reconstruction

Geometry is reconstructed as an elliptical torus from width, unloaded radius and rim radius. The calculator estimates sidewall height, internal volume, casing area, tread/material volume, mass and angular inertia. It then maps:

- sliding work to tread surface (`FRICTION_K`);
- rolling resistance/flex to tread and carcass (`SURFACE_ROLLING_K`, `CARCASS_ROLLING_K`);
- surface ↔ carcass ↔ core using bidirectional coefficients driven by area, volume, section height, construction, material and pressure;
- surface cooling with coupled `COOL_FACTOR × SURFACE_TO_AMBIENT` scaling from speed, area and thermal volume;
- brake/rim duty to core using imported disc geometry when present, otherwise a static-load braking prior;
- driven-axle work from imported drivetrain type, otherwise a neutral 0.5/0.5 prior.

Family construction/material evidence is used when explicit (for example the R5 nylon family); unresolved values remain named reconstruction priors. Evidence confidence is reported and never used as a hidden multiplier. `PERFORMANCE_CURVE` only maps grip versus temperature.

## BRM P48 / Dunlop R5 regression

Final inspected artifact: `ACLM_1960_BRM_P48_TirePack.zip`, generated from the imported-car fixture with FAM003 / CLS002 context.

| Parameter | v0.8.2 front | v0.8.2 rear | v0.9.0 front | v0.9.0 rear |
|---|---:|---:|---:|---:|
| `SURFACE_TRANSFER` | 0.010000 | 0.010000 | 1.021294 | 1.039875 |
| `PATCH_TRANSFER` | 0.000220 | 0.000220 | 0.001844 | 0.001886 |
| `FRICTION_K` | 0.034000 | 0.034000 | 0.013059 | 0.012916 |
| `CORE_TRANSFER` | 0.000140 | 0.000140 | 0 | 0 |
| `INTERNAL_CORE_TRANSFER` | 0.001100 | 0.001100 | 0 | 0 |
| `ROLLING_K` | 0.190000 | 0.190000 | 0 | 0 |
| `COOL_FACTOR` | 1.600 | 1.600 | 6.9729 | 6.9973 |
| `SURFACE_ROLLING_K` | 1.1020 | 1.1020 | 0.002068 | 0.002309 |
| `CARCASS_ROLLING_K` | absent | absent | 0.265877 | 0.265068 |
| `BRAKE_TO_CORE` | absent | absent | 0.0004100 | 0.0003128 |
| `SURFACE_TO_AMBIENT` | absent | absent | 0.071315 | 0.065961 |
| `SURFACE_TO_CARCASS` | absent | absent | 0.029470 | 0.030892 |
| `CARCASS_TO_SURFACE` | absent | absent | 0.457574 | 0.466026 |
| `CARCASS_TO_CORE` | absent | absent | 0.019719 | 0.016072 |
| `CORE_TO_CARCASS` | absent | absent | 0.0005822 | 0.0007143 |
| `CORE_TO_AMBIENT` | absent | absent | 0.0037818 | 0.0026970 |

The final ZIP passed: AC header 10; V2 selector; ray block; legacy and V2 front/rear pairs; zero obsolete controls; all referenced LUTs present; no duplicate/NaN/malformed INI values; two calibration records; and preserved extended-2 `car.ini`.

## Cross-era results

All five browser-generated cases passed application validation. Selected front/rear `FRICTION_K`, `CARCASS_ROLLING_K`, and `SURFACE_TO_AMBIENT` values were:

| Case | Front | Rear |
|---|---|---|
| 1960 narrow GP bias | .012945 / .264627 / .071315 | .012931 / .264417 / .065961 |
| 1978 GP slick transition | .011075 / .167468 / .071254 | .011115 / .165681 / .092949 |
| 1988 touring radial | .012253 / .132783 / .058149 | .011921 / .129228 / .058124 |
| 1993 GT endurance radial | .011561 / .109138 / .081021 | .011577 / .109459 / .089291 |
| 1996 high-power GT1 radial | .011383 / .107384 / .089291 | .011454 / .108437 / .090655 |

Differences arise continuously from geometry, load, construction, rolling resistance and duty inputs—not decade steps.

## Automated tests

The Node test suite covers real V2 architecture, numeric compound suffixes, zero obsolete controls, missing/malformed LUTs, car.ini preservation/validation, physical-input propagation, determinism, five cross-era inputs, vanilla isolation, and personal-path exclusion. Browser integration additionally covered the canonical BRM tire-only/full-car exports, three-compound suffixes and vanilla output.

## Authority and remaining uncertainty

Schema and parameter meanings follow the current official [CSP Tyre Thermal Models](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Thermal-Models), [CSP Tyre Physics](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Physics), and [extended-physics enabling](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Enabling-extended-physics) pages. Numeric thermal coefficients remain reconstruction priors. Telemetry must calibrate steady-state surface/carcass/core temperatures, braking contribution, speed cooling, lateral spread and pressure behavior by car/track/ambient before historical certification; wear calibration remains a later, separate pass.
