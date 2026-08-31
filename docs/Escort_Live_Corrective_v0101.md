# ACLM Historical Tire Lab v0.10.1 — Escort live corrective

## Scope and calibration decision

This release corrects workflow and pressure-reference semantics. It does not change production Tire Knowledge v1.7.0, global Thermal V2 coefficients, the historical FAM023 tread-temperature optimum, wear scaling, carcass stiffness, or circuit-specific pressure offsets. The 1984/CLS022/FAM023 run is retained only as a simulator pressure diagnostic because its historical profile was incoherent.

## Root causes

1. The v0.10.0 solver silently used the requested/ambient 26 °C as its cold contained-air/core state. AC telemetry began near 34.2 °C core. With unity hot/cold volume ratio, 22.5 psi from 26→62 °C predicts about 27.0 psi; 23.0 psi from 34.2→62 °C predicts about 26.4 psi. The recorded initial/final state reproduces every final corner within roughly 0.02 psi under the same absolute-pressure relationship.
2. The prior FAM023 contained-air proxy came from a human-driven A/B fixture and was treated as universal. v0.10.1 labels `HUMAN_REFERENCE` and `AI_REFERENCE` separately. The AI fixture is simulator-only and does not replace the historical FAM023 optimum.
3. The Kunos Escort `setup.ini` exposes LF/RF/LR/RR pressure controls at 15–50 psi with `STEP=1`. A continuous 22.5 psi recommendation is therefore not selectable; nearest setup-grid pressure is 23 psi. This explains the observed quantization. It does not prove every Content Manager initialization rule.
4. Class/family periods were discarded when the selected context was built, so profile validation could not compare 1984 against the 1972–76 bounds. Contexts now carry both class and family ranges and generation blocks the mismatch.
5. Supplier lived only in the UI. It now has value, provenance, source IDs, confidence, reason and explicit-override state. Non-explicit supplier state is cleared on a class/family transition unless the new context supplies evidence; explicit overrides remain visible and non-authoritative when unsupported.
6. The browser could start the logger with a null manifest when no current generated file set existed. The logger then repeatedly reconstructed a minimal fallback, producing `appVersion: unknown`. v0.10.1 materializes and validates the generated manifest at logger start, caches it in the native process and merges it into the final sidecar through the shipped merge helper.

The reason AC initialized the tire core near 34.2 °C with 26 °C ambient is not verified. v0.10.1 therefore records the observed start as authoritative without inventing a universal +8 °C rule. The family/driver prediction is a named fixture-backed simulator prior and is superseded by direct telemetry whenever available.

## Cold-state logic

Old:

`cold state = requested ambient/reference field (26 °C)`

New priority:

1. observed AC initial core (`DIRECT_TELEMETRY`);
2. explicit setup/reference core entered by the user (`EXPLICIT_SETUP_REFERENCE`);
3. validated family + reference-driver AC fixture (`VALIDATED_AC_FIXTURE`), currently 34.2 °C for the FAM023 AI pressure-screening fixture;
4. ambient only as `AMBIENT_PROXY_UNRESOLVED`, with low confidence and no claim of equality.

The report separately retains ambient air, road temperature, AC initial core, contained-air hot estimate and reference setup temperature.

## Sidecar before and after

Before, when handoff failed:

```json
{
  "schema": "ACLM telemetry calibration manifest 1.0",
  "appVersion": "unknown",
  "observedACCondition": {"airTemperatureCStart": 26, "roadTemperatureCStart": 36},
  "loggerRuntime": {"samples": 4224}
}
```

After v0.10.1:

```json
{
  "schema": "ACLM telemetry calibration manifest 1.1",
  "appVersion": "0.10.1",
  "knowledgeVersion": "1.7.0",
  "family": "FAM023",
  "class": "CLS022",
  "construction": "bias",
  "constructionProvenance": {"provenance": "FAMILY_DEFAULT"},
  "supplier": "General / unknown",
  "supplierProvenance": {"provenance": "UNKNOWN_FALLBACK"},
  "userRequestedCondition": {"airTemperatureC": 26, "roadTemperatureC": 26, "wearMultiplier": 1, "sessionBlanketsEnabled": false},
  "tireBlanketCapability": {"definedTemperatureC": 70},
  "sessionBlanketStatus": {"enabled": false},
  "tireFileSha256": "…",
  "wearLutSha256": {"…": "…"},
  "temperatureLutSha256": {"…": "…"},
  "generatedConfiguration": {"…": "full immutable generated manifest copy"},
  "observedACCondition": {"airTemperatureCStart": 26, "roadTemperatureCStart": 36, "initialCoreTemperatureC": [34.19, 34.19, 34.24, 34.24], "rawAidTireRate": 0},
  "loggerRuntime": {"samples": 4224}
}
```

Requested wear 1x and raw `aidTireRate=0` remain separate. `BLANKETS_TEMP=70` is a tire-defined capability and no longer asserts that session warmers were enabled.

## Next live test

Use a fresh Escort pack with an in-period CLS022/FAM023 year, AI at Brands Hatch GP, warmers off, requested wear 1x and unchanged v0.10.1 generated pressures. Do not claim historical calibration success until that run passes the corrected workflow; GT40 testing follows afterward.
