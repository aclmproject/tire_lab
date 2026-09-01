# ACLM Historical Tire Lab v0.10.4 — handoff compatibility hotfix

v0.10.4 corrects an application-level import regression. The certified canonical Maserati 250F and Porsche 917K TirePacks intentionally remain v0.10.2 artifacts, so their schema-1.1 telemetry handoffs are now accepted by an explicit compatibility allowlist.

The policy is fail-closed: it accepts only the current application version or certified v0.10.2 with exactly `ACLM telemetry calibration manifest 1.1`, and only when the embedded `tireFileSha256` exactly matches the imported `tyres.ini`. Other older, intervening and newer application versions are rejected.

No canonical TirePack, tire physics, LUT, pressure coefficient, Thermal V2 value, wear value, `VIRTUALKM`, or Knowledge v1.7.1 numeric changed.
