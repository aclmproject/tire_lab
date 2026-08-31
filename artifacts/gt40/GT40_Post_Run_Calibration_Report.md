# ACLM post-run calibration report

- Fixture: GT40-LONG-RUN-001
- Car / track: wsc_legends_gt40_mk2_tires / ks_monza66
- CSV SHA-256: `4c8ff6b3c12ca04dbe0311be7ae42ea3cfb61300fa2a80ce0c3d7951d1e7b488`
- Active physics: **STALE/HASH_MISMATCH**; authority **ACTIVE_INSTALLED_PHYSICS**
- Active compound: Dry endurance compound/spec (E)
- Complete laps: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
- Partial/invalid laps: 0, 34
- Distance: 198.576 km

## Pressure

| Wheel | Start psi | Late psi | Target psi | Error psi | Result |
|---|---:|---:|---:|---:|---|
| FL | 25.303 | 28.172 | 28.000 | 0.172 | PASS |
| FR | 25.303 | 27.147 | 28.000 | -0.853 | REVIEW |
| RL | 25.277 | 28.544 | 28.000 | 0.544 | REVIEW |
| RR | 25.277 | 27.773 | 28.000 | -0.227 | PASS |

Front axle: **PASS**, -0.341 psi. Rear axle: **PASS**, 0.159 psi.

## Thermal

Engineering stability: **NOT_STABILIZED**. Historical thermal accuracy: **UNRESOLVED**.

| Wheel | Late core C | Core slope C/lap | Surface mean C | Surface p95 C | Surface max C | Surface-core delta C |
|---|---:|---:|---:|---:|---:|---:|
| FL | 58.509 | 0.153 | 61.692 | 96.679 | 105.594 | 3.183 |
| FR | 50.523 | 0.149 | 52.744 | 90.204 | 108.037 | 2.221 |
| RL | 61.415 | 0.202 | 62.441 | 89.032 | 96.324 | 1.027 |
| RR | 55.406 | 0.202 | 56.002 | 77.001 | 85.322 | 0.596 |

## Wear and contamination

Wear remains **STORE, DO NOT FIT**. Off-track contaminated samples: 388. Incident-candidate samples: 20.

| Wheel | Raw start | Raw end | Delta | Onset km | Slope / km |
|---|---:|---:|---:|---:|---:|
| FL | 100.000 | 95.266 | -4.734 | 28.026 | -0.024987 |
| FR | 100.000 | 97.087 | -2.913 | 41.135 | -0.015696 |
| RL | 100.000 | 85.905 | -14.095 | 18.536 | -0.071807 |
| RR | 100.000 | 89.696 | -10.304 | 22.406 | -0.051511 |

## Protocol classification

- Short pressure screen: AVAILABLE
- Extended thermal observation: NOT_STABILIZED
- This report does not automatically declare historical thermal accuracy.
