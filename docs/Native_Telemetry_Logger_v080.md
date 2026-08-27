# ACLM native telemetry logger — v0.8.0

Tire Lab can now start a Windows background logger from its local browser UI. The logger reads Assetto Corsa native shared-memory mappings and writes transparent CSV evidence under `Documents\ACLM Tire Lab\Telemetry`.

## Recorded evidence

The file includes car, track, compound, lap context, speed and driver inputs plus four-wheel pressure, raw wear, core and inner/middle/outer temperatures, load, slip, angular speed, camber, suspension travel, brake temperature and dirt. `tyreWear` is deliberately stored as `wear_*_raw`; Tire Lab does not guess whether a particular car/CSP combination presents remaining condition or consumed wear.

## Use

Open Tire Lab, select 10 Hz, click **Start native logger**, then start driving in AC. Stop and flush the CSV when the run is complete. **Analyze latest log** loads it directly into the Validation Workspace. No developer app, Python app installation or extra shortcut is required.

The field layout follows the public CSP `sim_info.py` AC shared-memory structures. The logger is an independent public-interface integration and does not access confidential tire data.
