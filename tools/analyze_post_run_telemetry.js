"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { analyze: analyzeLongRun } = require("./analyze_long_run_telemetry.js");

const WHEELS = ["fl", "fr", "rl", "rr"];
const MIN_MOVING_SAMPLES_PER_LAP = 50;
const MIN_MOVING_FRACTION_PER_LAP = 0.5;

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
  const raw = row?.[key];
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function finite(values) { return values.filter(Number.isFinite); }
function mean(values) { const a = finite(values); return a.length ? a.reduce((sum, value) => sum + value, 0) / a.length : null; }
function difference(left, right) { return Number.isFinite(left) && Number.isFinite(right) ? left - right : null; }
function coefficientOfVariation(values) {
  const usable = finite(values);
  if (!usable.length) return null;
  const average = mean(usable);
  if (!Number.isFinite(average) || average === 0) return null;
  return Math.sqrt(mean(usable.map((value) => (value - average) ** 2))) / Math.abs(average);
}
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

function pressureWindowSummary(rows, rawAcLapWindow, idealFront, idealRear, selection = {}) {
  const selected = rows.filter((row) => rawAcLapWindow.includes(number(row, "lap")));
  const perWheel = Object.fromEntries(WHEELS.map((wheel) => {
    const targetPsi = wheel.startsWith("f") ? idealFront : idealRear;
    const meanPsi = mean(selected.map((row) => number(row, `pressure_psi_${wheel}`)));
    const errorPsi = difference(meanPsi, targetPsi);
    return [wheel, { meanPsi, targetPsi, errorPsi, classification: classifyPressure(errorPsi) }];
  }));
  const frontPsi = mean([perWheel.fl.meanPsi, perWheel.fr.meanPsi]);
  const rearPsi = mean([perWheel.rl.meanPsi, perWheel.rr.meanPsi]);
  return {
    lapWindow: selection.relativeLapWindow || rawAcLapWindow,
    relativeLapWindow: selection.relativeLapWindow || rawAcLapWindow,
    rawAcLapWindow,
    selectionBasis: selection.selectionBasis || "UNRESOLVED",
    lapMapping: selection.lapMapping || rawAcLapWindow.map((lap) => ({ relativeLap: lap, rawAcLap: lap })),
    excludedRawAcLaps: selection.excludedRawAcLaps || [],
    selectionReasons: selection.reasons || [],
    samples: selected.length,
    perWheel,
    axles: {
      front: { meanPsi: frontPsi, targetPsi: idealFront, errorPsi: difference(frontPsi, idealFront), classification: classifyPressure(difference(frontPsi, idealFront)) },
      rear: { meanPsi: rearPsi, targetPsi: idealRear, errorPsi: difference(rearPsi, idealRear), classification: classifyPressure(difference(rearPsi, idealRear)) }
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
    const tireSetDistances = finite(samples.map((row) => number(row, "tire_set_distance_m")));
    const sessionDistances = finite(samples.map((row) => number(row, "session_distance_m")));
    const loggerDistances = finite(samples.map((row) => number(row, "logger_cumulative_distance_m")));
    const movingSamples = samples.filter((row) => {
      const speed = number(row, "speed_kmh");
      return Number.isFinite(speed) && speed > 5;
    }).length;
    const lapDistanceKm = tireSetDistances.length ? (Math.max(...tireSetDistances) - Math.min(...tireSetDistances)) / 1000 : null;
    return {
      lap,
      complete: complete.has(lap),
      samples: samples.length,
      coverage: positions.length ? { min: Math.min(...positions), max: Math.max(...positions) } : null,
      lapTimeMs: Math.max(...finite(samples.map((row) => number(row, "lap_time_ms"))).concat([0])),
      distanceKm: lapDistanceKm,
      distanceMetric: "LAP_SPAN_FROM_CURRENT_TIRE_SET_DISTANCE",
      lapDistanceKm,
      tireSetDistanceAtLapStartKm: tireSetDistances.length ? tireSetDistances[0] / 1000 : null,
      tireSetDistanceAtLapEndKm: tireSetDistances.length ? tireSetDistances.at(-1) / 1000 : null,
      sessionDistanceAtLapStartKm: sessionDistances.length ? sessionDistances[0] / 1000 : null,
      sessionDistanceAtLapEndKm: sessionDistances.length ? sessionDistances.at(-1) / 1000 : null,
      loggerCumulativeAtLapStartKm: loggerDistances.length ? loggerDistances[0] / 1000 : null,
      loggerCumulativeAtLapEndKm: loggerDistances.length ? loggerDistances.at(-1) / 1000 : null,
      pitSamples: samples.filter((row) => number(row, "in_pit") === 1).length,
      movingSamples,
      movingFraction: samples.length ? movingSamples / samples.length : 0,
      speedKmh: stats(samples.map((row) => number(row, "speed_kmh"))),
      pressurePsi: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `pressure_psi_${wheel}`)))])),
      coreC: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `core_temp_c_${wheel}`)))])),
      wearRaw: Object.fromEntries(WHEELS.map((wheel) => [wheel, mean(samples.map((row) => number(row, `wear_raw_${wheel}`)))]))
    };
  });
}

function pressureChannelsComplete(rows, rawAcLapWindow) {
  const selected = rows.filter((row) => rawAcLapWindow.includes(number(row, "lap")));
  if (!selected.length) return { complete: false, missing: [...WHEELS] };
  const missing = WHEELS.filter((wheel) => selected.some((row) => !Number.isFinite(number(row, `pressure_psi_${wheel}`))));
  return { complete: missing.length === 0, missing };
}

function isDecisionQualityLap(lap) {
  return Boolean(lap?.complete && lap.pitSamples === 0 && lap.lapTimeMs > 0 &&
    Number.isFinite(lap.lapDistanceKm) && lap.lapDistanceKm > 0 &&
    lap.movingSamples >= MIN_MOVING_SAMPLES_PER_LAP && lap.movingFraction >= MIN_MOVING_FRACTION_PER_LAP);
}

function monotonicallyNondecreasing(rows, key, tolerance = 1) {
  let previous = null;
  for (const row of rows) {
    const value = number(row, key);
    if (!Number.isFinite(value)) return false;
    if (Number.isFinite(previous) && value < previous - tolerance) return false;
    previous = value;
  }
  return true;
}

function resolvePressureWindow(rows, laps, completeLaps, manifest, identity, csvCompounds) {
  const relativeLapWindow = [2, 3, 4, 5];
  const identityProven = manifest?.physicsHashMatch === true && identity.generatedVsActive === "MATCH" && identity.compoundIdentity === "MATCH";
  const cars = [...new Set(rows.map((row) => String(row.car || "").trim()).filter(Boolean))];
  const tracks = [...new Set(rows.map((row) => String(row.track || "").trim()).filter(Boolean))];
  const activeCar = manifest?.activeInstalledPhysics?.carId || manifest?.observedRuntimeState?.car || null;
  const coherentIdentity = identityProven && cars.length === 1 && tracks.length === 1 && csvCompounds.length === 1 && (!activeCar || activeCar === cars[0]);
  const literalLaps = relativeLapWindow.map((lap) => laps.find((item) => item.lap === lap));
  const literalAvailable = literalLaps.every(isDecisionQualityLap);
  const literalTimeCv = coefficientOfVariation(literalLaps.map((lap) => lap?.lapTimeMs));
  const literalDistanceCv = coefficientOfVariation(literalLaps.map((lap) => lap?.lapDistanceKm));
  const literalCoherent = literalAvailable && Number.isFinite(literalTimeCv) && literalTimeCv <= 0.15 && Number.isFinite(literalDistanceCv) && literalDistanceCv <= 0.15;
  if (literalCoherent && coherentIdentity) {
    const channelCheck = pressureChannelsComplete(rows, relativeLapWindow);
    return {
      available: channelCheck.complete,
      selectionBasis: channelCheck.complete ? "LITERAL_AC_LAPS" : "UNRESOLVED",
      relativeLapWindow,
      rawAcLapWindow: relativeLapWindow,
      lapMapping: relativeLapWindow.map((lap) => ({ relativeLap: lap, rawAcLap: lap })),
      excludedRawAcLaps: [1],
      reasons: channelCheck.complete
        ? ["Complete literal AC laps 2-5 have sufficient moving samples, complete pressure channels and proven generated-vs-active identity."]
        : [`Pressure channels are missing in the candidate decision window: ${channelCheck.missing.map((wheel) => wheel.toUpperCase()).join(", ")}.`]
    };
  }

  const reasons = [];
  if (!identityProven) reasons.push("physicsHashMatch=true plus matching generated/active tire and compound identity were not proven");
  if (cars.length !== 1 || tracks.length !== 1 || csvCompounds.length !== 1) reasons.push("car, track or compound changes make the capture mixed-session or ambiguous");
  if (activeCar && cars.length === 1 && activeCar !== cars[0]) reasons.push("manifest active car does not match the CSV car");
  const firstRow = rows[0];
  const rawStartLap = number(firstRow, "lap");
  const firstLap = laps.find((lap) => lap.lap === rawStartLap);
  const startInPit = number(firstRow, "in_pit") === 1;
  const startStationary = Number.isFinite(number(firstRow, "speed_kmh")) && Math.abs(number(firstRow, "speed_kmh")) <= 5;
  const startTireDistance = number(firstRow, "tire_set_distance_m");
  const startSessionDistance = number(firstRow, "session_distance_m");
  const distanceReset = Number.isFinite(startTireDistance) && Number.isFinite(startSessionDistance) && startTireDistance <= 50 && startSessionDistance <= 50;
  if (!startInPit || !startStationary) reasons.push("logger did not demonstrably start stationary in the pits");
  if (!distanceReset) reasons.push("fresh current-tire-set and session distance reset was not proven");
  if (!Number.isInteger(rawStartLap) || rawStartLap <= 1) reasons.push("AC lap counter does not require a session-relative rebase");
  if (!firstLap || firstLap.pitSamples < 1) reasons.push("first recorded AC lap is not a provable pit/out-lap segment");
  if (!monotonicallyNondecreasing(rows, "session_distance_m") || !monotonicallyNondecreasing(rows, "tire_set_distance_m")) reasons.push("session or tire-set distance resets within the capture");

  const useful = laps.filter((lap) => lap.lap > rawStartLap && isDecisionQualityLap(lap));
  const firstFive = useful.slice(0, 5);
  if (firstFive.length < 5) reasons.push("fewer than five complete pit-free timed laps with sufficient moving samples remain after the out-lap");
  if (firstFive.length === 5 && !firstFive.every((lap, index) => lap.lap === firstFive[0].lap + index)) reasons.push("the first five useful timed laps are not consecutive");
  const timeCv = coefficientOfVariation(firstFive.map((lap) => lap.lapTimeMs));
  const distanceCv = coefficientOfVariation(firstFive.map((lap) => lap.lapDistanceKm));
  if (!Number.isFinite(timeCv) || timeCv > 0.15) reasons.push("timed-lap duration is not coherent enough for safe rebasing");
  if (!Number.isFinite(distanceCv) || distanceCv > 0.15) reasons.push("timed-lap distance is not coherent enough for safe rebasing");

  if (reasons.length || !coherentIdentity || firstFive.length < 5) {
    return { available: false, selectionBasis: "UNRESOLVED", relativeLapWindow, rawAcLapWindow: [], lapMapping: [], excludedRawAcLaps: [], reasons };
  }
  const mapping = firstFive.map((lap, index) => ({ relativeLap: index + 1, rawAcLap: lap.lap }));
  const rawAcLapWindow = mapping.slice(1).map((item) => item.rawAcLap);
  const channelCheck = pressureChannelsComplete(rows, rawAcLapWindow);
  const excludedRawAcLaps = [...new Set(laps.filter((lap) => lap.pitSamples > 0 || !lap.complete).map((lap) => lap.lap))].sort((a, b) => a - b);
  if (!channelCheck.complete) {
    return {
      available: false,
      selectionBasis: "UNRESOLVED",
      relativeLapWindow,
      rawAcLapWindow,
      lapMapping: mapping,
      excludedRawAcLaps,
      warmupRawAcLap: mapping[0].rawAcLap,
      reasons: [`Pressure channels are missing in the candidate decision window: ${channelCheck.missing.map((wheel) => wheel.toUpperCase()).join(", ")}.`]
    };
  }
  return {
    available: true,
    selectionBasis: "SESSION_RELATIVE_REBASED",
    relativeLapWindow,
    rawAcLapWindow,
    lapMapping: mapping,
    excludedRawAcLaps,
    warmupRawAcLap: mapping[0].rawAcLap,
    reasons: [`Logger began stationary in the pits with fresh session/tire-set distances; the out-lap was excluded and five consecutive coherent full laps with at least ${MIN_MOVING_SAMPLES_PER_LAP} moving samples and ${(MIN_MOVING_FRACTION_PER_LAP * 100).toFixed(0)}% moving coverage were proven.`]
  };
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
    `Selection basis: **${screen.selectionBasis}**. Relative laps ${screen.relativeLapWindow.join("–")} map to original AC laps ${screen.rawAcLapWindow.join("–") || "unresolved"}. Status: **${screen.status}**; closure: **${screen.overallClosureClassification}**.`,
    screen.selectionReasons.length ? `Selection audit: ${screen.selectionReasons.join(" ")}` : "", "",
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
    const distancePoints = rows.map((row) => { const distance = number(row, "tire_set_distance_m"); return [Number.isFinite(distance) ? distance / 1000 : null, number(row, `wear_raw_${wheel}`)]; });
    const slipAbs = rows.map((row) => { const value = number(row, `wheel_slip_raw_${wheel}`); return Number.isFinite(value) ? Math.abs(value) : null; });
    pressure[wheel] = { startPsi: number(rows[0], `pressure_psi_${wheel}`), byLap: Object.fromEntries(laps.map((lap) => [lap.lap, lap.pressurePsi[wheel]])), latePsi: latePressure, targetPsi: target, errorPsi: difference(latePressure, target), classification: classify(difference(latePressure, target)) };
    thermal[wheel] = {
      startCoreC: number(rows[0], `core_temp_c_${wheel}`),
      coreByLap: Object.fromEntries(laps.map((lap) => [lap.lap, lap.coreC[wheel]])),
      lateCoreC: lateCore,
      coreSlopeCPerLap: regression(slopeLapRows.map((lap) => [lap.lap, lap.coreC[wheel]])).slope,
      surface: { inner: stats(lateRows.map((row) => number(row, `temp_inner_c_${wheel}`))), middle: stats(lateRows.map((row) => number(row, `temp_middle_c_${wheel}`))), outer: stats(lateRows.map((row) => number(row, `temp_outer_c_${wheel}`))), ...surface },
      surfaceCoreDeltaC: difference(surface.mean, lateCore)
    };
    const onsetDistance = onset ? number(onset, "tire_set_distance_m") : null;
    wear[wheel] = { start: firstWear, end: lastWear, delta: difference(lastWear, firstWear), onsetKm: Number.isFinite(onsetDistance) ? onsetDistance / 1000 : null, onsetLap: onset ? number(onset, "lap") : null, slopePerKm: regression(distancePoints).slope };
    loads[wheel] = stats(rows.map((row) => number(row, `wheel_load_n_${wheel}`)));
    slip[wheel] = { channel: `wheel_slip_raw_${wheel}`, units: "AC shared-memory raw; not normalized slip ratio", absolute: stats(slipAbs), activeFractionAbove1: finite(slipAbs).filter((value) => value > 1).length / Math.max(1, finite(slipAbs).length) };
  }
  const frontLate = mean([pressure.fl.latePsi, pressure.fr.latePsi]);
  const rearLate = mean([pressure.rl.latePsi, pressure.rr.latePsi]);
  const pressureSlope = Object.fromEntries(WHEELS.map((wheel) => [wheel, regression(slopeLapRows.map((lap) => [lap.lap, lap.pressurePsi[wheel]])).slope]));
  const coreStable = WHEELS.every((wheel) => Number.isFinite(thermal[wheel].coreSlopeCPerLap) && Math.abs(thermal[wheel].coreSlopeCPerLap) < 0.10);
  const pressureStable = WHEELS.every((wheel) => Number.isFinite(pressureSlope[wheel]) && Math.abs(pressureSlope[wheel]) < 0.03);
  const dirtySamples = rows.filter((row) => WHEELS.some((wheel) => number(row, `dirty_raw_${wheel}`) > 0)).length;
  const incidentCandidates = rows.filter((row) => Math.abs(number(row, "accg_lat")) > 1.8 || Math.abs(number(row, "accg_long")) > 1.5 || WHEELS.some((wheel) => Math.abs(number(row, `wheel_slip_raw_${wheel}`)) > 10)).length;
  const completeLapTimes = laps.filter((lap) => lap.complete && lap.lapTimeMs > 0).map((lap) => lap.lapTimeMs / 1000);
  const identity = resolveManifestIdentity(manifest, csvCompounds);
  const pressureWindow = resolvePressureWindow(rows, laps, completeLaps, manifest, identity, csvCompounds);
  const shortScreen = pressureWindowSummary(rows, pressureWindow.rawAcLapWindow, idealFront, idealRear, pressureWindow);
  shortScreen.status = pressureWindow.available ? "AVAILABLE" : "INCOMPLETE/UNRESOLVED";
  const distanceValue = (key) => ({ startM: number(rows[0], key), endM: number(rows.at(-1), key), spanKm: difference(number(rows.at(-1), key), number(rows[0], key)) === null ? null : difference(number(rows.at(-1), key), number(rows[0], key)) / 1000 });
  const pressureAB = manifest?.pressureAB || null;
  const pressureIntent = {
    role: pressureAB?.role || "unclassified",
    tirePackId: pressureAB?.tirePackId || null,
    coldPressureAdjustmentPsi: pressureAB?.coldPressureAdjustmentPsi || null,
    status: manifest?.pressureABIntentStatus || pressureAB?.intentStatus || ((pressureAB?.role && pressureAB.role !== "unclassified") ? "DECLARED_WITHOUT_SERVER_ASSESSMENT" : "UNCLASSIFIED"),
    warning: manifest?.pressureABIntentWarning || pressureAB?.intentWarning || ((pressureAB?.role && pressureAB.role !== "unclassified") ? null : "Pressure-test intent is unclassified; retain as simulator evidence with an intent-metadata limitation.")
  };
  const report = {
    schema: "ACLM deterministic post-run calibration report 2.0",
    fixtureId: options.fixtureId || null,
    inputs: { csvFile: path.basename(csvFile), manifestFile: manifestFile ? path.basename(manifestFile) : null, csvSha256: crypto.createHash("sha256").update(text).digest("hex"), manifestSha256: manifestFile ? crypto.createHash("sha256").update(fs.readFileSync(manifestFile)).digest("hex") : null, loggerHeaders: headers },
    identity,
    session: { car: rows[0].car || manifest.car || null, track: rows[0].track || manifest.track || null, startUtc: rows[0].timestamp_utc || null, endUtc: rows.at(-1).timestamp_utc || null, samples: rows.length, distanceKm: distanceValue("tire_set_distance_m").spanKm, distanceBasis: "CURRENT_TIRE_SET_DISTANCE", distanceBases: { loggerCumulative: distanceValue("logger_cumulative_distance_m"), session: distanceValue("session_distance_m"), stint: distanceValue("stint_distance_m"), currentTireSet: distanceValue("tire_set_distance_m") }, requestedCondition: manifest.userRequestedCondition || manifest.requestedCondition || null, observedCondition: { airC: stats(rows.map((row) => number(row, "air_temp_c"))), roadC: stats(rows.map((row) => number(row, "road_temp_c"))), aidTireRate: [...new Set(finite(rows.map((row) => number(row, "aid_tire_rate"))))] } },
    laps: { complete: completeLaps, partialOrInvalid: laps.filter((lap) => !lap.complete).map((lap) => lap.lap), byLap: laps, consistency: { completeLapTimeSeconds: stats(completeLapTimes), coefficientOfVariation: completeLapTimes.length ? Math.sqrt(mean(completeLapTimes.map((value) => (value - mean(completeLapTimes)) ** 2))) / mean(completeLapTimes) : null } },
    pressure: { shortScreen, intent: pressureIntent, lateLapWindow: lateComplete, perWheel: pressure, pressureSlopePsiPerLap: pressureSlope, axles: { front: { latePsi: frontLate, targetPsi: idealFront, errorPsi: difference(frontLate, idealFront), classification: classify(difference(frontLate, idealFront)) }, rear: { latePsi: rearLate, targetPsi: idealRear, errorPsi: difference(rearLate, idealRear), classification: classify(difference(rearLate, idealRear)) } } },
    thermal: { lateLapWindow: lateComplete, slopeLapWindow: slopeLaps, coreSlopeThresholdCPerLap: 0.10, pressureSlopeThresholdPsiPerLap: 0.03, coreStable, pressureStable, engineeringStability: coreStable && pressureStable ? "PASS" : "NOT_STABILIZED", historicalAccuracy: "UNRESOLVED", perWheel: thermal },
    wear: { status: "STORE, DO NOT FIT", perWheel: wear },
    dynamics: { wheelLoadN: loads, slipRatioActivity: slip, slipAngleActivity: headers.some((header) => /slip_angle/i.test(header)) ? "CHANNEL_PRESENT_NOT_YET_NORMALIZED" : null },
    contamination: { offTrackDefinition: "any dirty_raw wheel channel > 0", offTrackSamples: dirtySamples, offTrackFraction: dirtySamples / rows.length, incidentCandidateDefinition: "|lat g|>1.8 or |long g|>1.5 or |AC raw wheel slip|>10; review candidates, not automatic incident truth", incidentCandidateSamples: incidentCandidates, incidentCandidateFraction: incidentCandidates / rows.length },
    protocol: { shortPressureScreen: { relativeLapWindow: pressureWindow.relativeLapWindow, rawAcLapWindow: pressureWindow.rawAcLapWindow, selectionBasis: pressureWindow.selectionBasis, lapMapping: pressureWindow.lapMapping, status: pressureWindow.available ? "AVAILABLE" : "INCOMPLETE/UNRESOLVED", overallClosureClassification: shortScreen.overallClosureClassification }, extendedThermalObservation: { lapWindow: slopeLaps, status: slopeLaps.length >= 10 ? (coreStable && pressureStable ? "ENGINEERING_STABILITY_PASS" : "NOT_STABILIZED") : "INSUFFICIENT_COMPLETE_LAPS" }, historicalThermalAccuracy: "NOT_AUTOMATICALLY_DECLARED" }
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
