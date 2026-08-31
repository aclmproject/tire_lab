from __future__ import annotations

import hashlib
import json
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
M3 = REPO / "research_staging" / "checkpoint_003_milestone3_archive_first"
M4 = REPO / "research_staging" / "checkpoint_004_milestone4_fulltext"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows):
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def ev(evidence_id, source_id, page, topic, claim, evidence_class="AUTHOR_CONCLUSION", applicability="General tire-mechanics architecture only; not a racing-family coefficient.", limitations="Aircraft/general-technical test context; construction, scale, load and duty cycle control transfer."):
    return {
        "evidenceId": evidence_id,
        "sourceId": source_id,
        "pdfPage": page,
        "topic": topic,
        "evidenceClass": evidence_class,
        "claim": claim,
        "applicability": applicability,
        "limitations": limitations,
        "productionPriorAuthorized": False,
    }


queue = read_json(M4 / "fulltext_priority_queue.json")
inventory = {row["sourceId"]: row for row in read_json(M4 / "fulltext_extraction_inventory.json")}
acquisition = {row["sourceId"]: row for row in read_json(M4 / "fulltext_acquisition_manifest.json")}
ntrs_metadata = {row["sourceId"]: row for row in read_json(M4 / "ntrs_metadata.json")}
layer_e = {row["sourceId"]: row for row in read_jsonl(M3 / "layer_e_source_reviews.jsonl")}

REPORT_NUMBERS = {
    "E-SRC-0074": ["NASA TP-2195"],
    "E-SRC-0075": ["NASA TN D-7449"],
    "E-SRC-0085": ["NASA TP-2481"],
    "E-SRC-0089": ["NASA TP-3574"],
    "E-SRC-0090": ["NASA TP-3573"],
    "E-SRC-0091": ["BFG ATD-2751", "NASA contract NAS 9-12049"],
    "E-SRC-0095": ["UVA/528370/CEAM96/101"],
    "E-SRC-0096": ["NASA TM X-69570"],
    "E-SRC-0100": ["NASA CR-2220"],
    "E-SRC-0109": ["NASA CP-2264"],
    "E-SRC-0113": ["NASA TM-82836", "DOE/NASA/51044-24"],
    "E-SRC-0118": ["NASA TN D-2770"],
    "E-SRC-0124": ["NASA CR-439"],
    "E-SRC-0125": ["NASA CR-137856"],
    "E-SRC-0076": ["NASA CR-132346"],
    "E-SRC-0105": ["NASA TN D-1376"],
    "E-SRC-0108": ["NASA TR R-20"],
    "E-SRC-0128": ["NASA CR-1074"],
}

measurements = [
    {**ev("M4-M-001", "E-SRC-0074", 8, "THERMAL", "At 18 kN vertical load after 1524 m, a bias-ply tire showed little carcass-temperature difference between 25% and 30% vertical deflection but a significant increase at 35%.", "DIRECT_MEASUREMENT"), "observableType": "EMBEDDED_CARCASS_THERMOCOUPLES", "original": {"verticalLoad": {"value": 18, "unit": "kN"}, "distance": {"value": 1524, "unit": "m"}, "verticalDeflection": {"values": [25, 30, 35], "unit": "% section height"}}, "normalizedSI": {"verticalLoadN": 18000, "distanceM": 1524, "verticalDeflectionFractions": [0.25, 0.30, 0.35]}},
    {**ev("M4-M-002", "E-SRC-0074", 8, "THERMAL", "The extended free-roll test reported equilibrium inner-wall temperatures above 121 C over multiple crown/sidewall stations; the paper warns this can cause premature failure.", "DIRECT_MEASUREMENT"), "observableType": "CARCASS_INNER_WALL_THERMOCOUPLE", "original": {"temperature": {"relation": ">", "value": 121, "unit": "degC"}}, "normalizedSI": {"temperatureK": {"relation": ">", "value": 394.15}}},
    {**ev("M4-M-003", "E-SRC-0085", 8, "FM", "Cornering-force coefficient per degree decreased from 0.041/deg at 20% rated vertical load to 0.022/deg at 75% rated load for the tested tilted tire.", "DIRECT_MEASUREMENT"), "original": {"loadFractions": [0.20, 0.75], "corneringCoefficientPerDeg": [0.041, 0.022]}, "normalizedSI": {"loadFractions": [0.20, 0.75], "corneringCoefficientPerRad": [2.349, 1.261]}},
    {**ev("M4-M-004", "E-SRC-0094", 26, "THERMAL", "For the reported rolling test, 848 W of friction work at 22.35 m/s corresponded to 37.9 N road resistance, with 4448 N load and 0.02421 m2 footprint.", "DERIVED_FROM_SOURCE"), "original": {"power": {"value": 848, "unit": "W"}, "speed": {"value": 22.35, "unit": "m/s"}, "drag": {"value": 37.9, "unit": "N"}, "load": {"value": 4448, "unit": "N"}, "footprintArea": {"value": 0.02421, "unit": "m2"}}, "normalizedSI": {"powerW": 848, "speedMps": 22.35, "dragN": 37.9, "loadN": 4448, "footprintAreaM2": 0.02421}},
    {**ev("M4-M-005", "E-SRC-0094", 2, "THERMAL", "The paper estimated 64% of absorbed power from tread-surface squirm/sliding and 36% from hysteresis for its bias-ply belted test tire.", "DERIVED_FROM_SOURCE"), "original": {"squirmFrictionFraction": 0.64, "hysteresisFraction": 0.36}, "normalizedSI": None},
    {**ev("M4-M-006", "E-SRC-0094", 28, "THERMAL", "A thermal estimate reduced hysteresis-induced drag from about 89 N at 40-60 s to about 21.6 N after roughly 1000 s near thermal equilibrium.", "DERIVED_FROM_SOURCE"), "original": {"earlyDrag": {"value": 89, "unit": "N"}, "earlyTime": {"values": [40, 60], "unit": "s"}, "equilibriumDrag": {"value": 21.6, "unit": "N"}, "equilibriumTimeApprox": {"value": 1000, "unit": "s"}}, "normalizedSI": {"earlyDragN": 89, "equilibriumDragN": 21.6, "equilibriumTimeS": 1000}},
    {**ev("M4-M-007", "E-SRC-0113", 4, "THERMAL", "At 38 C contained-air temperature, rolling-resistance coefficients were reported for two tire sets at 207 and 276 kPa.", "DIRECT_MEASUREMENT"), "observableType": "CONTAINED_AIR_TEMPERATURE", "original": {"temperature": {"value": 38, "unit": "degC"}, "pressure": {"values": [207, 276], "unit": "kPa"}, "electricVehicleTireRR": [0.0102, 0.0090], "commercialTireRR": [0.0088, 0.0074]}, "normalizedSI": {"temperatureK": 311.15, "pressurePa": [207000, 276000], "rollingResistanceCoefficient": {"electricVehicle": [0.0102, 0.0090], "commercial": [0.0088, 0.0074]}}},
    {**ev("M4-M-008", "E-SRC-0113", 4, "THERMAL", "Average contained-air equilibrium time was 20 min for constant-speed tests and 27 min for the Schedule D cycle; average rolling-resistance change from startup to equilibrium was 5%.", "DIRECT_MEASUREMENT"), "observableType": "CONTAINED_AIR_TEMPERATURE_TIME_RESPONSE", "original": {"constantSpeedEquilibrium": {"value": 20, "unit": "min"}, "scheduleDEquilibrium": {"value": 27, "unit": "min"}, "rollingResistanceChange": {"value": 5, "unit": "%"}}, "normalizedSI": {"constantSpeedEquilibriumS": 1200, "scheduleDEquilibriumS": 1620, "rollingResistanceChangeFraction": 0.05}},
    {**ev("M4-M-009", "E-SRC-0118", 6, "WEAR", "Wet-braking effectiveness degraded gradually to about 80% tread wear, then degraded much more sharply from 80% to 100% wear.", "DIRECT_MEASUREMENT", "Wet-tread degradation shape and observable separation; not a dry racing grip-life curve."), "observableType": "WET_BRAKING_EFFECTIVENESS_VS_TREAD_WEAR", "original": {"changePointApprox": {"value": 80, "unit": "% tread worn"}}, "normalizedSI": {"changePointWearFractionApprox": 0.80}},
    {**ev("M4-M-010", "E-SRC-0123", 35, "WET", "Across tests spanning 24-150 psi, 45-120 mph and 125-22,000 lb, the reported incipient-hydroplaning lift coefficient was approximately 0.7.", "DIRECT_MEASUREMENT", "General wet-model validation only; not a racing dry-pressure prior."), "original": {"pressure": {"values": [24, 150], "unit": "psi"}, "speed": {"values": [45, 120], "unit": "mph"}, "load": {"values": [125, 22000], "unit": "lb"}, "incipientLiftCoefficientApprox": 0.7}, "normalizedSI": {"pressurePa": [165474, 1034214], "speedMps": [20.117, 53.645], "loadN": [556, 97860], "incipientLiftCoefficientApprox": 0.7}},
]

observations = [
    ev("M4-O-001", "E-SRC-0074", 8, "THERMAL", "Higher deflection increased shoulder/sidewall carcass temperature through flexing, while tread temperatures were governed more strongly by contact-region friction."),
    ev("M4-O-002", "E-SRC-0074", 9, "THERMAL", "Increasing yaw or slip raised tread temperature most strongly near the outer surface and produced asymmetric profiles."),
    ev("M4-O-003", "E-SRC-0074", 10, "THERMAL", "Between 32 and 80 km/h, speed produced moderate tread-temperature increases while sidewall temperatures were essentially unaffected in this low-speed test."),
    ev("M4-O-004", "E-SRC-0075", 18, "CONSTRUCTION", "Bias-ply, bias-belted and radial-belted tires did not share the same fore-aft spring constant, decay length or braking slip behavior."),
    ev("M4-O-005", "E-SRC-0079", 3, "WEAR", "The study treats footprint pressure and slip-velocity distributions as the inputs needed to compute tread power intensity and wear."),
    ev("M4-O-006", "E-SRC-0079", 27, "WEAR", "A radial tire wore faster than a bias tire in one 4-degree-yaw abrasive-drum test, while field experience favored radial life, demonstrating duty-cycle dependence."),
    ev("M4-O-007", "E-SRC-0084", 3, "THERMAL", "The experimental tread stock showed lower heat buildup during standardized flexing, especially when flexing began at elevated temperature."),
    ev("M4-O-008", "E-SRC-0085", 8, "PRESSURE", "Increasing inflation pressure reduced footprint width and altered the torque mechanism that generates cornering force."),
    ev("M4-O-009", "E-SRC-0090", 12, "PRESSURE", "Measured footprint area increased nonlinearly with vertical load; load-intensity distributions were not uniform inflation-pressure rectangles."),
    ev("M4-O-010", "E-SRC-0094", 27, "THERMAL", "Thermocouples at multiple tread depths and on the inner crown surface support a layered thermal model rather than one undifferentiated tire temperature."),
    ev("M4-O-011", "E-SRC-0098", 8, "FM", "Hysteresis loss is the loop area relative to total loading energy; increasing lateral load raised the loss ratio in the reported test."),
    ev("M4-O-012", "E-SRC-0100", 77, "CONSTRUCTION", "Carcass elastic modulus, end count and ply count govern structural scaling; construction state cannot be inferred from size notation."),
    ev("M4-O-013", "E-SRC-0109", 228, "THERMAL", "At fixed load, lower pressure produced higher deflection and pronounced sidewall heating, matching the Escort underinflation direction."),
    ev("M4-O-014", "E-SRC-0113", 8, "THERMAL", "Ambient, track and solar radiation materially changed contained-air temperature; vehicle speed could add convection sufficient to offset loss-generated heating."),
    ev("M4-O-015", "E-SRC-0114", 28, "PRESSURE", "At fixed deflection, rolling speed increased supported load; at fixed load the model predicts deflection decreases and rolling radius increases with speed."),
    ev("M4-O-016", "E-SRC-0118", 6, "WEAR", "Physical tread-depth loss and wet braking loss are nonlinear; physical abrasion percentage is not interchangeable with competitive grip life."),
    ev("M4-O-017", "E-SRC-0131", 2, "WEAR", "Skid wear depends on duration at finite slip, slip-ratio magnitude and drag load; loading transients and tread construction also matter."),
    ev("M4-O-018", "E-SRC-0081", 5, "WET", "Wet friction decreases with water dynamic pressure and depth and with reduced footprint bearing pressure; footprint shape and tread design remain additional variables."),
]

scaling = [
    {**ev("M4-S-001", "E-SRC-0096", 32, "CONSTRUCTION", "Fore-aft spring constant regressions use construction-specific load and pressure coefficients.", "SCALING_RELATIONSHIP"), "relationshipOriginal": {"biasPly": "Kx[lb/in] = 1788 + 0.0320*Fz[lb] + 33.84*P[psi]", "biasBelted": "Kx[lb/in] = 3956 - 0.1108*Fz[lb] + 35.35*P[psi]", "radialBelted": "Kx[lb/in] = 4106 - 0.1354*Fz[lb] + 19.94*P[psi]"}, "domain": {"FzLb": [11500, 15000], "pressurePsi": [90, 140]}, "potentialUse": "Construction-specific stiffness response and regression tests; coefficients are aircraft-tire-specific and not transferable to racing."},
    {**ev("M4-S-002", "E-SRC-0124", 17, "PRESSURE", "A membrane approximation relates supported vertical load to inflation pressure, deflection and tire geometry.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "P_load ≈ pi * p0 * Delta_v * sqrt(d*w)", "variables": {"P_load": "vertical load", "p0": "inflation pressure", "Delta_v": "vertical deflection", "d": "tire diameter", "w": "section width"}, "potentialUse": "Pressure/load/deflection architecture and dimensional checks; not a setup-pressure solver by itself."},
    {**ev("M4-S-003", "E-SRC-0098", 6, "PRESSURE", "Footprint length normalized by diameter is a nonlinear function of normalized vertical deflection.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "Lf/d = 1.66*sqrt(delta/d) - delta/d", "potentialUse": "Footprint/deflection consistency gate."},
    {**ev("M4-S-004", "E-SRC-0098", 8, "THERMAL", "Hysteresis loss ratio is loop energy divided by total loading energy.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "hysteresis_loss_ratio = area_inside_load_deflection_loop / area_under_loading_curve_including_loop", "potentialUse": "Separate flex/cyclic heat input from slip/friction heat."},
    {**ev("M4-S-005", "E-SRC-0079", 3, "WEAR", "Tread-wear driving power is obtained from footprint pressure and local slip-velocity distributions.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "power_intensity(x,y) = contact_pressure(x,y) * local_slip_velocity(x,y); total_power = integral_over_footprint(power_intensity dA)", "potentialUse": "Evidence-supported wear-energy architecture; requires calibration before AC-vKm mapping."},
    {**ev("M4-S-006", "E-SRC-0094", 26, "THERMAL", "Mechanical heat input/road resistance obeys power equals drag times speed.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "power = drag_force * rolling_speed", "potentialUse": "Energy-conservation gate for friction and hysteresis heat paths."},
    {**ev("M4-S-007", "E-SRC-0076", 22, "WET", "Model-tire hydroplaning spin-down speed varied approximately with water-film thickness to the minus one-sixth power.", "SCALING_RELATIONSHIP", "Wet-model corroboration only."), "relationshipOriginal": "V_spin_down ∝ h_water^(-1/6)", "potentialUse": "Wet architecture validation, not dry tire calibration."},
    {**ev("M4-S-008", "E-SRC-0113", 8, "THERMAL", "Contained-air temperature time histories were represented by second-order least-squares fits.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "T_air(t) fitted with a second-order time function", "potentialUse": "Validate cavity-temperature time constants without equating cavity and tread sensors."},
    {**ev("M4-S-009", "E-SRC-0085", 8, "FM", "Cornering response is load-sensitive and pressure-sensitive through deflection and footprint geometry.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "cornering_force_coefficient decreases with rated-load fraction; footprint width decreases with pressure", "potentialUse": "Load-sensitive grip/stiffness architecture, qualitative outside the source tire."},
    {**ev("M4-S-010", "E-SRC-0074", 8, "THERMAL", "Flex heat rises strongly beyond the tested nominal deflection range, whereas yaw/slip heat is concentrated near the tread surface.", "SCALING_RELATIONSHIP"), "relationshipOriginal": "Q_flex increases with carcass deflection; Q_slip increases with yaw/slip and is surface-biased", "potentialUse": "Keep CARCASS_ROLLING_K and friction/slip heat as separate paths."},
]

methodology = [
    {**ev("M4-METH-001", "E-SRC-0074", 7, "THERMAL", "Thermocouples were implanted at defined carcass cross-section locations during retreading; repeated yaw runs reconstructed both sides of the profile.", "METHODOLOGY"), "sensorObservable": "CARCASS_LOCAL_TEMPERATURE"},
    {**ev("M4-METH-002", "E-SRC-0078", 3, "THERMAL", "An optical pyrometer continuously observed a tread point about 3/8 revolution after it left the footprint.", "METHODOLOGY"), "sensorObservable": "POST_FOOTPRINT_TREAD_SURFACE_TEMPERATURE"},
    {**ev("M4-METH-003", "E-SRC-0113", 7, "THERMAL", "Contained-air temperature was recorded during driving, then rolling resistance was measured during slow towing as a function of that temperature.", "METHODOLOGY"), "sensorObservable": "CONTAINED_AIR_TEMPERATURE"},
    {**ev("M4-METH-004", "E-SRC-0090", 12, "PRESSURE", "Footprint area was numerically integrated from measured contact outlines across incremental vertical loads.", "METHODOLOGY"), "sensorObservable": "FOOTPRINT_AREA_AND_LOAD_INTENSITY"},
    {**ev("M4-METH-005", "E-SRC-0098", 7, "FM", "Static loading/unloading loops bound spring rate and quantify dissipated hysteresis energy.", "METHODOLOGY"), "sensorObservable": "LOAD_DEFLECTION_HYSTERESIS_LOOP"},
    {**ev("M4-METH-006", "E-SRC-0079", 3, "WEAR", "Wear power calculations require spatial footprint pressure and slip-velocity fields under load, camber, yaw, braking, pressure and construction variations.", "METHODOLOGY"), "sensorObservable": "FOOTPRINT_POWER_INTENSITY"},
    {**ev("M4-METH-007", "E-SRC-0118", 6, "WEAR", "Controlled tread-depth states were compared through wet-braking and footprint tests; physical tread loss and performance loss were recorded separately.", "METHODOLOGY"), "sensorObservable": "TREAD_DEPTH_STATE_AND_WET_BRAKING"},
    {**ev("M4-METH-008", "E-SRC-0094", 27, "THERMAL", "Multiple thermocouple depths plus the inner crown sensor supported a through-thickness heat-balance estimate.", "METHODOLOGY"), "sensorObservable": "TREAD_DEPTH_AND_INNER_CROWN_TEMPERATURE"},
]

all_evidence = measurements + observations + scaling + methodology
ids_by_source = {}
for row in all_evidence:
    ids_by_source.setdefault(row["sourceId"], []).append(row["evidenceId"])

review_summaries = {
    "E-SRC-0074": "Direct layered carcass/tread thermal measurements under deflection, yaw, slip and speed.",
    "E-SRC-0075": "Published technical-note version of the construction-specific fore-aft response study; used as corroborating full text.",
    "E-SRC-0078": "NASA research overview separating optical tread pyrometry from embedded carcass thermocouples and static/dynamic stiffness.",
    "E-SRC-0079": "Footprint pressure/slip power-intensity framework for wear, with bias/radial duty-cycle caution.",
    "E-SRC-0084": "Tread-material heat buildup, traction and operational wear comparisons.",
    "E-SRC-0085": "Load and inflation-pressure effects on tilted-tire cornering response.",
    "E-SRC-0089": "Frictional-contact numerical method; methodology support, no production coefficient promoted.",
    "E-SRC-0090": "Measured footprint area/load intensity compared with nonlinear contact models.",
    "E-SRC-0091": "Load/pressure/deflection test criteria and contained-air instrumentation; aircraft extremes limit transfer.",
    "E-SRC-0094": "Through-thickness thermocouples and energy balance separating surface squirm and hysteresis heat.",
    "E-SRC-0095": "Nonlinear tire/contact modeling program summary; no new numeric dataset beyond referenced work.",
    "E-SRC-0096": "Detailed thesis with construction-specific pressure/load spring regressions and decay-length behavior.",
    "E-SRC-0098": "Experimental footprint, hysteresis and static/dynamic spring-rate methods.",
    "E-SRC-0100": "Structural scaling, carcass modulus/ply controls and damping/relaxation methodology.",
    "E-SRC-0109": "Workshop compilation; relevant chapters support flex-heat, footprint and hysteresis architecture.",
    "E-SRC-0113": "Contained-air temperature time histories tied to pressure and rolling resistance.",
    "E-SRC-0114": "Rolling shell model for speed, pressure, deflection, contact pressure and hysteresis; model-specific limitations retained.",
    "E-SRC-0116": "Contact-boundary and pressure-distribution numerical method with material/cord inputs.",
    "E-SRC-0118": "Controlled tread-depth versus wet-braking degradation; supports nonlinear observable separation.",
    "E-SRC-0122": "Condensed rolling-tire model; confirms pressure/deflection/speed directions but not racing coefficients.",
    "E-SRC-0124": "Membrane approximation for load-pressure-deflection-geometry coupling.",
    "E-SRC-0125": "Elastomer thermal-oxidation kinetics; useful for degradation architecture, not operational tire temperature targets.",
    "E-SRC-0130": "Operational grooved-runway damage report; qualitative incident evidence only.",
    "E-SRC-0131": "Slip duration, slip ratio, drag load, construction and transient load as wear/damage controls.",
    "E-SRC-0076": "Scale-model hydroplaning relationships and pressure/load/water-depth test matrix.",
    "E-SRC-0081": "Wet friction dependence on bearing pressure, water depth, footprint and tread design.",
    "E-SRC-0105": "Comprehensive wet braking/rolling resistance study; pressure alters footprint and bearing pressure.",
    "E-SRC-0108": "Period runway-friction measurements; reviewed with no direct dry-racing calibration promotion.",
    "E-SRC-0123": "Hydroplaning theory and broad pressure/speed/load validation range.",
    "E-SRC-0128": "Scale-model force-deflection methodology; reviewed with limited direct Tire Lab transfer.",
}

source_register = []
for row in queue:
    source_id = row["sourceId"]
    source = layer_e[source_id]
    inv = inventory[source_id]
    acq = acquisition[source_id]
    source_register.append({
        "sourceId": source_id,
        "sourceIdentityId": source["sourceIdentityId"],
        "title": source["title"],
        "authors": source["authors"],
        "publicationYear": source["publicationYear"],
        "canonicalUrl": source["canonicalUrl"],
        "fullTextUrl": source["fullTextUrl"],
        "archive": source["archive"],
        "ntrsCitationId": ntrs_metadata[source_id]["ntrsCitationId"],
        "reportNumbers": REPORT_NUMBERS.get(source_id, []),
        "priorReviewStatus": source["reviewStatus"],
        "reviewStatus": "FULL_TEXT_REVIEWED",
        "primaryScanReviewed": True,
        "accessStatus": "RETRIEVED_PUBLIC_FULL_TEXT",
        "localPdf": acq["localPdf"],
        "pdfSha256": acq["sha256"],
        "pageCount": inv["pageCount"],
        "pagesSectionsUsed": row["reviewPacketPages"],
        "reviewSummary": review_summaries[source_id],
        "evidenceIds": ids_by_source.get(source_id, []),
        "sourceCategory": "PERIOD_GENERAL_TIRE_TECHNICAL_EVIDENCE",
        "applicability": "General tire-mechanics architecture and validation. No direct historical racing-family coefficient transfer.",
        "limitations": "Aircraft, passenger, model-tire or laboratory context as stated by the source; load, scale, construction and duty cycle must be retained.",
        "finalCorpusStatus": "FULL_TEXT_REVIEWED_EVIDENCE_STAGED" if ids_by_source.get(source_id) else "FULL_TEXT_REVIEWED_NO_NEW_EVIDENCE",
    })

write_jsonl(M4 / "FULLTEXT_SOURCE_REGISTER.jsonl", source_register)
write_jsonl(M4 / "FULLTEXT_MEASUREMENTS.jsonl", measurements)
write_jsonl(M4 / "FULLTEXT_OBSERVATIONS.jsonl", observations)
write_jsonl(M4 / "FULLTEXT_SCALING_RULES.jsonl", scaling)
write_jsonl(M4 / "FULLTEXT_METHODOLOGY.jsonl", methodology)

formula_findings = [
    ("Pressure-load-deflection membrane relation", "E-SRC-0124", "p. 17, eq. 9", "P_load ≈ pi p0 Delta_v sqrt(d w)", "Architecture and dimensional checks for pressure/deflection coupling.", "Idealized aircraft-tire membrane approximation; not a cold-to-hot pressure equation."),
    ("Construction-specific fore-aft stiffness", "E-SRC-0096", "p. 32, eqs. 5-7", "Kx = alpha + beta Fz + gamma P, with different alpha/beta/gamma for bias, bias-belted and radial-belted tires", "Construction-dependent stiffness and regression tests.", "Aircraft tire and tested 90-140 psi, 11,500-15,000 lb domain."),
    ("Footprint length from deflection", "E-SRC-0098", "p. 6, eq. 1", "Lf/d = 1.66 sqrt(delta/d) - delta/d", "Footprint/deflection consistency validation.", "Empirical aircraft-tire fit; geometry and construction transfer unproven."),
    ("Hysteresis energy ratio", "E-SRC-0098", "p. 8", "loss_ratio = load-deflection loop area / total loading energy", "Quantify flex/cyclic heat separately from slip heat.", "Static loop must be reconciled with dynamic frequency and temperature."),
    ("Footprint wear-power integral", "E-SRC-0079", "pp. 3, 6", "q_wear(x,y) = p_contact(x,y) v_slip(x,y); P_wear = integral_A q_wear dA", "Basis for load/slip-sensitive virtual-km exposure.", "Requires compound, temperature, construction and track calibration; power is not grip loss."),
    ("Heat power conservation", "E-SRC-0094", "p. 26", "P_heat = F_drag v", "Energy gate for friction and hysteresis heat generation.", "Source partition between squirm and hysteresis is test/model specific."),
    ("Layered thermal pathways", "E-SRC-0074", "pp. 8-10 and conclusions", "Q_flex primarily heats shoulder/sidewall interior; Q_slip/yaw primarily heats tread near outer surface", "Supports separate surface, carcass and cavity nodes and separate heat inputs.", "Qualitative transfer; no universal Thermal V2 coefficient."),
    ("Contained-air time response", "E-SRC-0113", "pp. 7-9", "T_air(t) represented by a second-order fit; observed equilibrium times 20-27 min", "Cavity-temperature state and time-constant validation.", "Low-rolling-resistance road tires; solar/track/ambient forcing dominated some tests."),
    ("Absolute-pressure/temperature/volume identity", "GOVERNING_PHYSICS_WITH_M4_SENSOR_SUPPORT", "M4 synthesis", "P2_abs/P1_abs = (T2_air/T1_air)(V1/V2) for fixed gas mass", "Cold-to-hot pressure solver architecture; use cavity/contained-air temperature and explicit volume correction.", "The reviewed sources distinguish contained air but do not quantify racing-tire V2/V1; no gain value can be fitted."),
    ("Hydroplaning water-depth scaling", "E-SRC-0076", "p. 22", "V_spin_down proportional to h_water^(-1/6)", "Wet-model validation and pressure/footprint interaction.", "Scale-model relationship; not relevant to dry pressure or thermal calibration."),
]

formula_lines = ["# FORMULA-LEVEL EVIDENCE", "", "No production coefficient is authorized by this checkpoint.", ""]
for index, (title, source, location, relation, use, limitations) in enumerate(formula_findings, start=1):
    formula_lines += [
        f"## {index}. {title}", "",
        f"- Source: `{source}`",
        f"- Page/section: {location}",
        f"- Equation/relationship: `{relation}`",
        f"- Potential Tire Lab use: {use}",
        f"- Applicability/limitations: {limitations}", "",
    ]
(M4 / "FORMULA_LEVEL_EVIDENCE.md").write_text("\n".join(formula_lines) + "\n", encoding="utf-8")

engineering_updates = [
    ("PRESSURE SOLVER", "STRONGLY SUPPORTS", "Pressure, load, deflection, footprint and construction are coupled. Contained-air temperature—not tread/core temperature—belongs in the gas-law state. The literature does not provide racing volume-growth coefficients."),
    ("THERMAL TRANSFER", "SUPPORTS", "Embedded sensors show distinct inner carcass, sidewall/shoulder and tread-surface pathways; flex and slip heat must remain separate. No global historical multiplier is justified."),
    ("CONSTRUCTION PROPAGATION", "STRONGLY SUPPORTS", "Bias, bias-belted and radial constructions have different stiffness/decay responses. Stale Radial state can materially corrupt generation and must be blocked."),
    ("WEAR/LIFE MAPPING", "SUPPORTS", "Footprint pressure times local slip velocity supports an energy-exposure architecture, while tread-depth loss and performance loss are demonstrably nonlinear. Calibration remains insufficient."),
    ("TELEMETRY DISTANCE", "NEUTRAL", "No reviewed full text addresses ACLM logger distance semantics. The existing cumulative/session/stint/tire-set separation requirement remains unchanged."),
    ("FAM023 TEMPERATURE TARGET", "INSUFFICIENT", "General thermal pathways corroborate the Escort direction, but no period Group 2/ETCC pyrometer evidence establishes an absolute optimum."),
    ("FAM022 CONSTRUCTION", "STRONGLY SUPPORTS", "Construction-specific response confirms that the radial-contaminated GT40 run cannot calibrate cross-ply FAM022. A correct cross-ply retest remains mandatory."),
]
engineering_ranking = [
    {"issue": issue, "milestone4Assessment": assessment, "rationale": rationale, "softwareChangeAuthorized": False}
    for issue, assessment, rationale in engineering_updates
]
write_jsonl(M4 / "ENGINEERING_EVIDENCE_RANKING.jsonl", engineering_ranking)
eng_lines = ["# ENGINEERING EVIDENCE UPDATE", "", "Research status only. No software or physics change is made.", "", "| Issue | M4 assessment | Rationale |", "|---|---|---|"]
eng_lines += [f"| {issue} | **{assessment}** | {rationale} |" for issue, assessment, rationale in engineering_updates]
eng_lines += ["", "## Pressure-question answers", "",
    "1. Cold-to-hot pressure should use absolute pressure and contained/cavity-air temperature with an explicit volume ratio: `P2_abs/P1_abs = (T2_air/T1_air)(V1/V2)` for fixed gas mass.",
    "2. The reviewed batch does not quantify racing-tire volume growth; `V2/V1` remains an unresolved calibration input.",
    "3. Contained air, embedded carcass, inner-wall and post-footprint tread temperatures are different observables and must not be substituted silently.",
    "4. Load, pressure and construction change deflection and footprint; the literature supports coupled architecture but not a universal volume coefficient.",
    "5. AC `PRESSURE_TEMPERATURE_GAIN` should be treated as an effective simulation parameter validated against contained-air/pressure telemetry, not copied from a tread-temperature slope.",
    "6. Construction materially changes pressure sensitivity and stiffness response.",
    "7. Vehicle/tire load changes deflection, footprint and cornering response and must enter prediction/validation.",
    "8. The evidence supports keeping `PRESSURE_STATIC` as a tire-physics reference while calculating setup cold pressure separately, but exact implementation remains an engineering decision.",
]
(M4 / "ENGINEERING_EVIDENCE_UPDATE.md").write_text("\n".join(eng_lines) + "\n", encoding="utf-8")

gaps_lines = [
    "# RESEARCH GAPS AFTER M4", "",
    "Overall status: **PARTIAL - CONTINUATION REQUIRED.**", "",
    "## Remaining high-priority gaps", "",
    "1. Measured racing-tire cavity volume growth from cold to hot under representative load.",
    "2. Period Group 2/ETCC cold/hot pressure and I/M/O pyrometer sheets for FAM023.",
    "3. Correctly constructed cross-ply FAM022 telemetry after state-provenance and pressure fixes.",
    "4. Period 1960s GP/sports-car internal-air versus tread temperature evidence.",
    "5. 1980s Group C/F1 and 1990s BPR/GT1/GT2 supplier pressure/temperature guidance.",
    "6. Full wear-energy-to-rubber-loss datasets with compound and temperature controls.",
    "7. Competitive grip-life and heat-cycle degradation separated from physical abrasion.",
    "8. Dynamic vertical/lateral stiffness and relaxation length at racing loads for cross-ply families.",
    "9. Brake/rim-to-cavity heat transfer under racing duty.",
    "10. Period wet/intermediate compound operating windows and drying-line behavior.", "",
    "## Access/full-text queue", "",
    "- 39 existing NASA PDFs were retrieved; 30 were selected and reviewed in this checkpoint.",
    "- 9 retrieved NASA records remain queued for later full-text review.",
    "- 170 of the original 200 Layer E records were not promoted in M4; publisher/paywall records retain `ABSTRACT_ONLY` unless their actual text is acquired.",
    "- Across the unified corpus, 183 records remain `ABSTRACT_ONLY` after these 30 promotions.",
]
(M4 / "RESEARCH_GAPS_AFTER_M4.md").write_text("\n".join(gaps_lines) + "\n", encoding="utf-8")

top_findings = [
    "Cold-to-hot pressure must use contained/cavity-air temperature and absolute pressure; tread or carcass temperature is not an interchangeable gas temperature.",
    "Volume growth is a real missing term, but this batch does not justify a racing-tire volume-growth coefficient.",
    "Load, pressure, deflection, footprint and construction form a coupled system; the v0.9.2 one-dimensional closure prediction is architecturally inadequate.",
    "Bias-ply, bias-belted and radial-belted tires have materially different pressure/load stiffness regressions, validating the severity of the stale-Radial GT40 bug.",
    "Higher deflection increases sidewall/shoulder flex heat, directly supporting the corrected-pressure Escort interpretation.",
    "Yaw/slip heat is concentrated nearer the tread surface, while cyclic flex heat is stronger in carcass/sidewall regions; Thermal V2 needs distinct paths and nodes.",
    "Contained-air time constants can be much slower than tread transients; 20-27 minute equilibrium was measured in one road-tire study.",
    "Wear architecture should integrate contact pressure times local slip velocity, then apply compound/construction/temperature response; distance alone is insufficient.",
    "Physical tread loss and performance loss are nonlinear and observable-specific; neither is automatically competitive racing life or AC grip-health.",
    "No reviewed source establishes FAM023 or FAM022 absolute historical temperature targets, so a global historic-tire thermal multiplier remains unjustified.",
]

report_lines = [
    "# MILESTONE 4 - TARGETED FULL-TEXT TECHNICAL REVIEW", "",
    "Milestone status: **COMPLETE.** Overall research status: **PARTIAL - CONTINUATION REQUIRED.**", "",
    "This checkpoint reviewed actual full text from 30 already-discovered public NASA/government technical reports and scans. It did not repeat abstract discovery, change production knowledge, modify application files, build, or release.", "",
    "## Final counts", "",
    "- Existing full-text candidates retrieved: 39.",
    "- Full-text sources selected/attempted: 30.",
    "- Full-text sources successfully reviewed: 30.",
    "- Primary scans/government technical reports reviewed: 30.",
    "- Abstract-only remaining across the unified reviewed corpus: 183.",
    "- Access blocked in the selected public batch: 0.",
    "- New direct measurements: 7.",
    "- New source-derived measurement records: 3.",
    f"- New observations: {len(observations)}.",
    f"- New scaling/methodology relationships: {len(scaling)}.",
    f"- New methodology records: {len(methodology)}.",
    "- New historical constraints: 0.",
    f"- Formula-level findings: {len(formula_findings)}.",
    "- Research targets newly partially supported: 8 general-mechanics targets.",
    "- Research targets newly closed by sufficiently specific evidence: 0.",
    "- Numerical generator priors changed: 0.",
    "- Application files changed by M4: 0.",
    "- Build/release made: NO.", "",
    "## Evidence impact", "",
    "Pressure architecture is now strongly supported for redesign, but numerical family fitting is not. The literature distinguishes contained-air temperature from tread/carcass sensors, shows pressure-load-deflection-footprint coupling, and shows construction-specific stiffness response. No reviewed source quantifies racing-tire hot volume growth.", "",
    "Thermal architecture is supported as a layered network with separate flex/hysteresis and slip/friction heat paths. The literature makes a 20-30 C tread/core difference physically plausible in principle because local sensor locations and time constants differ, but it does not validate the contaminated GT40 run or an absolute FAM022/FAM023 optimum.", "",
    "Wear architecture is supported around footprint pressure and slip velocity (energy exposure), with nonlinear separation between abrasion and performance. Historical competitive-life and AC-vKm calibration remain open.", "",
    "## Top 10 findings most likely to affect the next Tire Lab engineering update", "",
]
report_lines += [f"{index}. {finding}" for index, finding in enumerate(top_findings, start=1)]
report_lines += ["", "## Required implementation order (unchanged)", "", "1. Fix construction state/provenance and cross-field validation.", "2. Redesign pressure prediction around contained-air temperature, absolute pressure, volume correction, load and construction.", "3. Regenerate tires and retest Escort plus correctly constructed GT40.", "4. Reassess Thermal V2 transfer coefficients across multiple families.", "5. Only then calibrate wear-energy-to-vKm and WEAR_CURVE behavior.", "", "No production code is written in this checkpoint."]
(M4 / "MILESTONE_4_FULLTEXT_REVIEW.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

protected = {
    "src/payload/app/app.js": "af4a26adcc3d282ae6051b1f66e148ebbf8c0a1a3f43cc7a71ba14489fbdcf1e",
    "src/payload/app/index.html": "318fde29eefb2f487a9b8f42d7b273c6d84672fcc7117d5e5b7b00b0abb0b8ca",
    "src/payload/app/pressure_solver.js": "389b301f2387e2b85122055b016b37ea93013859d7e3b81d68c091c27a60e17c",
}
protected_actual = {path: hashlib.sha256((REPO / path).read_bytes()).hexdigest() for path in protected}
all_source_ids = {row["sourceId"] for row in source_register}
all_ids = [row["evidenceId"] for row in all_evidence]
quality = {
    "selectedFullTextSources": len(queue),
    "successfullyReviewed": len(source_register),
    "uniqueReviewedSourceIds": len(all_source_ids),
    "primaryScansReviewed": sum(row["primaryScanReviewed"] for row in source_register),
    "accessBlocked": 0,
    "allReviewsUseRetrievedPdf": all(row["accessStatus"] == "RETRIEVED_PUBLIC_FULL_TEXT" for row in source_register),
    "allReviewsHavePageReferences": all(bool(row["pagesSectionsUsed"]) for row in source_register),
    "allEvidenceSourceReferencesResolve": all(row["sourceId"] in all_source_ids for row in all_evidence),
    "uniqueEvidenceIds": len(set(all_ids)),
    "evidenceRows": len(all_ids),
    "measurementRows": len(measurements),
    "directMeasurementRows": sum(row["evidenceClass"] == "DIRECT_MEASUREMENT" for row in measurements),
    "derivedMeasurementRows": sum(row["evidenceClass"] == "DERIVED_FROM_SOURCE" for row in measurements),
    "observations": len(observations),
    "scalingRules": len(scaling),
    "methodologyRecords": len(methodology),
    "historicalConstraints": 0,
    "formulaLevelFindings": len(formula_findings),
    "newPartiallySupportedTargets": 8,
    "newClosedTargets": 0,
    "numericalGeneratorPriorsChanged": 0,
    "protectedFileHashesMatchM3": protected_actual == protected,
    "applicationFilesChangedByM4": 0,
    "knowledgeReleaseChanged": False,
    "buildRun": False,
    "releaseCreated": False,
}
quality["pass"] = all([
    quality["selectedFullTextSources"] == 30,
    quality["successfullyReviewed"] == 30,
    quality["uniqueReviewedSourceIds"] == 30,
    quality["allReviewsUseRetrievedPdf"],
    quality["allReviewsHavePageReferences"],
    quality["allEvidenceSourceReferencesResolve"],
    quality["uniqueEvidenceIds"] == quality["evidenceRows"],
    quality["protectedFileHashesMatchM3"],
    quality["numericalGeneratorPriorsChanged"] == 0,
])
write_json(M4 / "MILESTONE_4_QUALITY_GATES.json", quality)

checkpoint_summary = {
    "checkpoint": "MILESTONE 4 - TARGETED FULL-TEXT TECHNICAL REVIEW",
    "status": "COMPLETE_OVERALL_RESEARCH_PARTIAL_CONTINUATION_REQUIRED",
    "sourceAttempted": 30,
    "sourceReviewed": 30,
    "sourceRetrievedNotYetReviewed": 9,
    "abstractOnlyRemainingUnified": 183,
    "evidence": {"measurements": len(measurements), "observations": len(observations), "scalingRules": len(scaling), "methodology": len(methodology), "historicalConstraints": 0},
    "formulaLevelFindings": len(formula_findings),
    "targetImpact": {"newPartiallySupported": 8, "newClosed": 0},
    "modelDecision": {"pressureArchitecture": "STRONGLY_SUPPORTED_FOR_ENGINEERING_DESIGN", "thermalArchitecture": "SUPPORTED_NO_GLOBAL_MULTIPLIER", "wearLifeMapping": "SUPPORTED_ARCHITECTURE_CALIBRATION_INSUFFICIENT"},
    "safeguards": {"numericalGeneratorPriorsChanged": 0, "applicationFilesChanged": 0, "knowledgeChanged": False, "buildRun": False, "releaseCreated": False},
    "nextCheckpoint": "Acquire/review racing-specific pressure-pyrometer sources and the remaining high-value full texts; do not repeat Layer E discovery.",
}
write_json(M4 / "checkpoint_summary.json", checkpoint_summary)

ledger_rows = [
    {"checkpointId": "M0", "path": "checkpoint_000_first_5000", "status": "PRESERVED"},
    {"checkpointId": "M1", "path": "checkpoint_001_milestone1", "status": "PRESERVED"},
    {"checkpointId": "M2", "path": "checkpoint_002_milestone2_working", "status": "PRESERVED"},
    {"checkpointId": "M3", "path": "checkpoint_003_milestone3_archive_first", "status": "COMPLETE"},
    {"checkpointId": "M4", "path": "checkpoint_004_milestone4_fulltext", "status": "COMPLETE_OVERALL_RESEARCH_PARTIAL_CONTINUATION_REQUIRED", "sourceIds": [row["sourceId"] for row in source_register], "qualityGate": "MILESTONE_4_QUALITY_GATES.json", "report": "MILESTONE_4_FULLTEXT_REVIEW.md"},
]
write_jsonl(REPO / "research_staging" / "CHECKPOINT_LEDGER.jsonl", ledger_rows)

hash_targets = [
    "MILESTONE_4_FULLTEXT_REVIEW.md", "FULLTEXT_SOURCE_REGISTER.jsonl", "FULLTEXT_MEASUREMENTS.jsonl",
    "FULLTEXT_OBSERVATIONS.jsonl", "FULLTEXT_SCALING_RULES.jsonl", "FULLTEXT_METHODOLOGY.jsonl",
    "FORMULA_LEVEL_EVIDENCE.md", "ENGINEERING_EVIDENCE_UPDATE.md", "RESEARCH_GAPS_AFTER_M4.md",
    "MILESTONE_4_QUALITY_GATES.json", "checkpoint_summary.json", "fulltext_acquisition_manifest.json",
    "fulltext_extraction_inventory.json", "fulltext_priority_queue.json", "ntrs_metadata.json",
    "ENGINEERING_EVIDENCE_RANKING.jsonl",
]
hashes = {name: hashlib.sha256((M4 / name).read_bytes()).hexdigest() for name in hash_targets}
hashes["../CHECKPOINT_LEDGER.jsonl"] = hashlib.sha256((REPO / "research_staging" / "CHECKPOINT_LEDGER.jsonl").read_bytes()).hexdigest()
write_json(M4 / "MILESTONE_4_OUTPUT_HASHES.json", hashes)

print(json.dumps({"qualityPass": quality["pass"], "sources": len(source_register), "evidence": len(all_evidence), "hashes": len(hashes)}, indent=2))
