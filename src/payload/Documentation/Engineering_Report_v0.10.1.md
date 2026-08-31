# ACLM Historical Tire Lab v0.10.1 — Engineering Report

## Release status and scope

v0.10.1 is a focused software corrective release for the next live Ford Escort RS1600 regression. It corrects pressure-state terminology, setup-control quantization, profile coherence, supplier provenance, and generated/runtime telemetry-manifest continuity. It does not claim historical tire calibration success.

The following production calibration layers are frozen from v0.10.0: global CSP Thermal V2 coefficients, FAM023 historical temperature optimum, wear curves and scaling, VIRTUALKM/reference-duty coefficients, and Tire Knowledge v1.7.0 numerical priors.

## Pressure

### Why 22.5 psi became approximately 23.0 psi

The Kunos Escort setup controls define MIN=15 psi, MAX=50 psi, and STEP=1 psi for all four corners. A continuous 22.5 psi recommendation cannot be selected on that setup grid. Nearest-grid quantization produces 23 psi, matching the observed start near 23.0 psi. The quantizer is general: it accepts arbitrary MIN, MAX, and STEP values and clips to bounds.

v0.10.1 reports three different quantities instead of conflating them:

- continuous calculated cold pressure;
- setup-achievable pressure after MIN/MAX/STEP quantization;
- observed session starting pressure from Assetto Corsa telemetry.

For the in-period FAM023 AI reference fixture, the revised axle screening is approximately 23.94 psi front and 24.42 psi rear continuously, both 24 psi on the Escort's whole-psi setup grid. These are reference-axle recommendations, not hard-coded left/right track tuning.

### Old and new cold-state logic

v0.10.0 used the requested/ambient 26 C reference too directly as the tire's initial thermal state. The live AI run began near 34.2 C core while AC reported 26 C air and 36 C road. The recorded relation across all four tires was approximately:

`pressure_psi = 0.1219 * core_temp_C + 18.83`

The absolute-pressure relationship reproduces all four recorded final pressures within about 0.02 psi from their observed start/end core states. That equation is a regression fixture, not a global hard-coded law.

v0.10.1 resolves initial state in this order:

1. direct telemetry;
2. explicit setup/reference input;
3. a matching validated family and AI/HUMAN duty fixture;
4. ambient only as `AMBIENT_PROXY_UNRESOLVED`.

Ambient air, road temperature, requested start, predicted AC initial core, observed initial core, contained-air estimate, and tread optimum remain separate. The reason AC initialized this Escort near 34.2 C is not yet verified; no universal ambient-plus-eight rule was added. AI, HUMAN, and UNKNOWN duty cannot silently substitute for one another.

## Profile coherence

The 1984 + CLS022/FAM023 error arose because class/family year bounds were dropped before validation. Context now retains class and family ranges.

- 1974 + CLS022 + FAM023: authoritative pass.
- 1984 + CLS022 + FAM023: blocked.
- 1984 with an explicit custom override: allowed only as `ANACHRONISTIC / CUSTOM PROFILE`, non-authoritative and excluded from historical calibration promotion.
- Disagreement between class and family bounds is surfaced rather than silently resolved.

## Supplier provenance

Supplier was formerly a UI value that could survive a family change. It is now a record containing value, provenance, source IDs, confidence, reason, and explicit-override status. Supported provenance values are `FAMILY_DEFAULT`, `DIRECT_HISTORICAL_EVIDENCE`, `AUTO_CLASSIFICATION`, `IMPORTED_EXISTING_PHYSICS`, `USER_EXPLICIT_OVERRIDE`, and `UNKNOWN_FALLBACK`.

A context transition clears unsupported non-explicit supplier state. Explicit overrides remain visible but make the profile non-authoritative when unsupported. Unknown is retained instead of inventing a supplier.

## Telemetry and manifest continuity

### Root cause and correction

The browser could previously start the native logger without a materialized current manifest. The logger then reconstructed a minimal runtime object and emitted `appVersion: unknown`, losing generated identity and integrity fields.

The browser now materializes and validates the current v0.10.1 TirePack manifest before logger launch. The server stores the bounded handoff, the native logger caches it once, and the final same-basename `.manifest.json` merges runtime observations into the generated manifest. It never replaces the generated configuration.

A previously degraded sidecar resembled:

```json
{
  "appVersion": "unknown",
  "observedACCondition": {"airTemperatureCStart": 26, "roadTemperatureCStart": 36},
  "loggerRuntime": {"samples": 4224}
}
```

The corrected sidecar retains app/knowledge/logger versions, year, family, class, compound, construction and supplier provenance, profile state, requested controls, car/thermal versions, tire/LUT hashes, reference duty, pressure/quantization metadata, and an immutable nested `generatedConfiguration`. It adds observed air/road, raw aidTireRate, initial/latest pressure and core, runtime car/track, sample count, logger schema/rate, and all distance bases.

Requested and observed conditions coexist. Recorded AC conditions are authoritative for analysis. Requested wear 1x remains separate from raw `aidTireRate=0`, whose interpretation remains `UNKNOWN`.

### Blanket metadata

`BLANKETS_TEMP=70` is a tire capability, not evidence that session warmers were enabled. v0.10.1 keeps these separate:

- `tireBlanketCapabilityTemperatureC`;
- `historicalBlanketRecommendation`;
- `requestedSessionBlanketsEnabled`;
- `observedOrInferredStartingThermalState`.

The Escort validation profile recommends OFF and requests OFF.

## Freeze confirmation

Regression gates confirm:

- representative FAM023 Thermal V2 outputs match the v0.10.0 baseline exactly, including carcass rolling, transfer, friction, and cooling values;
- the v0.10.0 wear-shape table is byte-for-byte unchanged;
- Thermal V2 and wear source files have no corrective-pass diff;
- production Tire Knowledge numerical priors are unchanged.

## Static fixtures

Five fresh v0.10.1 fixtures validate CSP Thermal V2 and vanilla AC package structure.

| Fixture | Profile | Construction / supplier provenance | Cold pressure F/R, continuous | Setup-achievable | Ideal F/R | Initial-state status |
| --- | --- | --- | ---: | ---: | ---: | --- |
| BRM P48 | 1960, CLS002/FAM003 | bias family default; Dunlop direct context | 20.17 / 20.17 | no setup grid supplied | 26 / 26 | ambient proxy unresolved; diagnostic host only |
| Escort RS1600 | 1974, CLS022/FAM023 | bias family default; supplier unknown | 23.94 / 24.42 | 24 / 24, STEP=1 | 27 / 27 | 34.2 C AI fixture |
| Ford GT40 | 1967, CLS021/FAM022 | bias direct construction evidence; supplier unknown | 24.04 / 24.15 | no setup grid supplied | 28 / 28 | ambient proxy unresolved |
| Porsche 962C Group C | 1988, CLS028/FAM029 | radial family default; supplier unknown | 24.63 / 24.78 | no setup grid supplied | 28 / 28 | ambient proxy unresolved |
| 1990s BPR GT | 1995, CLS009/FAM010 | radial family default; supplier unknown | 25.32 / 25.43 | no setup grid supplied | 29 / 29 | ambient proxy unresolved |

Every fixture records construction and supplier provenance, continuous/achievable/observed pressure concepts, contained-air and initial-state estimates, volume-ratio provenance, uncertainty, Thermal V2 architecture, life semantics, and manifest-field coverage. BRM remains a diagnostic and is not treated as an authoritative historical thermal host.

## Verification

The v0.10.1 acceptance suite contains 43 Node tests plus native PowerShell checks for manifest merging, logger schema, and canonical packaging. Browser/native acceptance verifies profile generation, visible year blocking/override, supplier provenance, pressure quantization, generated-manifest handoff, runtime merge, requested/observed separation, blanket separation, and retained hashes without `appVersion: unknown`.

Package validation also scans distributed text for personal absolute machine paths and enforces exactly one canonical installer artifact.

## Remaining uncertainties

- AC initial tire/core prediction for uncalibrated families;
- hot/cold cavity-volume change;
- AI versus human reference-duty transferability;
- track-specific and per-corner pressure asymmetry;
- exact semantics of AC pressure-gain parameters and raw `aidTireRate`;
- historical absolute temperature targets;
- historical life-to-AC grip degradation calibration.

## Next live test

Use a fresh v0.10.1 Escort tire with an in-period year, FAM023/CLS022, AI at Brands Hatch GP, warmers OFF, wear 1x, fuel consumption OFF, generated pressure unchanged, and four to five clean laps. Record actual air/road temperature.

The test validates profile coherence, manifest fidelity, starting-pressure quantization, pressure closure, and AI thermal state. After that evidence, decide whether to adjust pressure prediction or move to the WSC GT40 Mk II. Do not redesign the thermal or wear model before reviewing this run.

