# GT40 calibration handoff — v0.10.1

## Scope and working-tree state

This pass continued the interrupted v0.10.1 working tree. It did not restart the release, create v0.10.2, retune thermal physics, retune wear, or change production Knowledge numeric priors.

The missing `setup.ini` `DEFAULT` defect was partially fixed before the interruption and is now complete. `normalizeSetupControl()` preserves an absent default as `null`; `pressureReport()` reports `setupDefaultColdPressurePsi: null` and keeps it separate from the selected setup and observed live starting pressure. A missing value is never passed through `Number(null)` and therefore never becomes `0 psi`.

The final GT40 input snapshot was rebuilt from the clean installed host:

- Host: `wsc_legends_gt40_mk2`
- Clean source folder: installed `data` directory, not the older Tire Lab test clone
- Clean source snapshot: `research_staging/wsc_legends_gt40_mk2_v0101_host_physics.zip`
- Clean source snapshot SHA-256: `3990230fb027224f3c1f46c62e8927ff2e245ad99f31764bf04f740f07011511`
- Final TirePack SHA-256: `fd831e4c976cf2c5dd234f280fbed3c76ee4b9395a9c1630d9b07a49687fdc9d`
- Imported identity: WSC60 Ford GT40 Mk II
- Imported mass: 1161 kg
- Imported front static weight: 38%
- Imported geometry: 0.245 m × 0.315 m front, 0.325 m × 0.360 m rear, 0.1905 m rim radius

## Escort result retained

- Manifest: **PASS**
- FAM023 / Escort AI pressure architecture: **PROVISIONAL LIVE PASS**
- Absolute thermal calibration: **UNRESOLVED**
- Wear calibration: **UNRESOLVED**

The two Escort CSVs are consecutive segments of one logger session. Combined hot-pressure closure was approximately 26.54 psi front (-0.46 psi from 27) and 27.27 psi rear (+0.27 psi). The host setup has 1 psi steps and no `DEFAULT`; Content Manager's persisted `last.ini` selected 23 psi front and 24 psi rear. Telemetry began near 24.27/25.31 psi with cores already near 36.2 °C, so the observed start is compatible with the selected 23/24 psi after initial thermal rise. It is not evidence that the pressure solver selected 24/25.

## GT40 profile and pressure output

- Year/class/family: 1966 / CLS021 / FAM022
- Construction: bias/cross-ply, `AUTO_CLASSIFICATION`
- Supplier: General / unknown
- Compound: FAM022 dry endurance/race specification in the internal medium slot
- Physics output: CSP extended-2, Thermal V2
- Profile coherence: **PASS** (compatibility only)
- Historical evidence status: **PARTIALLY SOURCED**
- Pressure model status: **UNVALIDATED ON THIS HOST**

| Pressure concept | Front | Rear |
|---|---:|---:|
| Continuous cold recommendation | 24.1335 psi | 24.5348 psi |
| Achievable 1 psi setup-grid value | 24 psi | 25 psi |
| `setup.ini` default | null | null |
| Persisted/selected setup | null / not detected | null / not detected |
| `PRESSURE_IDEAL` | 28 psi | 28 psi |
| Predicted contained-air hot state | 55.79 ± 12 °C | 52.42 ± 12 °C |
| Predicted stabilized pressure | 27.963 psi | 27.962 psi |
| Predicted hot/cold volume ratio | 1.0 | 1.0 |

The volume ratio is `UNKNOWN_ASSUMED_UNITY` with low confidence. The initial state is `AMBIENT_PROXY_UNRESOLVED`; ambient is only an unresolved calculation proxy and is not asserted to equal the AC starting core. The predicted closure is a software model output, not a live validation result.

## Focused 1966 GT40 Mk II evidence

| Category | Status | Finding | Provenance / limitation |
|---|---|---|---|
| Car identity | Direct primary / imported-host identity | 1966 Mk II fixture, 1161 kg host physics | Installed host plus Ford Mk II documentation; the mod identity is not itself period proof |
| Class | Reconstructed | CLS021, 1966–71 World Sportscar / Group 4–6 | Internal taxonomy |
| Family | Reconstructed | FAM022 late-1960s sportscar cross-ply family | Internal taxonomy |
| Construction | Reconstructed | Bias/cross-ply compatibility classification | No direct carcass specification was found in the focused primary set |
| Supplier | Unknown for generic fixture | General / unknown | Chris Amon documents event- and car-specific Firestone intermediates and a switch to Goodyear at 1966 Le Mans; this is not a universal supplier assignment |
| Geometry | Partially sourced | Ford provides for 8-inch front and 9.5-inch rear wheels; host has 15-inch rim diameter and 0.245/0.325 m tire widths | Ford primary material supports wheel-width provision; host tire dimensions remain simulator inputs |
| Pressure | Provisional | 28 psi is a generator prior; no exact period Mk II hot/cold pressure was found | No live GT40 closure yet; dimensional-measurement pressures are not race-pressure evidence |
| Temperature | Unknown | No period tread, carcass, or core temperature window found | Do not convert the generator optimum into historical proof |
| Compound | Reconstructed | Dry endurance/race specification; exact period code unresolved | Current FAM022 menu |
| Wear/life | Partially sourced but numerically unresolved | Endurance completion context and high-speed intermediate tread shedding are documented | No defensible direct mapping to AC virtual km or the generated wear curve |
| Wet/intermediate | Direct primary, event-specific | Firestone intermediates were used in damp 1966 Le Mans conditions | Exact construction/compound unresolved; not included in this dry baseline fixture |

Source catalog:

- `GT40-PRI-FIA-224` — FIA Historic Database, homologation form 224: <https://historicdb.fia.com/car/ford-gt-40>
- `GT40-PRI-FORD-AMERICAN-CHALLENGE` — Ford, *The American Challenge*: <https://media.ford.com/content/dam/fordmedia/history/products/fordgt-gt40/Ford-GT40-Press-release-The-American-Challenge.pdf>
- `GT40-PRI-FORD-AMON-1966` — Ford / Chris Amon, 1966 Le Mans recollection: <https://media.ford.com/content/fordmedia/feu/de/de/news/2016/06/10/ford-gt40-fahrer-chris-amon-erinnert-sich-an-seinen-grossen-le-m.html>
- `GT40-PRI-FORD-LEMANS-REPORT` — Ford, 1966 Le Mans race review: <https://media.ford.com/content/dam/fordmedia/history/products/fordgt-gt40/LeMans-Progress-Meeting-with-wrap-up-of-victory-10-06-1966.pdf>

## Frozen-calibration decision

No global thermal parameters changed. No FAM022 thermal coefficients were fitted. No wear curve, `VIRTUALKM`, life prior, wear coefficient, or real-km mapping changed. No production Knowledge numeric value changed.

Cross-ply thermal calibration remains blocked until clean AI telemetry exists for Escort + GT40 + Porsche 917K. At that point compare systematic cold bias, Escort-only bias, surface/core transfer behavior, and whether the `PERFORMANCE_CURVE` optimum represents core temperature. Do not start that calibration from this fixture alone.

## Long-run addendum

The subsequent long run covered 198.576 km on the current tire set with complete laps 1–33. The runtime handoff was stale: its generated tire hash was `f1b2de…`, while the active installed `tyres.ini` hash was `ed0af…`. The corrected post-run record therefore treats installed hashes, the observed AC compound string, and observed AC conditions as authoritative and nests the stale generated configuration as provenance.

Late laps 30–33 averaged 27.659 psi front and 28.159 psi rear against 28 psi ideal. The last ten complete laps had pressure slopes below 0.026 psi/lap, but core slopes remained 0.149–0.202 °C/lap. This is a pressure-stable but thermally not-yet-stable run, not a historical thermal pass or fail.

Wear changed from 100 to 95.266 FL, 97.087 FR, 85.905 RL and 89.696 RR. This is retained as simulator behavior in `GT40-LONG-RUN-WEAR-FIXTURE-001`; it is not fitted to historical life and does not authorize changes to wear curves, `VIRTUALKM`, or production Knowledge.
