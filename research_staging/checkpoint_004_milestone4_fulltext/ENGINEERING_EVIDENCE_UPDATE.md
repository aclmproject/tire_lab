# ENGINEERING EVIDENCE UPDATE

Research status only. No software or physics change is made.

| Issue | M4 assessment | Rationale |
|---|---|---|
| PRESSURE SOLVER | **STRONGLY SUPPORTS** | Pressure, load, deflection, footprint and construction are coupled. Contained-air temperature—not tread/core temperature—belongs in the gas-law state. The literature does not provide racing volume-growth coefficients. |
| THERMAL TRANSFER | **SUPPORTS** | Embedded sensors show distinct inner carcass, sidewall/shoulder and tread-surface pathways; flex and slip heat must remain separate. No global historical multiplier is justified. |
| CONSTRUCTION PROPAGATION | **STRONGLY SUPPORTS** | Bias, bias-belted and radial constructions have different stiffness/decay responses. Stale Radial state can materially corrupt generation and must be blocked. |
| WEAR/LIFE MAPPING | **SUPPORTS** | Footprint pressure times local slip velocity supports an energy-exposure architecture, while tread-depth loss and performance loss are demonstrably nonlinear. Calibration remains insufficient. |
| TELEMETRY DISTANCE | **NEUTRAL** | No reviewed full text addresses ACLM logger distance semantics. The existing cumulative/session/stint/tire-set separation requirement remains unchanged. |
| FAM023 TEMPERATURE TARGET | **INSUFFICIENT** | General thermal pathways corroborate the Escort direction, but no period Group 2/ETCC pyrometer evidence establishes an absolute optimum. |
| FAM022 CONSTRUCTION | **STRONGLY SUPPORTS** | Construction-specific response confirms that the radial-contaminated GT40 run cannot calibrate cross-ply FAM022. A correct cross-ply retest remains mandatory. |

## Pressure-question answers

1. Cold-to-hot pressure should use absolute pressure and contained/cavity-air temperature with an explicit volume ratio: `P2_abs/P1_abs = (T2_air/T1_air)(V1/V2)` for fixed gas mass.
2. The reviewed batch does not quantify racing-tire volume growth; `V2/V1` remains an unresolved calibration input.
3. Contained air, embedded carcass, inner-wall and post-footprint tread temperatures are different observables and must not be substituted silently.
4. Load, pressure and construction change deflection and footprint; the literature supports coupled architecture but not a universal volume coefficient.
5. AC `PRESSURE_TEMPERATURE_GAIN` should be treated as an effective simulation parameter validated against contained-air/pressure telemetry, not copied from a tread-temperature slope.
6. Construction materially changes pressure sensitivity and stiffness response.
7. Vehicle/tire load changes deflection, footprint and cornering response and must enter prediction/validation.
8. The evidence supports keeping `PRESSURE_STATIC` as a tire-physics reference while calculating setup cold pressure separately, but exact implementation remains an engineering decision.
