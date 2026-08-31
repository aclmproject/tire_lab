# ACLM Historical Tire Lab v0.10.0 — Milestone 5 Engineering Report

Date: 2026-08-29  
Baseline: application v0.9.2 at commit `fbf502d`  
Production knowledge: v1.7.0, SHA-256 `9a74deaec72b09b92ec08b79abcf1f9f7db139402e13e6d80feddfae117f9200`  
Research status: **PARTIAL — CONTINUATION REQUIRED**. Milestone 5 closes an engineering architecture milestone; it does not complete the wider research corpus.

## A. Profile state

The root cause of the GT40 regression was state ownership: the construction control could retain an earlier/default `radial` value after the user resolved a historical family whose intended construction differed. Construction therefore existed as an unqualified UI string instead of evidence-bearing historical state.

`profile_state.js` now owns construction as `{value, provenance, sourceIds, confidence, reason}`. Supported provenance is `FAMILY_DEFAULT`, `DIRECT_HISTORICAL_EVIDENCE`, `AUTO_CLASSIFICATION`, `IMPORTED_EXISTING_PHYSICS`, `USER_EXPLICIT_OVERRIDE`, and `UNKNOWN_FALLBACK`. Family/class resolution re-evaluates dependent construction. A stale or unsupported fallback blocks generation; a deliberate user override remains visible and produces a conflict warning instead of being silently normalized.

The generated `ACLM_PROFILE_STATE.json`, family audit, thermal calibration manifest and engineering-provenance manifest all carry the resolved construction and its provenance. The pre-generation coherence gate checks year, family, class, construction, supplier/compound context, geometry presence and Thermal V2 construction.

GT40 before/after:

| State | Construction | Result |
|---|---:|---|
| Old contaminated run | Radial inherited silently | Pressure data retained only as an architecture regression; thermal/carcass evidence excluded from fitting |
| v0.10.0 FAM022 fixture | Bias/cross-ply, `DIRECT_HISTORICAL_EVIDENCE`, `ENG-EV-GT40-0001` | Coherent; CSP V2 and vanilla generation pass |
| Deliberate radial override | Radial, `USER_EXPLICIT_OVERRIDE` | Historical conflict shown; never masquerades as family default |

The 85-family audit is in `docs/FAMILY_CONSTRUCTION_AUDIT_v0100.json`. The FAM022 correction is intentionally application-state scoped; production Knowledge v1.7.0 still preserves the broader `mixed` family evidence pending supplier/car normalization.

## B. Pressure

### Old architecture

The old first-order solver effectively used the compound performance-curve optimum as the gas-law hot target:

`P_cold_abs = P_ideal_abs × T_cold / T_performance_optimum`

It assumed constant volume without reporting the assumption and did not distinguish tread optimum from contained-air temperature. That made physically different temperatures appear interchangeable.

### New architecture

The v0.10.0 foundation is:

`P2_abs = P1_abs × (T2_air / T1_air) × (V1 / V2)`

Temperatures are Kelvin and pressures are absolute. Gauge pressure is converted using 14.6959 psi atmospheric reference. The model distinguishes:

- `PRESSURE_STATIC`: generated AC initial/reference-pressure channel;
- `PRESSURE_IDEAL`: AC grip-optimum pressure target;
- recommended setup cold pressure: a reference-duty engineering output;
- contained-air cold/hot temperature: the gas-law thermal state;
- compound performance optimum: a tread/grip curve state, never silently reused as cavity temperature;
- hot/cold internal-volume ratio and provenance.

Unknown volume growth is reported as ratio `1.0`, provenance `UNKNOWN_ASSUMED_UNITY`, and low confidence. No universal racing-tire growth coefficient was invented. An explicit or later telemetry-calibrated ratio can replace it without changing the equation.

The contained-air estimate is separate from surface, carcass and compound optimum temperatures. FAM023 uses the controlled Escort pressure A/B as a reference-duty contained-air/core proxy. Other families use a bounded screening estimate driven by load density, internal-volume scale, duty and construction, with ±12 °C uncertainty unless stronger evidence exists. The bias/radial cavity-temperature adjustment is a low-confidence construction prior, not a production historical truth.

AC pressure parameters remain explicit implementation inputs. `PRESSURE_TEMPERATURE_GAIN`, `PRESSURE_SPRING_GAIN`, `PRESSURE_FLEX_GAIN`, `PRESSURE_D_GAIN`, and `PRESSURE_RR_GAIN` are not relabelled as ideal-gas coefficients. Their exact simulator semantics require telemetry closure.

Pressure closure is `PASS` at absolute hot error ≤0.5 psi, `REVIEW` above 0.5 and ≤1.5 psi, and `FAIL` above 1.5 psi.

Escort regression:

- old generated hot result: FL 25.4, FR 23.6, RL 25.1, RR 23.9 psi against ~27 psi ideal: **FAIL**;
- same-tire corrected cold A/B: 22/23/22/23 psi and ~26.6–27.5 psi hot: successful telemetry closure;
- current static reference fixture: 22.54 psi front and 22.49 psi rear, ~61.8/62.3 °C contained-air estimate, ratio 1.0 assumed-unity, predicted 27 psi hot;
- policy: the successful track-side left/right values are not hard-coded globally.

GT40 regression:

- old ~21.3 psi reference, 28 psi ideal and ~23.1–24.7 psi observed hot is **FAIL**;
- the pressure regression remains useful;
- the old thermal/carcass evidence is construction-contaminated and cannot tune FAM022;
- the fresh bias fixture recommends 24.04 psi front / 24.15 psi rear at the reference duty and reports ±12 °C contained-air uncertainty.

## C. Thermal

The CSP Thermal V2 architecture is preserved. No global temperature multiplier, global `FRICTION_K` increase, or arbitrary surface-to-core multiplier was added.

Flex/hysteresis energy remains a carcass/shoulder pathway; slip/yaw work remains a tread/surface pathway. Surface, carcass, core/cavity proxy and compound optimum remain distinct observables. Correct construction and corrected pressure can indirectly alter generated thermal behavior, which is intended. The core coupled network (`SURFACE_TO_CARCASS`, `CARCASS_TO_SURFACE`, `CARCASS_TO_CORE`, `CORE_TO_CARCASS`, `CORE_TO_AMBIENT`, `SURFACE_TO_AMBIENT`, `COOL_FACTOR`, `CARCASS_ROLLING_K`) was not globally retuned.

This direction is consistent with the official CSP [Tyre Physics](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Physics) and [Tyre Thermal Models](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Thermal-Models) architecture. Those documents support the CSP output structure; they do not establish historical family coefficients or the Kunos pressure-parameter meanings claimed by neither this report nor the solver.

## D. Wear

Legacy `lifeKm` mixed observed stints, competitive life, service endurance, abrasion evidence and generator priors. Treating every value as the same grip-life target silently changed historical meaning.

The migration layer now supports `observedStintKm`, `competitiveLifeKm`, `serviceLifeKm`, `abrasionLifeKm`, `lifeRangeKm`, `lifeDefinition`, `lifeConfidence`, `lifeBasis`, and `sourceRefs`. Missing values remain null. BRM tread-abrasion/service evidence is not re-labelled competitive life. FAM023 130 km remains `PROVISIONAL_GENERATOR_PRIOR`.

The AC implementation layer is separately documented:

- historical real distance is not AC `VIRTUALKM`;
- `VIRTUALKM` is a load/stress-sensitive exposure coordinate;
- `WEAR_CURVE` maps that coordinate to AC grip health, not physical tread depth;
- AC health is not automatically historical competitive life.

Threshold inversion is interpolated. Reports include plateau end, 100%, 99.5%, 99%, 98%, 97%, 95%, 90%, 80% and terminal/failure where present. Plateau and multiple-crossing ambiguity are retained.

The reference-duty architecture supports contact pressure/load, local slip work, slip ratio, slip angle, temperature, construction, compound, driven axle, geometry and duty. It is explicitly `CALIBRATABLE_ARCHITECTURE_NOT_HISTORICALLY_FITTED`. No coefficients were fitted from the BRM incident/abuse run.

## E. Telemetry

Logger schema 1.2 retains raw IEEE-754 wear values and separates:

1. `LOGGER_CUMULATIVE_DISTANCE`
2. `SESSION_DISTANCE`
3. `STINT_DISTANCE`
4. `CURRENT_TIRE_SET_DISTANCE`

Session distance resets on car/track/session identity changes, stint distance resets on pit exit, and tire-set distance resets when tyre health increases consistently with a replacement. The validation workspace chooses current-tire-set distance first for wear and explicitly excludes persistent logger distance when a better basis is available.

The UI sends the current generated telemetry manifest when starting the native logger. Each CSV receives a same-basename `.manifest.json` sidecar. It preserves app/knowledge/logger versions, car/track, family/class, compound, construction/provenance, supplier, requested conditions, observed AC conditions, run multipliers when known, blankets, starting fuel, car/thermal versions, tire and LUT SHA-256 values, and distance semantics. Actual AC air/road readings come from shared memory and remain authoritative. Unavailable fields remain null.

The BRM 5x dataset remains `INCIDENT/ABUSE`; nominal multiplier exposure may be shown but cannot be divided into a direct historical lifespan. The controlled warm/cold BRM pair remains a coupled-network diagnostic and does not authorize a global thermal retune.

## F. Knowledge and evidence

Milestone 4’s 46 typed engineering records (10 measurements, 18 observations, 10 scaling rules, 8 methodology records) are staged for architecture/provenance use. All 17 M4 checkpoint hashes were reverified before implementation.

Production Knowledge remains v1.7.0 with no new historical numerical generator priors. Zero M4 numeric findings were promoted into production magic numbers. The FAM022 operational correction is identified as an application regression rule, not an undocumented knowledge rewrite. The current knowledge release hash is recorded above and in the release manifest.

## G. Tests, fixtures and release gates

Fresh static fixtures were generated from the current working tree for BRM/FAM003, Escort/FAM023, GT40/FAM022, late-1980s Group A/FAM008 and 1990s BPR GT/FAM010. Each includes geometry, pressure model/report, contained-air estimate, explicit volume assumption, Thermal V2 calculation, historical-life migration, CSP and vanilla INI artifacts, LUT references, package metadata and telemetry-sidecar compatibility fields.

Release gates:

- GT40 resolves FAM022 bias/cross-ply with direct-evidence provenance; no radial construction survives.
- Escort old baseline remains FAIL and corrected A/B remains closure evidence; the new recommendation moves materially toward the successful range without hard-coding track-side asymmetry.
- all five CSP V2 package audits pass;
- all five vanilla package audits pass;
- profile conflicts, pressure math, wear migration/interpolation, telemetry distance selection, integrity hashes and sidecar handoff have automated coverage;
- logger schema self-test reports 84 columns.

Final automated counts and the installer SHA-256 are recorded in the canonical release manifest after packaging. Passing static/software gates means the implementation is internally coherent; it is not a claim that every family has been historically validated on track.

## Remaining uncertainty

- hot/cold racing-tire cavity-volume growth;
- contained-air estimation outside controlled telemetry anchors;
- exact historical FAM023 optimum and pressure targets;
- supplier-, event- and construction-specific coefficients;
- historical wear-to-grip relationships and reference-duty coefficients;
- exact AC pressure-gain parameter semantics.

Next evidence should be a clean 1x current Escort run and a correctly generated cross-ply GT40 run. Broad new research belongs to Milestone 6.
