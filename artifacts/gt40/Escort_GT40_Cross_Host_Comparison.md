# Escort vs GT40 cross-host comparison

GT40 live fields intentionally remain pending until the controlled Monza AI CSV exists.

| Field | Escort RS1600 — Brands Hatch live fixture | GT40 Mk II — Monza baseline |
|---|---|---|
| Vehicle mass | 871 kg | 1161 kg |
| Front/rear static load | 54% / 46% | 38% / 62% |
| Tire dimensions F | 0.205 m width, 0.300 m radius, 0.1651 m rim radius | 0.245 m width, 0.315 m radius, 0.1905 m rim radius |
| Tire dimensions R | 0.205 m width, 0.300 m radius, 0.1651 m rim radius | 0.325 m width, 0.360 m radius, 0.1905 m rim radius |
| Construction | Bias/cross-ply | Bias/cross-ply |
| Compound type | Period touring dry race | FAM022 dry endurance/race specification |
| Ideal pressure F/R | 27 / 27 psi | 28 / 28 psi (provisional generator prior) |
| Continuous recommended cold F/R | Existing v0.10.1 fixture values | 24.1335 / 24.5348 psi |
| Achievable setup-grid cold F/R | 23 / 24 psi selected in persisted setup for the live run | 24 / 25 psi |
| Setup default | None | None (`null`) |
| Actual selected setup pressure | 23 / 24 psi | Pending live run confirmation |
| Actual starting pressure | ~24.27 F / ~25.31 R psi | Pending |
| Actual initial core | ~36.2 °C | Pending; model state is `AMBIENT_PROXY_UNRESOLVED` |
| Pressure rise | Captured in combined live CSV | Pending |
| Late pressure | 26.54 F axle avg / 27.27 R axle avg psi | Pending |
| Core equilibrium | Unresolved; asymmetric late trends | Pending |
| Surface mean | Captured per corner in Escort fixture | Pending |
| Surface peaks | Captured per corner in Escort fixture | Pending |
| Surface/core delta | Descriptive only | Pending |
| Slip activity | Captured | Pending |
| Cooling behavior | Thermal status unresolved | Pending |
| Historical temperature evidence | Unresolved | Unknown; no period Mk II window found |
| Pressure calibration status | Provisional live PASS | UNVALIDATED ON THIS HOST |
| Thermal calibration status | UNRESOLVED | UNVALIDATED / descriptive run only |
| Wear calibration status | UNRESOLVED | UNVALIDATED; 1x baseline only |

Future decision gate: do not retune the shared cross-ply Thermal V2 network until clean AI telemetry exists for Escort, GT40 and Porsche 917K.

## GT40 extended observation

The long GT40 run adds 198.576 km of current-tire-set exposure and complete laps 1–33. Laps 30–33 closed at 27.659 psi front and 28.159 psi rear against 28 psi ideal. The final ten-lap pressure slopes passed the engineering stability screen, but all four core slopes remained above 0.10 °C/lap. The correct classification is **NOT STABILIZED / HISTORICAL THERMAL UNRESOLVED**.

The wear signal is preserved as simulator evidence only: FL 95.266, FR 97.087, RL 85.905, RR 89.696 from a 100 start. No real-km life inference or wear fit is permitted.
