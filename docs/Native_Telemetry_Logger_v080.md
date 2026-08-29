# ACLM native telemetry logger — schema 1.1 (Tire Lab v0.9.2)

Tire Lab can now start a Windows background logger from its local browser UI. The logger reads Assetto Corsa native shared-memory mappings and writes transparent CSV evidence under `Documents\ACLM Tire Lab\Telemetry`.

## Recorded evidence

The file includes car, track, compound, lap context, speed and driver inputs plus four-wheel pressure, raw wear, core and inner/middle/outer temperatures, load, slip, angular speed, camber, suspension travel, brake temperature and dirt. `tyreWear` is deliberately stored as `wear_*_raw`; Tire Lab does not guess whether a particular car/CSP combination presents remaining condition or consumed wear.

Schema 1.1 records `aid_tire_rate` directly from AC static shared memory. Every single-precision physics value is serialized with round-trip formatting, so small wear changes are not erased by CSV formatting. The analyzer retains the original start/end text, calculates change from start and per-distance rates, and labels accelerated-wear normalization as an estimate rather than a direct 1× measurement.

Standard Assetto Corsa shared memory exposes four-wheel `wheelSlip`, but not a dedicated four-wheel slip-angle array. Tire Lab maps a verified slip-angle column when another telemetry source supplies one; it does not invent a shared-memory offset or silently substitute wheel slip for slip angle.

## Use

Open Tire Lab, select 10 Hz, click **Start native logger**, then start driving in AC. Stop and flush the CSV when the run is complete. **Analyze latest log** loads it directly into the Validation Workspace. No developer app, Python app installation or extra shortcut is required.

The field layout follows the public CSP `sim_info.py` AC shared-memory structures. The logger is an independent public-interface integration and does not access confidential tire data.
