"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { analyze: analyzeLongRun } = require("./analyze_long_run_telemetry.js");

const WHEELS = ["fl", "fr", "rl", "rr"];

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell); cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells;
}

function loadCsv(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  const rows = lines.filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
  return { text, headers, rows };
}

function number(row, key) {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : null;
}

function finite(values) { return values.filter(Number.isFinite); }
function mean(values) { const a = finite(values); return a.length ? a.reduce((sum, value) => sum + value, 0) / a.length : null; }
function quantile(values, q) {
  const a = finite(values).sort((left, right) => left - right);
  if (!a.length) return null;
  const position = (a.length - 1) * q;
  const low = Math.floor(position);
  const fraction = position - low;
  return a[low] + (a[Math.min(low + 1, a.length - 1)] - a[low]) * fraction;
}
function stats(values) {
  const a = finite(values);
  return { count: a.length, mean: mean(a), p95: quantile(a, 0.95), p99: quantile(a, 0.99), min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null };
}
function regression(points) {
  const usable = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (usable.length < 2) return { count: usable.length, slope: null };
  const mx = mean(usable.map(([x]) => x));
  const my = mean(usable.map(([, y]) => y));
  const denominator = usable.reduce((sum, [x]) => sum + (x - mx) ** 2, 0);
  return { count: usable.length, slope: denominator ? usable.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) / denominator : null };
}

function classifyPressure(error) {
  if (!Number.isFinite(error)) return "UNRESOLVED";
  return Math.abs(error) <= 0.5 ? "PASS" : Math.abs(error) <= 1.5 ? "REVIEW" : "FAIL";
}

function overallPressureClassification(perWheel) {
  const values = Object.values(perWheel || {}).map((item) => item.classification);
  if (values.includes("FAIL")) return "FAIL / pressure model mismatch";
  if (values.includes("REVIEW")) return "REVIEW";
  if (values.length && values.every((value) => value === "PASS")) return "PASS";
  return "UNRESOLVED";
}

function pressureWindowSummary(rows, lapWindow, idealFront, idealRear) {
  const selected = rows.filter((row) => lapWindow.includes(number(row, "lap")));
  const perWheel = Object.fromEntries(WHEELS.map((wheel) => {
    const targetPsi = wheel.startsWith("f") ? idealFront : idealRear;
    const meanPsi = mean(selected.map((row) => number(row, `pressure_psi_${wheel}`)));
    const errorPsi = Number.isFinite(meanPsi) ? meanPsi - targetPsi : null;
    return [wheel, { meanPsi, targetPsi, errorPsi, classification: classifyPressure(errorPsi) }];
  }));
  const frontPsi = mean([perWheel.fl.meanPsi, perWheel.fr.meanPsi]);
  const rearPsi = mean([perWheel.rl.meanPsi, perWheel.rr.meanPsi]);
  return {
    lapWindow,
    samples: selected.length,
    perWheel,
    axles: {
      front: { meanPsi: frontPsi, targetPsi: idealFront, errorPsi: frontPsi - idealFront, classification: classifyPressure(frontPsi - idealFront) },
      rear: { meanPsi: rearPsi, targetPsi: idealRear, errorPsi: rearPsi - idealRear, classification: classifyPressure(rearPsi - idealRear) }
    },
    overallClosureClassification: overallPressureClassification(perWheel)
  };
}

function groupByLap(rows) {
  const groups = new Map();
  for (const row of rows) {
    const lap = number(row, "lap");
    if (!Number.isInteger(lap) || lap < 0) continue;
    const group = groups.get(lap) || [];
    group.push(row);
    groups.set(lap, group);
  }
  return groups;
}

function lapSummary(rows, completeLaps) {
  const groups = groupByLap(rows);
  const complete = new Set(completeLaps);
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([lap, samples]) => {
    const positions = finite(samples.map((row) => number(row, "normalized_track_position")));
    return {
      lap,
      complete: complete.has(lap),
      samples: samples.length,
      coverage: positions.length ? { min: Math.min(...positions), max: Math.max(...positions) } : null,
      lapTimeMs: Math.max(...finite(samples.map((row) => number(row, "lap_time_ms"))).concat([0])),
      distanceKm: mean(samples.map((row) => number(row, "tire_set_distance_m"))) / 1000,
      speedKmh: stats(samples.map((row) => number(row, "speed_kmh"))),
      pressurePsi: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `pressure_psi_${wheel}`)))])),
      coreC: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `core_temp_c_${wheel}`)))])),
      wearRaw: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `wear_raw_${wheel}`)))]))
    };
  });
}

function resolveManifestIdentity(manifest, csvCompounds) {
  const active = manifest?.activeInstalledPhysics || null;
  const activeHash = active?.tyresIniSha256 || manifest?.activeTyresIniSha256 || manifest?.tireFileSha256 || null;
  const generatedHash = manifest?.generatedConfiguration?.tireFileSha256 || null;
  const observedCompound = csvCompounds.length === 1 ? csvCompounds[0] : null;
  const declared = active?.activeCompoundIdentity || manifest?.activeSelectedCompound || null;
  const declaredCompound = declared?.name || null;
  const declaredShortName = declared?.shortName || null;
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const acceptedObservedNames = [declaredCompound, declaredShortName, declaredCompound && declaredShortName ? `${declaredCompound} (${declaredShortName})` : null].filter(Boolean).map(normalize);
  return {
    activeTyresIniSha256: activeHash,
    generatedTyresIniSha256: generatedHash,
    generatedVsActive: activeHash && generatedHash ? (activeHash === generatedHash ? "MATCH" : "STALE/HASH_MISMATCH") : "UNRESOLVED",
    observedCompound,
    declaredActiveCompound: declaredCompound,
    declaredActiveShortName: declaredShortName,
    compoundIdentity: observedCompound && declaredCompound ? (acceptedObservedNames.includes(normalize(observedCompound)) ? "MATCH" : "REVIEW") : "UNRESOLVED",
    authority: activeHash ? "ACTIVE_INSTALLED_PHYSICS" : "MANIFEST_IDENTITY_INCOMPLETE"
  };
}

function renderMarkdown(report) {
  const f = (value, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : "null";
  const screen = report.pressure.shortScreen;
  const lines = [
    `# ACLM post-run calibration report`, "",
    `- Fixture: ${report.fixtureId || "unassigned"}`,
    `- Car / track: ${report.session.car || "unknown"} / ${report.session.track || "unknown"}`,
    `- CSV SHA-256: \`${report.inputs.csvSha256}\``,
    `- Active physics: **${report.identity.generatedVsActive}**; authority **${report.identity.authority}**`,
    `- Active compound: ${report.identity.observedCompound || "unresolved"}`,
    `- Complete laps: ${report.laps.complete.join(", ") || "none"}`,
    `- Partial/invalid laps: ${report.laps.partialOrInvalid.join(", ") || "none"}`,
    `- Distance: ${f(report.session.distanceKm)} km`, "",
    `## Canonical short pressure screen`, "",
    `Complete laps ${screen.lapWindow.join("–")} are the decision window. Status: **${screen.status}**; closure: **${screen.overallClosureClassification}**.`, "",
    `| Wheel | Start psi | Screen psi | Target psi | Error psi | Result |`,
    `|---|---:|---:|---:|---:|---|`,
    ...WHEELS.map((wheel) => {
      const start = report.pressure.perWheel[wheel].startPsi;
      const item = screen.perWheel[wheel];
      return `| ${wheel.toUpperCase()} | ${f(start)} | ${f(item.meanPsi)} | ${f(item.targetPsi)} | ${f(item.errorPsi)} | ${item.classification} |`;
    }), "",
    `Front axle: **${screen.axles.front.classification}**, ${f(screen.axles.front.errorPsi)} psi. Rear axle: **${screen.axles.rear.classification}**, ${f(screen.axles.rear.errorPsi)} psi.`, "",
    `The separate last-four-complete-lap diagnostic uses laps ${report.pressure.lateLapWindow.join("–")}; it does not replace the canonical short-screen window.`, "",
    `## Thermal`, "",
    `Engineering stability: **${report.thermal.engineeringStability}**. Historical thermal accuracy: **UNRESOLVED**.`, "",
    `| Wheel | Late core C | Core slope C/lap | Surface mean C | Surface p95 C | Surface max C | Surface-core delta C |`,
    `|---|---:|---:|---:|---:|---:|---:|`,
    ...WHEELS.map((wheel) => {
      const item = report.thermal.perWheel[wheel];
      return `| ${wheel.toUpperCase()} | ${f(item.lateCoreC)} | ${f(item.coreSlopeCPerLap)} | ${f(item.surface.mean)} | ${f(item.surface.p95)} | ${f(item.surface.max)} | ${f(item.surfaceCoreDeltaC)} |`;
    }), "",
    `## Wear and contamination`, "",
    `Wear remains **STORE, DO NOT FIT**. Off-track contaminated samples: ${report.contamination.offTrackSamples}. Incident-candidate samples: ${report.contamination.incidentCandidateSamples}.`, "",
    `| Wheel | Raw start | Raw end | Delta | Onset km | Slope / km |`,
    `|---|---:|---:|---:|---:|---:|`,
    ...WHEELS.map((wheel) => {
      const item = report.wear.perWheel[wheel];
      return `| ${wheel.toUpperCase()} | ${f(item.start)} | ${f(item.end)} | ${f(item.delta)} | ${f(item.onsetKm)} | ${f(item.slopePerKm, 6)} |`;
    }), "",
    `## Protocol classification`, "",
    `- Short pressure screen: ${report.protocol.shortPressureScreen.status}`,
    `- Extended thermal observation: ${report.protocol.extendedThermalObservation.status}`,
    `- This report does not automatically declare historical thermal accuracy.`
  ];
  return `${lines.join("\n")}\n`;
}

function analyzePostRun(csvFile, manifestFile, options = {}) {
  const { text, headers, rows } = loadCsv(csvFile);
  if (!rows.length) throw new Error("Telemetry CSV has no rows.");
  const manifest = manifestFile ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};
  const csvCompounds = [...new Set(rows.map((row) => String(row.compound || "").trim()).filter(Boolean))];
  const activeIdealFront = manifest?.activeInstalledPhysics?.activePressureIdealFrontPsi;
  const activeIdealRear = manifest?.activeInstalledPhysics?.activePressureIdealRearPsi;
  const idealFront = Number.isFinite(activeIdealFront) ? activeIdealFront : Number(options.idealFrontPsi ?? options.idealPsi ?? 28);
  const idealRear = Number.isFinite(activeIdealRear) ? activeIdealRear : Number(options.idealRearPsi ?? options.idealPsi ?? idealFront);
  const preliminary = analyzeLongRun(csvFile, { idealPsi: idealFront, fixtureId: options.fixtureId, requestedWearMultiplier: manifest?.requestedWearMultiplier || 1 });
  const completeLaps = preliminary.completeLaps;
  const lateComplete = completeLaps.slice(-4);
  const lateRows = rows.filter((row) => lateComplete.includes(number(row, "lap")));
  const laps = lapSummary(rows, completeLaps);
  const slopeLaps = completeLaps.slice(-10);
  const slopeLapRows = laps.filter((lap) => slopeLaps.includes(lap.lap));
  const classify = classifyPressure;
  const pressure = {};
  const thermal = {};
  const wear = {};
  const loads = {};
  const slip = {};
  for (const wheel of WHEELS) {
    const target = wheel.startsWith("f") ? idealFront : idealRear;
    const latePressure = mean(lateRows.map((row) => number(row, `pressure_psi_${wheel}`)));
    const lateCore = mean(lateRows.map((row) => number(row, `core_temp_c_${wheel}`)));
    const surfaceValues = lateRows.flatMap((row) => [number(row, `temp_inner_c_${wheel}`), number(row, `temp_middle_c_${wheel}`), number(row, `temp_outer_c_${wheel}`)]);
    const surface = stats(surfaceValues);
    const firstWear = number(rows[0], `wear_raw_${wheel}`);
    const lastWear = number(rows.at(-1), `wear_raw_${wheel}`);
    const onset = rows.find((row) => number(row, `wear_raw_${wheel}`) < 99.999);
    const distancePoints = rows.map((row) => [number(row, "tire_set_distance_m") / 1000, number(row, `wear_raw_${wheel}`)]);
    const slipAbs = rows.map((row) => Math.abs(number(row, `wheel_slip_raw_${wheel}`)));
    pressure[wheel] = { startPsi: number(rows[0], `pressure_psi_${wheel}`), byLap: Object.fromEntries(laps.map((lap) => [lap.lap, lap.pressurePsi[wheel]])), latePsi: latePressure, targetPsi: target, errorPsi: latePressure - target, classification: classify(latePressure - target) };
    thermal[wheel] = {
      startCoreC: number(rows[0], `core_temp_c_${wheel}`),
      coreByLap: Object.fromEntries(laps.map((lap) => [lap.lap, lap.coreC[wheel]])),
      lateCoreC: lateCore,
      coreSlopeCPerLap: regression(slopeLapRows.map((lap) => [lap.lap, lap.coreC[wheel]])).slope,
      surface: { inner: stats(lateRows.map((row) => number(row, `temp_inner_c_${wheel}`))), middle: stats(lateRows.map((row) => number(row, `temp_middle_c_${wheel}`))), outer: stats(lateRows.map((row) => number(row, `temp_outer_c_${wheel}`))), ...surface },
      surfaceCoreDeltaC: surface.mean - lateCore
    };
    wear[wheel] = { start: firstWear, end: lastWear, delta: lastWear - firstWear, onsetKm: onset ? number(onset, "tire_set_distance_m") / 1000 : null, onsetLap: onset ? number(onset, "lap") : null, slopePerKm: regression(distancePoints).slope };
    loads[wheel] = stats(rows.map((row) => number(row, `wheel_load_n_${wheel}`)));
    slip[wheel] = { channel: `wheel_slip_raw_${wheel}`, units: "AC shared-memory raw; not normalized slip ratio", absolute: stats(slipAbs), activeFractionAbove1: finite(slipAbs).filter((value) => value > 1).length / Math.max(1, finite(slipAbs).length) };
  }
  const frontLate = mean([pressure.fl.latePsi, pressure.fr.latePsi]);
  const rearLate = mean([pressure.rl.latePsi, pressure.rr.latePsi]);
  const pressureSlope = Object.fromEntries(WHEELS.map((wheel) => [wheel, regression(slopeLapRows.map((lap) => [lap.lap, lap.pressurePsi[wheel]])).slope]));
  const coreStable = WHEELS.every((wheel) => Math.abs(thermal[wheel].coreSlopeCPerLap) < 0.10);
  const pressureStable = WHEELS.every((wheel) => Math.abs(pressureSlope[wheel]) < 0.03);
  const dirtySamples = rows.filter((row) => WHEELS.some((wheel) => number(row, `dirty_raw_${wheel}`) > 0)).length;
  const incidentCandidates = rows.filter((row) => Math.abs(number(row, "accg_lat")) > 1.8 || Math.abs(number(row, "accg_long")) > 1.5 || WHEELS.some((wheel) => Math.abs(number(row, `wheel_slip_raw_${wheel}`)) > 10)).length;
  const completeLapTimes = laps.filter((lap) => lap.complete && lap.lapTimeMs > 0).map((lap) => lap.lapTimeMs / 1000);
  const identity = resolveManifestIdentity(manifest, csvCompounds);
  const canonicalPressureLaps = [2, 3, 4, 5];
  const canonicalPressureAvailable = canonicalPressureLaps.every((lap) => completeLaps.includes(lap));
  const shortScreen = pressureWindowSummary(rows, canonicalPressureLaps, idealFront, idealRear);
  shortScreen.status = canonicalPressureAvailable ? "AVAILABLE" : "INCOMPLETE";
  const report = {
    schema: "ACLM deterministic post-run calibration report 2.0",
    fixtureId: options.fixtureId || null,
    inputs: { csvFile: path.basename(csvFile), manifestFile: manifestFile ? path.basename(manifestFile) : null, csvSha256: crypto.createHash("sha256").update(text).digest("hex"), manifestSha256: manifestFile ? crypto.createHash("sha256").update(fs.readFileSync(manifestFile)).digest("hex") : null, loggerHeaders: headers },
    identity,
    session: { car: rows[0].car || manifest.car || null, track: rows[0].track || manifest.track || null, startUtc: rows[0].timestamp_utc || null, endUtc: rows.at(-1).timestamp_utc || null, samples: rows.length, distanceKm: (number(rows.at(-1), "tire_set_distance_m") - number(rows[0], "tire_set_distance_m")) / 1000, requestedCondition: manifest.userRequestedCondition || manifest.requestedCondition || null, observedCondition: { airC: stats(rows.map((row) => number(row, "air_temp_c"))), roadC: stats(rows.map((row) => number(row, "road_temp_c"))), aidTireRate: [...new Set(finite(rows.map((row) => number(row, "aid_tire_rate"))))] } },
    laps: { complete: completeLaps, partialOrInvalid: laps.filter((lap) => !lap.complete).map((lap) => lap.lap), byLap: laps, consistency: { completeLapTimeSeconds: stats(completeLapTimes), coefficientOfVariation: completeLapTimes.length ? Math.sqrt(mean(completeLapTimes.map((value) => (value - mean(completeLapTimes)) ** 2))) / mean(completeLapTimes) : null } },
    pressure: { shortScreen, lateLapWindow: lateComplete, perWheel: pressure, pressureSlopePsiPerLap: pressureSlope, axles: { front: { latePsi: frontLate, targetPsi: idealFront, errorPsi: frontLate - idealFront, classification: classify(frontLate - idealFront) }, rear: { latePsi: rearLate, targetPsi: idealRear, errorPsi: rearLate - idealRear, classification: classify(rearLate - idealRear) } } },
    thermal: { lateLapWindow: lateComplete, slopeLapWindow: slopeLaps, coreSlopeThresholdCPerLap: 0.10, pressureSlopeThresholdPsiPerLap: 0.03, coreStable, pressureStable, engineeringStability: coreStable && pressureStable ? "PASS" : "NOT_STABILIZED", historicalAccuracy: "UNRESOLVED", perWheel: thermal },
    wear: { status: "STORE, DO NOT FIT", perWheel: wear },
    dynamics: { wheelLoadN: loads, slipRatioActivity: slip, slipAngleActivity: headers.some((header) => /slip_angle/i.test(header)) ? "CHANNEL_PRESENT_NOT_YET_NORMALIZED" : null },
    contamination: { offTrackDefinition: "any dirty_raw wheel channel > 0", offTrackSamples: dirtySamples, offTrackFraction: dirtySamples / rows.length, incidentCandidateDefinition: "|lat g|>1.8 or |long g|>1.5 or |AC raw wheel slip|>10; review candidates, not automatic incident truth", incidentCandidateSamples: incidentCandidates, incidentCandidateFraction: incidentCandidates / rows.length },
    protocol: { shortPressureScreen: { lapWindow: canonicalPressureLaps, status: canonicalPressureAvailable ? "AVAILABLE" : "INCOMPLETE", overallClosureClassification: shortScreen.overallClosureClassification }, extendedThermalObservation: { lapWindow: slopeLaps, status: slopeLaps.length >= 10 ? (coreStable && pressureStable ? "ENGINEERING_STABILITY_PASS" : "NOT_STABILIZED") : "INSUFFICIENT_COMPLETE_LAPS" }, historicalThermalAccuracy: "NOT_AUTOMATICALLY_DECLARED" }
  };
  report.markdown = renderMarkdown(report);
  return report;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) result[token.slice(2)] = argv[++index];
  }
  return result;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv) throw new Error("Usage: node analyze_post_run_telemetry.js --csv <file> --manifest <file> [--json <file>] [--markdown <file>] [--fixture <id>]");
  const report = analyzePostRun(args.csv, args.manifest || null, { fixtureId: args.fixture || null });
  if (args.json) fs.writeFileSync(args.json, `${JSON.stringify({ ...report, markdown: undefined }, null, 2)}\n`);
  if (args.markdown) fs.writeFileSync(args.markdown, report.markdown);
  if (!args.json && !args.markdown) process.stdout.write(`${JSON.stringify({ ...report, markdown: undefined }, null, 2)}\n`);
}

module.exports = { analyzePostRun, renderMarkdown };
