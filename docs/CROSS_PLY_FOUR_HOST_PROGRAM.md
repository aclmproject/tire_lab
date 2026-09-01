# Four-host cross-ply validation program

The controlled comparison set is fixed: Maserati 250F + Ford GT40 Mk II + Porsche 917K + Ford Escort RS1600. Each host remains an independent simulator fixture until identity, protocol, and evidence gates permit comparison.

| Host | Historical mapping | Pressure evidence | Thermal evidence | Wear evidence | Next admissible action |
|---|---|---|---|---|---|
| Maserati 250F 6C | 1957; CLS102/FAM002; treaded bias; Pirelli fixture-only | Canonical v0.10.2 pack verified; 24/24 psi setup and 28/28 psi provisional ideal; no live screen yet | Unresolved | Reconstructed; no fit | Run the hash-matched AI-reference baseline in `MASERATI_250F_LIVE_TEST_CARD_v0102.md` |
| Ford GT40 Mk II | 1966; CLS021/FAM022; bias/cross-ply; supplier unresolved | Long Monza observation exists, but generated-vs-active state is `STALE/HASH_MISMATCH` | `NOT_STABILIZED`; historical thermal unresolved | Raw 198.576 km observation preserved; no fit | Re-establish canonical generated-vs-active hash match before any new driving or interpretation |
| Porsche 917K | 1970; CLS035/FAM035; bias/cross-ply; supplier General/unknown | Short-pressure phase complete: baseline `FAIL`, staggered B `REVIEW`, 30F/35R C/C2 `REVIEW`; C2 repeats C within 0.023 psi; 29F/34R is the setup-only whole-grid inference | Unresolved; short screen cannot certify equilibrium | Store only; no fit | No further 917K driving now; retain the host-specific evidence and hold all shared coefficients |
| Ford Escort RS1600 | 1974; CLS022/FAM023; bias/cross-ply; supplier unresolved | Same-tire Brands Hatch A/B and clean AI evidence retained; provisional live pass | Unresolved | Unresolved | Preserve as the FAM023 comparison fixture; no shared retune from it alone |

## Common gate

Every new run must use the intended canonical TirePack, a matching car identity, a matching active/generated `tyres.ini` SHA-256, and `physicsHashMatch=true`. A `STALE`, `HASH_MISMATCH`, unresolved, compatibility-only, or wrong-car identity blocks driving and calibration use.

For short pressure screens, use AI-reference duty, warmers OFF, 1× wear, fixed dry conditions and 10 Hz logging. The first proven full session-relative lap is warm-up; full session-relative laps 2–5 are the decision window even if AC reuses a higher raw lap counter. Preserve the raw AC mapping, requested and observed conditions separately. Pit/outlaps, partial laps, interrupted captures, insufficient-moving-sample laps and missing pressure channels fail closed. Do not merge duplicate logger captures of one physical run.

## Promotion rule

No pressure, compliance, Thermal V2, wear, or production knowledge numeric coefficient may be pooled or retuned until all four hosts have coherent hash-matched evidence collected under comparable protocols. Even then, a stable simulator signal is not automatically historical truth. Historical absolute pressure, temperature and life claims require independent period evidence.

Current program state: **HOLD SHARED COEFFICIENTS**. The 917K short-pressure phase is complete but host-specific; the GT40 identity gap and 250F live gap prevent cross-host fitting. The next live action is the canonical 250F baseline.
