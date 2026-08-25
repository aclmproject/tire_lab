# From Cord Carcass to Radial Slick

## Development of the ACLM Historical Tire Model

**Technical whitepaper — Tire Lab v0.6.0 / Knowledge v1.4.0**

### Abstract

ACLM Historical Tire Lab generates plausible, period-sensitive Assetto Corsa tire physics without pretending that undocumented historical measurements are known. Its governing principle is to preserve factual vehicle data, use public historical evidence to select a defensible tire architecture, and treat numerical performance values as calibration priors until validated by telemetry.

The current knowledge system contains 37 tire families, 37 calibrated racing classes, 21 curated vehicle profiles and 63 cited sources. A separate 1920–1999 historical index covers 40 class eras, 46 circuits and 118 representative competition models. Track and model entries supply classification context; they are never automatic grip multipliers.

### Method

1. **Direct vehicle evidence.** Tire Lab imports available Assetto Corsa geometry, mass, weight distribution, tire rates, reference loads, pressures, compounds and temperature settings.
2. **Historical classification.** Year, vehicle and racing class resolve to a tire family distinguishing bias/cross-ply, transition and radial construction, together with treaded or slick dry architecture.
3. **Evidence-weighted reconstruction.** Family priors cover carcass behavior, pressure, load sensitivity, grip references, camber, thermal behavior and wear. Exact documented fitments may override generic geometry; numerical physics remain reviewable priors.
4. **AC generation and validation.** The tool produces AC v10/CSP tire sections, lateral and longitudinal curves, pressure behavior, camber LUTs, temperature-performance curves, wear LUTs and wet metadata, then validates every referenced file.

### Racing-tire evolution

- **1920s–30s:** narrow, tall, treaded cord tires acted as compliant structural members. Low-pressure constructions, stronger beads and improved tread integrity became significant performance technologies.
- **1940s–50s:** material and carcass improvements produced increasingly specialized Grand Prix, endurance and touring tires while treaded bias construction remained normal.
- **1960s:** wider, lower cross-ply tires and distinct dry, wet and endurance specifications emerged. Radial slick development began before it became universal.
- **1970s:** slicks, aerodynamic load and compound choice made qualifying, race, endurance and wet tires fundamentally different operating systems.
- **1980s:** radial adoption spread unevenly. Bias, radial and transitional constructions coexisted across Formula One, Group C, IMSA, touring and stock-car competition.
- **1990s:** radial slicks matured into highly car- and championship-specific systems, while control-tire rules and deliberate grip-reduction regulations demonstrated that tire evolution was shaped by sporting policy as well as technology.

### Principal lessons

Racing-tire evolution was not linear. Construction cannot be inferred from year alone; vehicle, class, event and supplier context matter. A tire is also a coupled system: carcass, pressure, load, camber, temperature, grip and wear cannot be tuned independently without contradictions. Manufacturer identity is useful evidence but is not itself a physics model.

Historical records usually establish dimensions, suppliers, regulations and results more reliably than friction coefficients or temperature curves. The model therefore preserves provenance and uncertainty rather than converting every historical statement into a numerical parameter.

### Limitations and intended use

ACLM Historical Tire Lab is an independent, evidence-guided simulation and research project. It uses public historical sources, user-supplied vehicle data and explicitly identified modeling assumptions. It does not use, claim access to or imply possession of confidential or proprietary manufacturer information.

Generated physics are historical reconstructions, not recovered manufacturer engineering models. Manufacturer and series names are used solely for historical identification; no affiliation or endorsement is implied. Documented fitments and construction may be treated as historical facts, while grip, thermal, pressure and wear values remain calibration priors unless independently measured.

Every generated pack should be validated against simulation telemetry for the specific car, circuit and conditions.

### Conclusion

Tire Lab is not a universal tire formula. It is a structured method for avoiding anachronism: identify the correct historical family, preserve known vehicle evidence, generate internally consistent AC physics, expose uncertainty and improve the result when better evidence or telemetry becomes available.
