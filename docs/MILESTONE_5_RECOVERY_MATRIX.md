# Milestone 5 recovery matrix

Recovery audit date: 2026-08-29. Baseline commit: `fbf502d` (`v0.9.2` manifest alignment). The working tree was preserved; no rollback, checkout, or milestone rerun was performed.

| Requirement | Recovered state | Evidence / next gate |
|---|---|---|
| A. Historical profile-state provenance | COMPLETE | `profile_state.js`; six required provenance values |
| B. Construction conflict validation | COMPLETE | Blocking/warning tests pass |
| C. Family-construction audit | COMPLETE | 85-family generated audit; GT40 correction is app-state scoped |
| D. Pressure solver | COMPLETE | Absolute-pressure equation and explicit state |
| E. Contained-air-temperature model | COMPLETE / NEEDS TELEMETRY CALIBRATION | Separate low-confidence reference-duty estimate; Escort A/B anchor |
| F. Explicit volume-ratio treatment | COMPLETE | Unknown value is unity with `UNKNOWN_ASSUMED_UNITY`, never hidden |
| G. Static / ideal / setup-cold separation | COMPLETE | Separate fields in pressure report |
| H. AC pressure-parameter handling | COMPLETE / NEEDS EMPIRICAL CLOSURE | Simulator parameters retained and not relabelled as gas-law terms |
| I. Escort pressure regression | COMPLETE | Old baseline FAIL and corrected A/B closure retained |
| J. GT40 pressure regression | COMPLETE | Old result is FAIL; thermal evidence excluded from fitting |
| K. Thermal-pathway preservation | COMPLETE | No global retune; flex and slip pathways remain distinct |
| L. Wear/life schema redesign | COMPLETE | Eight explicit historical-life fields |
| M. Legacy `lifeKm` migration | COMPLETE | Meaning-aware migration; unknown values remain unknown |
| N. Historical life vs AC implementation | COMPLETE | Historical km explicitly differs from AC virtual km and health |
| O. Wear threshold interpolation | COMPLETE | Interpolated crossings, plateau, requested landmarks and terminal point |
| P. Reference-duty wear framework | COMPLETE / NOT HISTORICALLY FITTED | Calibratable factor architecture; coefficients intentionally absent |
| Q. Telemetry distance separation | COMPLETE | Four bases; wear selects current tire set and excludes logger cumulative |
| R. Telemetry sidecars/manifests | COMPLETE | Per-CSV sidecar writer and generated manifest handoff implemented |
| S. Incident handling | COMPLETE | Existing BRM 5x abuse fixture retained as incident evidence, not clean life fit |
| T. Engineering provenance reporting | COMPLETE | UI panel plus generated JSON |
| U. Cross-era fixtures | COMPLETE | Five static CSP/vanilla fixtures generated and inspected by regression tests |
| V. Versioning | PARTIAL AT RECOVERY | Source moved to v0.10.0; release manifest awaits final artifact hash |
| W. Changelog | NOT STARTED AT RECOVERY | Must add v0.10.0 entry |
| X. Installer | NOT STARTED AT RECOVERY | Must build exactly one canonical ZIP after all gates pass |
| Y. Engineering report | NOT STARTED AT RECOVERY | Required report must be completed before packaging |
| Z. Full final regression | PARTIAL AT RECOVERY | 19 core tests, telemetry legacy suite and logger schema passed; sidecar/package/browser gates pending |

The first genuinely incomplete release item after recovery was final reporting/version alignment, followed by full regression and packaging.
