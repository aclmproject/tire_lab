# Four-host cross-ply validation program

The controlled comparison set is fixed: Maserati 250F + Ford GT40 Mk II + Porsche 917K + Ford Escort RS1600. Each host remains an independent simulator fixture until identity, protocol, and evidence gates permit comparison.

| Host | Historical mapping | Pressure evidence | Thermal evidence | Wear evidence | Next admissible action |
|---|---|---|---|---|---|
| Maserati 250F 6C | 1957; CLS102/FAM002; treaded bias; Pirelli fixture-only | Canonical v0.10.2 pack verified; 24/24 psi setup and 28/28 psi provisional ideal; no live screen yet | Unresolved | Reconstructed; no fit | Run the hash-matched AI-reference baseline in `MASERATI_250F_LIVE_TEST_CARD_v0102.md` |
| Ford GT40 Mk II | 1966; CLS021/FAM022; bias/cross-ply; supplier unresolved | Long Monza observation exists, but generated-vs-active state is `STALE/HASH_MISMATCH` | `NOT_STABILIZED`; historical thermal unresolved | Raw 198.576 km observation preserved; no fit | Re-establish canonical generated-vs-active hash match before any new driving or interpretation |
| Porsche 917K | 1970; CLS035/FAM035; bias/cross-ply; supplier General/unknown | Hash-matched Monza A/B complete: baseline `FAIL`, corrected `REVIEW`; LF/LR pass, RF/RR narrowly review | Unresolved; short screen cannot certify equilibrium | Store only; no fit | After a rebuilt logger persists intent, run at most one final 30F/35R confirmation; do not repeat baseline |
| Ford Escort RS1600 | 1974; CLS022/FAM023; bias/cross-ply; supplier unresolved | Same-tire Brands Hatch A/B and clean AI evidence retained; provisional live pass | Unresolved | Unresolved | Preserve as the FAM023 comparison fixture; no shared retune from it alone |

## Common gate

Every new run must use the intended canonical TirePack, a matching car identity, a matching active/generated `tyres.ini` SHA-256, and `physicsHashMatch=true`. A `STALE`, `HASH_MISMATCH`, unresolved, compatibility-only, or wrong-car identity blocks driving and calibration use.

For short pressure screens, use AI-reference duty, warmers OFF, 1× wear, fixed dry conditions, 10 Hz logging, lap 1 as warm-up, and complete laps 2–5 as the decision window. Preserve requested and observed conditions separately. Do not merge duplicate logger captures of one physical run.

## Promotion rule

No pressure, compliance, Thermal V2, wear, or production knowledge numeric coefficient may be pooled or retuned until all four hosts have coherent hash-matched evidence collected under comparable protocols. Even then, a stable simulator signal is not automatically historical truth. Historical absolute pressure, temperature and life claims require independent period evidence.

Current program state: **HOLD SHARED COEFFICIENTS**. The 917K result is host-specific; the GT40 identity gap and 250F live gap prevent cross-host fitting.
