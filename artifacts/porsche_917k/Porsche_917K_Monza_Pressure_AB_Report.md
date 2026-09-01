# Porsche 917K — Monza 1966 pressure A/B/C evidence

The hash-matched canonical 917K TirePack completed its short-pressure phase as simulator engineering evidence. Every accepted capture used active/generated `tyres.ini` SHA-256 `2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4`, `physicsHashMatch=true`, `Dry Endurance (D)`, AI_REFERENCE and Kunos Monza 1966. Recorded AC conditions—approximately 26 °C air and 37 °C road—are authoritative.

The decision window is session-relative complete laps 2–5 after one full timed warm-up lap. Literal AC laps 2–5 remain preferred. A rebase is allowed only when pit start, reset/coherent distance, identity, out-lap exclusion and at least five coherent full laps are all proven.

| Wheel | Ideal | Baseline A | Corrected B | 30F/35R C | 30F/35R C2 | C2 result |
|---|---:|---:|---:|---:|---:|---|
| LF | 32 psi | 31.285 | 32.365 | 33.362 | 33.355 | REVIEW (+1.355) |
| RF | 32 psi | 30.412 | 32.529 | 32.529 | 32.521 | REVIEW (+0.521) |
| LR | 38 psi | 37.237 | 38.398 | 39.381 | 39.359 | REVIEW (+1.359) |
| RR | 38 psi | 36.471 | 38.616 | 38.596 | 38.579 | REVIEW (+0.579) |

Baseline A was `FAIL / pressure model mismatch`. Staggered corrected B improved every corner to overall `REVIEW`, with LF and LR passing. The `04:48:54` B capture remains authoritative; `04:48:55` is an excluded duplicate logger capture of the same physical run.

Confirmation C (`15:14:18`) used literal AC laps 2–5. Its CSV SHA-256 is `9fcd20777c1ebdff2937a3df273b0aed1165c916a0559d1e2006b17627345721`; manifest SHA-256 is `aabe0c094cd742cc5efcab397b5af9eaf68dea2e4a8690410d7de540c71f9cae`. The setup was visibly changed while stationary in the pits to 30 psi front / 35 psi rear, but the older manifest lacks pressure-intent fields. The setup declaration is therefore user-supplied context rather than sidecar-proven intent.

Independent repeat C2 (`15:56:05`) is a new capture and fresh tire set, not an appended CSV. Its CSV SHA-256 is `76868db94ba76ecfb6fc51173e702cb76b577eeb2550f784b01aca0be95a6bf3`; manifest SHA-256 is `f0e95dff7339b29a78f75e0b20f098837e5060d1f78772522f77e0b72d22ec38`. AC reused its session lap numbers: raw lap 7 is the pit/out-lap segment, raw lap 8 is relative warm-up lap 1, and raw laps 9–12 map to relative decision laps 2–5. The manifest proves the patched logger was active but records role `unclassified`, blank TirePack ID and zero corrections, so this evidence retains an intent-metadata limitation.

C2 repeats C within at most 0.023 psi at any wheel. Both show 30F/35R is reproducibly high on the loaded left tires. The best balanced whole-psi-grid inference is **29 psi front / 34 psi rear at all four respective axle corners**. This is a setup-only inference, not a generator or production-physics change.

Decision: request no more 917K driving now. Preserve the canonical TirePack and every pressure/compliance, Thermal V2 and wear coefficient. The short screen does not establish historical pressure truth, certify a historical thermal window or fit wear. Thermal remains **UNRESOLVED** and wear remains **STORE, DO NOT FIT**.
