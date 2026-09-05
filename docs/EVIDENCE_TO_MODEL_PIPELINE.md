# Evidence-to-Model Pipeline

The Tire Lab now uses a six-stage promotion path:

1. **Source capture** — immutable source hash, stable identifier, page locator and raw text/value.
2. **Observation** — test identity, units, conditions and channel. A plot/page is not a curve until coordinates exist.
3. **Applicability** — classify as `SAME_FAMILY`, `CLOSE_ANALOG`, `MECHANISM_ONLY` or `NOT_APPLICABLE` against the full tire identity tuple.
4. **Parameter candidate** — preserve value/range, uncertainty, derivation and dependency path.
5. **Controlled experiment** — isolate a hypothesis with fixture identity, requested conditions, expected observables and rejection rule.
6. **Production promotion** — require racing scope, no stronger conflicting evidence, regression certification and explicit provenance.

## Hierarchical identity

Evidence resolves through: era → discipline → class → supplier → product family → construction generation → event/year → size → axle → compound → wet state.

The system must keep distinctions rather than flatten them. A 1970 event-specific Firestone record does not become a universal Porsche 917 supplier. A passenger radial curve does not become a Group C tire curve. A construction mechanism can transfer while its magnitude remains unresolved.

## Promotion gate

A numerical candidate must have a source hash, locator, observation identity, at least two digitized points where a curve is claimed, explicit units/conditions, parameter provenance, uncertainty, at least `CLOSE_ANALOG` applicability, a controlled fixture and a passing regression. Low-confidence mapping or stronger conflicting evidence blocks promotion.

## Relationship map

- Pressure depends on cold pressure, contained-air temperature, cavity-volume change, vertical load, speed, construction and rim/geometry.
- Steady-state force is separate from force buildup. Lateral and longitudinal relaxation and Mz buildup/decay depend on load, pressure, speed and construction.
- Fy, Fx, Mz, pneumatic trail, camber thrust and combined slip remain linked but separately observable.
- Thermal state is surface, carcass/shoulder and contained air/core; slip work, hysteresis, brake heat and cooling feed different paths.
- Geometry includes unloaded/loaded radius, deflection, contact patch and high-speed growth.
- Wear separates physical abrasion, competitive degradation, service/stint durability and AC virtual-km grip health.
- Wet/intermediate, scrub-in, rolling resistance/hysteresis, mass/inertia and failure behavior are explicit branches.

Generated packs expose this state in `ACLM_EVIDENCE_MODEL.json` and `ACLM_PARAMETER_CONFIDENCE.json`.
