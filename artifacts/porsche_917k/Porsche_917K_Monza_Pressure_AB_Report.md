# Porsche 917K — Monza 1966 pressure A/B

The hash-matched canonical 917K TirePack completed a usable same-tire AI-reference pressure comparison at Kunos Monza 1966. The generated and active `tyres.ini` SHA-256 was `2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4` in both runs.

The decision window is complete laps 2–5. Lap 1 is warm-up. Recorded AC conditions, not the requested weather fields, are authoritative: 26 °C air and 37 °C road. Warmers were requested OFF, fuel remained 30 L, and the manifest requested 1× tire wear. Raw `aidTireRate=0` remains semantically unknown.

| Wheel | Ideal | Baseline A | A error | Corrected B | B error | B result |
|---|---:|---:|---:|---:|---:|---|
| LF | 32 psi | 31.285 | −0.715 | 32.365 | +0.365 | PASS |
| RF | 32 psi | 30.412 | −1.588 | 32.529 | +0.529 | REVIEW |
| LR | 38 psi | 37.237 | −0.763 | 38.398 | +0.398 | PASS |
| RR | 38 psi | 36.471 | −1.529 | 38.616 | +0.616 | REVIEW |

Baseline A was `FAIL / pressure model mismatch`. Corrected B improved every corner and moved the result to `REVIEW`; LF and LR passed, while RF and RR missed PASS by only 0.029 and 0.116 psi respectively.

The B logger was started twice within 0.38 seconds, creating `04:48:54` and `04:48:55` captures of the same physical run. The earlier capture is authoritative and the latter is excluded as a duplicate. This exposed a server/UI start race; it is a software-integrity issue, not a physics result.

v0.10.2 did not persist the A/B role and intended per-corner setup adjustments into the telemetry sidecar. The observed starting-pressure changes are valid, but they cannot independently prove the exact Content Manager setup clicks. A future confirmation must persist those intent fields.

Decision: preserve the canonical TirePack. Do not change pressure, compliance, thermal, or wear coefficients from this comparison. Thermal accuracy remains unresolved and wear remains **STORE, DO NOT FIT**. The four-host cross-ply program remains Maserati 250F + Ford GT40 + Porsche 917K + Ford Escort RS1600.
