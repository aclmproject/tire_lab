# CSP Thermal V2 architecture — Tire Lab v0.9.0

Tire Lab keeps the three CSP concepts separate:

- `car.ini`: `[HEADER] VERSION=extended-2` enables car extended physics.
- `tyres.ini`: `[_EXTENSION]` enables extended contact rays.
- `tyres.ini`: `[THERMAL_MODEL] VERSION=2` plus matching `THERMAL2_FRONT/REAR[_n]` sections enables CSP Thermal Model V2.

The V2 calculator reconstructs an elliptical torus from width, unloaded radius and rim radius. It estimates internal volume, casing area, material volume, tire mass and angular inertia, then maps heat through documented pathways: sliding to surface; rolling/flex to tread and carcass; bidirectional surface/carcass/core transfer; surface and core cooling; and brake-to-core transfer. Inputs include RATE, FZ0, expected static load, pressure, rolling resistance, sidewall stiffness, construction, tread, driven axle duty, brake exposure, speed/class prior and evidence confidence. Confidence is reported but never used as a hidden physics multiplier.

`COOL_FACTOR` and `SURFACE_TO_AMBIENT` are solved as one coupled speed/area/volume cooling path. `PERFORMANCE_CURVE` remains grip response versus temperature and is not used to force warm-up. Wear curves are not retuned in this release.

V1/V2-obsolete `CORE_TRANSFER`, `INTERNAL_CORE_TRANSFER` and `ROLLING_K` remain present at zero for compatibility. Compound sections use the same numeric suffix as the corresponding AC tire pair: no suffix for index 0, then `_1`, `_2`, and so on.

The canonical ray prior is 2 lateral and 4 longitudinal rays per side, 60° maximum angle, low-speed ray doubling enabled, and smoothed load sensitivity. The official CSP Tyre Physics example establishes the 4-longitudinal/60° baseline; two lateral rays add useful V2 side-to-side thermal resolution while remaining below the more expensive 3-lateral V4 example.

Sources:

- [Official CSP Tyre Thermal Models](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Thermal-Models)
- [Official CSP Tyre Physics](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Physics)
- [Official CSP Enabling extended physics](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Enabling-extended-physics)

All numeric coefficients remain documented reconstruction priors pending car/track telemetry calibration.
