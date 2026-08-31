# GT40 Monza AI live-test card

Use this exact baseline. Do not alter the generated tire or compensate pressures per corner before the run.

| Setting | Value |
|---|---|
| Car | WSC Legends Ford GT40 Mk II (`wsc_legends_gt40_mk2`) |
| Year / class / family | 1966 / CLS021 / FAM022 |
| Track | Kunos Monza GP |
| Driver | AI (`AI_REFERENCE`) |
| Fuel | 40 L |
| Fuel consumption | OFF |
| Damage | OFF |
| Tire wear | 1x |
| Warmers | OFF |
| Tire | Fresh v0.10.1 FAM022 dry endurance/race tire |
| Physics | CSP extended-2 / Thermal V2 |
| Pressures | Use generated/setup values untouched: 24 psi front, 25 psi rear on the host's 1 psi grid |
| Useful run | 4–5 laps |

Lap plan:

1. Lap 1: warm-up.
2. Laps 2–4: primary calibration window.
3. Lap 5: run only if pressure or core temperature is still materially drifting.

Capture per corner:

- actual starting pressure and starting core temperature;
- pressure, core temperature, surface I/M/O, surface mean, p95 and maximum;
- tire load, slip ratio, slip angle when available, wheel speed and vehicle speed;
- raw wear at full precision;
- actual air and road temperature;
- incident/off-track flags;
- setup control, setup default and actual selected-pressure state.

Pressure acceptance:

- absolute error ≤0.5 psi: PASS;
- >0.5 to ≤1.5 psi: REVIEW;
- >1.5 psi: FAIL.

Also calculate front- and rear-axle averages. Do not reject axle-level closure solely because Monza produces left/right asymmetry. Thermal output is descriptive only: report heat-up rate, core and surface trajectories, surface/core delta, transient peaks, left/right behavior, approximate late-run equilibrium, and valid comparisons with Escort/period evidence. Do not issue a historical thermal PASS/FAIL.

