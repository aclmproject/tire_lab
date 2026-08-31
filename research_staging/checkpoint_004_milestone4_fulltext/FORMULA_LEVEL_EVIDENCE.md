# FORMULA-LEVEL EVIDENCE

No production coefficient is authorized by this checkpoint.

## 1. Pressure-load-deflection membrane relation

- Source: `E-SRC-0124`
- Page/section: p. 17, eq. 9
- Equation/relationship: `P_load ≈ pi p0 Delta_v sqrt(d w)`
- Potential Tire Lab use: Architecture and dimensional checks for pressure/deflection coupling.
- Applicability/limitations: Idealized aircraft-tire membrane approximation; not a cold-to-hot pressure equation.

## 2. Construction-specific fore-aft stiffness

- Source: `E-SRC-0096`
- Page/section: p. 32, eqs. 5-7
- Equation/relationship: `Kx = alpha + beta Fz + gamma P, with different alpha/beta/gamma for bias, bias-belted and radial-belted tires`
- Potential Tire Lab use: Construction-dependent stiffness and regression tests.
- Applicability/limitations: Aircraft tire and tested 90-140 psi, 11,500-15,000 lb domain.

## 3. Footprint length from deflection

- Source: `E-SRC-0098`
- Page/section: p. 6, eq. 1
- Equation/relationship: `Lf/d = 1.66 sqrt(delta/d) - delta/d`
- Potential Tire Lab use: Footprint/deflection consistency validation.
- Applicability/limitations: Empirical aircraft-tire fit; geometry and construction transfer unproven.

## 4. Hysteresis energy ratio

- Source: `E-SRC-0098`
- Page/section: p. 8
- Equation/relationship: `loss_ratio = load-deflection loop area / total loading energy`
- Potential Tire Lab use: Quantify flex/cyclic heat separately from slip heat.
- Applicability/limitations: Static loop must be reconciled with dynamic frequency and temperature.

## 5. Footprint wear-power integral

- Source: `E-SRC-0079`
- Page/section: pp. 3, 6
- Equation/relationship: `q_wear(x,y) = p_contact(x,y) v_slip(x,y); P_wear = integral_A q_wear dA`
- Potential Tire Lab use: Basis for load/slip-sensitive virtual-km exposure.
- Applicability/limitations: Requires compound, temperature, construction and track calibration; power is not grip loss.

## 6. Heat power conservation

- Source: `E-SRC-0094`
- Page/section: p. 26
- Equation/relationship: `P_heat = F_drag v`
- Potential Tire Lab use: Energy gate for friction and hysteresis heat generation.
- Applicability/limitations: Source partition between squirm and hysteresis is test/model specific.

## 7. Layered thermal pathways

- Source: `E-SRC-0074`
- Page/section: pp. 8-10 and conclusions
- Equation/relationship: `Q_flex primarily heats shoulder/sidewall interior; Q_slip/yaw primarily heats tread near outer surface`
- Potential Tire Lab use: Supports separate surface, carcass and cavity nodes and separate heat inputs.
- Applicability/limitations: Qualitative transfer; no universal Thermal V2 coefficient.

## 8. Contained-air time response

- Source: `E-SRC-0113`
- Page/section: pp. 7-9
- Equation/relationship: `T_air(t) represented by a second-order fit; observed equilibrium times 20-27 min`
- Potential Tire Lab use: Cavity-temperature state and time-constant validation.
- Applicability/limitations: Low-rolling-resistance road tires; solar/track/ambient forcing dominated some tests.

## 9. Absolute-pressure/temperature/volume identity

- Source: `GOVERNING_PHYSICS_WITH_M4_SENSOR_SUPPORT`
- Page/section: M4 synthesis
- Equation/relationship: `P2_abs/P1_abs = (T2_air/T1_air)(V1/V2) for fixed gas mass`
- Potential Tire Lab use: Cold-to-hot pressure solver architecture; use cavity/contained-air temperature and explicit volume correction.
- Applicability/limitations: The reviewed sources distinguish contained air but do not quantify racing-tire V2/V1; no gain value can be fitted.

## 10. Hydroplaning water-depth scaling

- Source: `E-SRC-0076`
- Page/section: p. 22
- Equation/relationship: `V_spin_down proportional to h_water^(-1/6)`
- Potential Tire Lab use: Wet-model validation and pressure/footprint interaction.
- Applicability/limitations: Scale-model relationship; not relevant to dry pressure or thermal calibration.

