# ACLM Historical Tire Lab v0.10.3 — engineering report

v0.10.3 is a telemetry-analysis and packaging-integrity release. It does not alter tire physics, pressure/compliance coefficients, Thermal V2, wear curves, `VIRTUALKM`, LUTs or production Tire Knowledge v1.7.1 numerics.

The short pressure screen now evaluates session-relative valid completed laps. It retains raw Assetto Corsa lap numbers for audit, excludes pit/outlaps and partial laps, requires coherent distance/time plus sufficient moving samples, and fails closed when identity or any pressure channel is missing. The separate later-lap diagnostic remains visible and does not replace the session-relative laps 2–5 decision.

The Porsche 917K C2 capture is preserved as the regression fixture: raw lap 7 is the pit/outlap, raw lap 8 is warm-up, raw laps 9–12 are decision laps 2–5, and raw lap 16 is partial. Its sidecar remains explicitly limited because `pressureAB.role` was unclassified and the TirePack ID was blank.
