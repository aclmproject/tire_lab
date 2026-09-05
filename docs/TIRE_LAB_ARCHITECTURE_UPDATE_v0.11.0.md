# Tire Lab Architecture Update — v0.11.0

Application v0.11.0 and Knowledge v1.9.0 add evidence architecture without retuning production physics.

The app now loads `evidence_model.js` and `calspan_observations.js`. Every generated tire pack includes an evidence/model relationship manifest and a parameter-confidence manifest. The historical PDF adds an evidence-to-model section that states corpus size, applicability, digitization status and production behavior.

Knowledge v1.9.0 adds the tire identity hierarchy, six-stage evidence pipeline, construction architecture, model relationship architecture, Calspan corpus metadata and 85 nonnumeric research-family prior records. It adds nine Calspan volume sources. Frozen collections retain the v1.8.0 canonical hashes.

No pressure, grip, stiffness, load-sensitivity, camber, transient, thermal, wear, radius, mass or inertia number changed. The only score changes are evidence-routing/architecture readiness: +0.6 for four `CLOSE_ANALOG` road-derived touring families and +0.2 for `MECHANISM_ONLY` families. These are not calibration-confidence increases.

Validation: 100/100 Node tests pass. Six canonical milestone fixture file hashes are unchanged. The Knowledge validation record confirms identical hashes for generator priors, measurements, scaling rules, fitment overrides and classes.
