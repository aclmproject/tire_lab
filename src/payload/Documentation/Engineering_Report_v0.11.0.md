# ACLM Historical Tire Lab v0.11.0 — Engineering Report

## Outcome

v0.11.0 adds a provenance-first evidence/model architecture and bundles Knowledge v1.9.0. It does not retune existing tire physics.

The generated pack now includes `ACLM_EVIDENCE_MODEL.json` and `ACLM_PARAMETER_CONFIDENCE.json`. The former captures the full tire identity tuple, evidence pipeline, model relationships and Calspan promotion decision. The latter labels model parameters as known, inferred, derived, experimental or unresolved. The PDF exposes the same boundary to users.

## Calspan 1976

The supplied retrieval package contains 9 indexed primary-report volumes, 3,630 pages, 380 Appendix B identities, 358 data packages and 708 measurement/control pages. Those pages are locators with raw OCR blocks. The package contains zero fully digitized force-curve XY point observations. It therefore contributes mechanism and extraction architecture, not production grip/stiffness/pressure/thermal/wear values.

## Compatibility and validation

- AC tire schema remains VERSION=10.
- Application version: 0.11.0.
- Knowledge version: 1.9.0; schema remains 1.2.0.
- Generator priors, measurements, scaling rules, fitment overrides and classes retain their v1.8.0 canonical hashes.
- 100/100 repository tests pass.
- All six canonical milestone fixture file hashes remain unchanged.
- The canonical installer hash is recorded in `manifests/ACLM_Tire_Lab_latest.json` after the final build.
