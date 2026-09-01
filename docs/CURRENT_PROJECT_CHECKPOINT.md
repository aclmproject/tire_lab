# ACLM Historical Tire Lab — current project checkpoint

Checkpoint basis: application v0.10.2, Knowledge v1.7.1, branch `codex/csp-thermal-v2-handoff-persistence` tracking `origin/codex/csp-thermal-v2`.

## Repository state

- Remote base: `27ab1b5` (`fix: fail closed on telemetry identity`).
- Local feature commit: `12a4eb8` (`Preserve 917K pressure A/B and harden telemetry starts`).
- The local branch is one commit ahead of the remote base before this documentation handoff.
- The feature commit prevents duplicate native-logger starts, persists pressure A/B run intent, and preserves the 917K A/B evidence and canonical decision window.
- No tire-physics, Thermal V2, wear, or Knowledge numerical coefficient changed.
- This Linux workspace cannot authenticate to GitHub and cannot run the required PowerShell canonical-installer pipeline. The authenticated Windows Desktop must push and certify the replacement installer.

## Porsche 917K result

- Generated-vs-active identity was resolved before driving; both accepted runs record active/generated `tyres.ini` SHA-256 `2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4`.
- Controlled AI-reference Monza 1966 baseline A and corrected B are complete.
- Canonical decision window: complete laps 2–5; lap 1 warm-up.
- Baseline A: `FAIL`.
- Corrected B: `REVIEW`; LF +0.365 psi and LR +0.398 psi pass, RF +0.529 psi and RR +0.616 psi review.
- The duplicate `04:48:55` capture is excluded; `04:48:54` is authoritative for that physical run.
- Preserve the canonical TirePack. Do not retune physics. A probable final confirmation setup is 30 psi front / 35 psi rear at all four respective axle corners, but confirmation must use the intent-persisting build.
- Thermal remains unresolved; wear remains **STORE, DO NOT FIT**.

## Four-host program

The cross-ply set remains Maserati 250F + Ford GT40 Mk II + Porsche 917K + Ford Escort RS1600. See `docs/CROSS_PLY_FOUR_HOST_PROGRAM.md`.

- 250F: CLS102/FAM002 taxonomy resolved; canonical pack verified; first hash-matched live baseline pending.
- GT40: long-run data retained, but generated-vs-active `STALE/HASH_MISMATCH` blocks fitting or further interpretation.
- 917K: hash-matched host-specific A/B complete; no shared retune.
- Escort: same-tire A/B and AI fixture retained; thermal/wear unresolved.

## Exact Desktop continuation

1. Push the local handoff commit(s) to `origin/codex/csp-thermal-v2` without force.
2. Run the complete Node suite in the authenticated checkout, including canonical ZIP tests.
3. Run `tools/Build-CanonicalInstaller.ps1` and `tests/Test-CanonicalPackage.ps1` on Windows.
4. Install that one replacement v0.10.2 build.
5. Confirm the logger reports active installed physics hash `MATCH` before any driving.
6. Next driving choice: one final 917K 30F/35R pressure confirmation, or the first 250F 24F/24R baseline. Do not start both without separately complete manifests.

## Guardrails

- No driving or calibration use unless `physicsHashMatch=true`.
- No thermal, wear, pressure-compliance, or production Knowledge numeric retune.
- Preserve raw CSVs and manifests, requested versus observed conditions, tire identity, A/B role, intended corrections, and duplicate-capture exclusions.
- Vehicle/year supplier evidence must not become a universal family/class supplier.
