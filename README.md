# ACLM Historical Tire Lab

Assetto Corsa historical racing-tire research, calibration and tire-pack generation tool.

## Repository layout

- src/ — complete Windows installer and browser/PWA source package
- manifests/ — stable application update manifest
- knowledge/ — stable knowledge manifest and immutable versioned releases
- .github/workflows/ — reproducible migration/release automation

Current application release: **v0.7.0**  
Current knowledge release: **v1.7.0** (schema 1.2.0)

Release downloads are SHA-256 verified before use. The application retains a bundled offline fallback and last-known-good knowledge cache.

No software license has been declared for this repository yet.

## Methodology and independence

Tire Lab is an independent, evidence-guided simulation project using public historical sources, user-supplied AC physics and explicit modeling assumptions. It does not use or imply confidential or proprietary manufacturer information. Generated physics are reconstructions requiring telemetry validation.

See [the concise technical whitepaper](docs/ACLM_Historical_Tire_Lab_Whitepaper.md).

## Launcher policy

v0.6.1 uses one canonical desktop launcher. The installer removes exact legacy ACLM Tire Lab shortcuts, retires the in-app PWA installer, verifies the local server version and then opens the browser app.
