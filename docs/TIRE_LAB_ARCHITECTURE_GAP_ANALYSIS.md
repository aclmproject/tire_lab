# Tire Lab Architecture Gap Analysis

## Before v0.11.0 / Knowledge v1.9.0

The application already modeled CSP surface/carcass/core heat paths, pressure closure, construction-aware profile state, wear-life separation and family-specific generator priors. The principal gap was not absence of formulas; it was absence of a single enforceable route from source evidence to production parameters.

Evidence identity was partly hierarchical but not canonical across every family. Applicability was described in prose rather than an executable four-class decision. Page locators, observations and digitized curves were not formally separated. Parameter confidence was scattered across manifests. Force/moment, transient, pressure, geometry, thermal, wet and wear dependencies lacked one exported relationship map.

## Closed in this release

- Canonical 11-dimension tire identity.
- Six-stage evidence-to-production pipeline.
- Executable applicability and specificity ordering.
- Fail-closed numerical promotion gate.
- Construction-generation architecture with known mechanism versus inferred magnitude.
- Explicit steady-state versus transient separation.
- Fy/Fx/Mz/trail/camber/combined-slip relationship map.
- Three-state thermal architecture and pressure/geometry coupling.
- High-speed growth, loaded radius, deflection and contact-patch branches.
- Distinct wear/degradation/life/AC-health meanings.
- Failure taxonomy, wet/intermediate, scrub-in, hysteresis and inertia branches.
- Per-pack evidence and parameter-confidence sidecars.
- Full Calspan index preservation with record-type-safe observations.

## Still open

No Calspan plot is digitized. Original page images must be recovered and visually verified. Racing-family pressure, stiffness, transient, Mz/trail, high-speed growth, compound, wet and degradation calibration remain sparse for most historic families. The architecture can now hold these parameters safely; it does not claim they are known.

## Compatibility

This is an additive architecture change. AC `tyres.ini` remains VERSION=10. Knowledge schema remains 1.2.0. Generator priors, measurements, scaling rules, fitment overrides and classes are unchanged. Existing six canonical milestone fixtures retain their exact file hashes.
