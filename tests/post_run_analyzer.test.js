"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { analyzePostRun } = require("../tools/analyze_post_run_telemetry.js");

const root = path.resolve(__dirname, "..");
const expected = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "gt40", "GT40_Long_Run_Analysis.json"), "utf8"));
const correctedManifest = path.join(root, "artifacts", "gt40", "GT40_Long_Run_Corrected_Post_Run_Manifest.json");
const actualCsv = path.join(os.homedir(), "Documents", "ACLM Tire Lab", "Telemetry", expected.file);

function close(actual, wanted, tolerance, label) {
  assert.ok(Math.abs(actual - wanted) <= tolerance, `${label}: ${actual} vs ${wanted}`);
}

function writeSyntheticSession(directory, options = {}) {
  const csv = path.join(directory, options.name || "session.csv");
  const manifest = path.join(directory, `${path.basename(csv, ".csv")}.manifest.json`);
  const wheels = ["fl", "fr", "rl", "rr"];
  const headers = ["timestamp_utc", "elapsed_ms", "car", "track", "compound", "lap", "lap_time_ms", "normalized_track_position", "logger_cumulative_distance_m", "session_distance_m", "stint_distance_m", "tire_set_distance_m", "in_pit", "speed_kmh", "air_temp_c", "road_temp_c", "aid_tire_rate", "accg_lat", "accg_long"];
  for (const wheel of wheels) headers.push(`pressure_psi_${wheel}`, `core_temp_c_${wheel}`, `temp_inner_c_${wheel}`, `temp_middle_c_${wheel}`, `temp_outer_c_${wheel}`, `wear_raw_${wheel}`, `wheel_load_n_${wheel}`, `wheel_slip_raw_${wheel}`, `dirty_raw_${wheel}`);
  const rows = [];
  let sample = 0;
  let distance = options.startDistanceM || 0;
  const startLap = options.startLap ?? 7;
  const endLap = options.endLap ?? 12;
  for (let lap = startLap; lap <= endLap; lap += 1) {
    const isOutLap = options.outLap !== false && lap === startLap;
    const isPartialLap = options.partialLap === lap;
    const points = isPartialLap ? 41 : 101;
    const lapDistance = isOutLap ? 2268 : 5760;
    for (let point = 0; point < points; point += 1) {
      const first = sample === 0;
      const fraction = isPartialLap ? point / 100 : point / (points - 1);
      const base = {
        timestamp_utc: new Date(Date.UTC(2026, 8, 1, 0, 0, sample / 10)).toISOString(), elapsed_ms: sample * 100,
        car: options.car || "ks_porsche_917_tires", track: "ks_monza66", compound: options.csvCompound || "Dry Endurance (D)", lap,
        lap_time_ms: Math.round((isOutLap ? 215337 : 90500) * fraction), normalized_track_position: first && isOutLap ? 0.985 : fraction,
        logger_cumulative_distance_m: (options.loggerStartM || 50000) + distance,
        session_distance_m: distance, stint_distance_m: distance, tire_set_distance_m: distance,
        in_pit: isOutLap && point < 20 && options.startInPit !== false ? 1 : 0,
        speed_kmh: options.insufficientMovingLap === lap && point >= 10 ? 0 : (first && isOutLap ? (options.startSpeedKmh ?? 0) : 220),
        air_temp_c: 26, road_temp_c: 37, aid_tire_rate: 0, accg_lat: 0, accg_long: 0
      };
      const expected = { fl: 33.3554542326, fr: 32.5208593982, rl: 39.3586275034, rr: 38.5787996146 };
      for (const wheel of wheels) {
        const ideal = wheel.startsWith("f") ? 32 : 38;
        const relativeLap = lap - startLap;
        base[`pressure_psi_${wheel}`] = options.missingFront && [2, 3, 4, 5].includes(lap) && wheel.startsWith("f") ? "" : (relativeLap >= 2 && relativeLap <= 5 ? expected[wheel] : ideal);
        base[`core_temp_c_${wheel}`] = 50; base[`temp_inner_c_${wheel}`] = 55; base[`temp_middle_c_${wheel}`] = 55; base[`temp_outer_c_${wheel}`] = 55;
        base[`wear_raw_${wheel}`] = 100; base[`wheel_load_n_${wheel}`] = 2000; base[`wheel_slip_raw_${wheel}`] = 0; base[`dirty_raw_${wheel}`] = 0;
      }
      rows.push(headers.map((header) => base[header] ?? "").join(","));
      distance += lapDistance / points;
      sample += 1;
    }
  }
  fs.writeFileSync(csv, `${headers.join(",")}\n${rows.join("\n")}\n`);
  fs.writeFileSync(manifest, JSON.stringify({
    physicsHashMatch: options.physicsHashMatch ?? true,
    activeInstalledPhysics: { carId: options.manifestCar || options.car || "ks_porsche_917_tires", tyresIniSha256: "same", activePressureIdealFrontPsi: 32, activePressureIdealRearPsi: 38, activeCompoundIdentity: { name: options.manifestCompound || "Dry Endurance", shortName: "D" } },
    generatedConfiguration: { tireFileSha256: options.generatedHash || "same" },
    pressureAB: options.pressureAB || { role: "corrected", tirePackId: "Porsche-917K-v0102-canonical", coldPressureAdjustmentPsi: { fl: 1, fr: 1, rl: 1, rr: 1 } }
  }));
  return { csv, manifest };
}

test("checked-in GT40 expected fixture retains the known authoritative results", () => {
  assert.equal(expected.csvSha256, "4c8ff6b3c12ca04dbe0311be7ae42ea3cfb61300fa2a80ce0c3d7951d1e7b488");
  assert.equal(expected.completeLaps.length, 33);
  close(expected.distance.spanKm, 198.5757877, 0.0001, "distance");
  close(expected.pressure.axle.front.meanPsi, 27.65923, 0.001, "front late pressure");
  close(expected.pressure.axle.rear.meanPsi, 28.15896, 0.001, "rear late pressure");
  assert.equal(expected.thermal.stabilizationClassification, "NOT STABILIZED");
  assert.equal(expected.wear.historicalCalibrationStatus, "UNRESOLVED — STORE, DO NOT FIT");
});

test("deterministic analyzer reproduces the actual GT40 run", { skip: !fs.existsSync(actualCsv) }, () => {
  const report = analyzePostRun(actualCsv, correctedManifest, { fixtureId: "GT40-LONG-RUN-001" });
  assert.equal(report.inputs.csvSha256, expected.csvSha256);
  assert.deepEqual(report.laps.complete, expected.completeLaps);
  close(report.session.distanceKm, expected.distance.spanKm, 1e-9, "distance");
  close(report.pressure.perWheel.fl.latePsi, expected.perWheel.fl.latePressurePsi.mean, 0.001, "FL late pressure");
  close(report.pressure.perWheel.fr.latePsi, expected.perWheel.fr.latePressurePsi.mean, 0.001, "FR late pressure");
  close(report.pressure.perWheel.rl.latePsi, expected.perWheel.rl.latePressurePsi.mean, 0.001, "RL late pressure");
  close(report.pressure.perWheel.rr.latePsi, expected.perWheel.rr.latePressurePsi.mean, 0.001, "RR late pressure");
  close(report.thermal.perWheel.fl.coreSlopeCPerLap, expected.perWheel.fl.coreSlopeCPerLap, 1e-9, "FL core slope");
  close(report.thermal.perWheel.rr.coreSlopeCPerLap, expected.perWheel.rr.coreSlopeCPerLap, 1e-9, "RR core slope");
  assert.equal(report.identity.generatedVsActive, "STALE/HASH_MISMATCH");
  assert.equal(report.identity.authority, "ACTIVE_INSTALLED_PHYSICS");
  assert.equal(report.thermal.engineeringStability, "NOT_STABILIZED");
  assert.equal(report.thermal.historicalAccuracy, "UNRESOLVED");
  assert.equal(report.wear.status, "STORE, DO NOT FIT");
  assert.match(report.markdown, /does not automatically declare historical thermal accuracy/i);
});

test("post-run analyzer keeps the canonical laps 2-5 pressure screen separate from later laps", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-post-run-"));
  const csv = path.join(directory, "screen.csv");
  const manifest = path.join(directory, "screen.manifest.json");
  const wheels = ["fl", "fr", "rl", "rr"];
  const headers = ["timestamp_utc", "elapsed_ms", "car", "track", "compound", "lap", "lap_time_ms", "normalized_track_position", "tire_set_distance_m", "speed_kmh", "air_temp_c", "road_temp_c", "aid_tire_rate", "accg_lat", "accg_long"];
  for (const wheel of wheels) headers.push(`pressure_psi_${wheel}`, `core_temp_c_${wheel}`, `temp_inner_c_${wheel}`, `temp_middle_c_${wheel}`, `temp_outer_c_${wheel}`, `wear_raw_${wheel}`, `wheel_load_n_${wheel}`, `wheel_slip_raw_${wheel}`, `dirty_raw_${wheel}`);
  const rows = [];
  let sample = 0;
  for (let lap = 0; lap <= 6; lap += 1) {
    for (let point = 0; point <= 100; point += 1) {
      const base = { timestamp_utc: new Date(Date.UTC(2026, 8, 1, 0, 0, sample / 10)).toISOString(), elapsed_ms: sample * 100, car: "ks_porsche_917_tires", track: "ks_monza66", compound: "Dry Endurance (D)", lap, lap_time_ms: point * 900, normalized_track_position: point / 100, tire_set_distance_m: sample * 8, speed_kmh: lap ? 220 : 80, air_temp_c: 26, road_temp_c: 37, aid_tire_rate: 0, accg_lat: 0, accg_long: 0 };
      for (const wheel of wheels) {
        const ideal = wheel.startsWith("f") ? 32 : 38;
        base[`pressure_psi_${wheel}`] = lap === 6 ? ideal + 4 : ideal;
        base[`core_temp_c_${wheel}`] = 50;
        base[`temp_inner_c_${wheel}`] = 55;
        base[`temp_middle_c_${wheel}`] = 55;
        base[`temp_outer_c_${wheel}`] = 55;
        base[`wear_raw_${wheel}`] = 100;
        base[`wheel_load_n_${wheel}`] = 2000;
        base[`wheel_slip_raw_${wheel}`] = 0;
        base[`dirty_raw_${wheel}`] = 0;
      }
      rows.push(headers.map((header) => base[header]).join(","));
      sample += 1;
    }
  }
  fs.writeFileSync(csv, `${headers.join(",")}\n${rows.join("\n")}\n`);
  fs.writeFileSync(manifest, JSON.stringify({
    physicsHashMatch: true,
    activeInstalledPhysics: { tyresIniSha256: "same", activePressureIdealFrontPsi: 32, activePressureIdealRearPsi: 38, activeCompoundIdentity: { name: "Dry Endurance", shortName: "D" } },
    generatedConfiguration: { tireFileSha256: "same" }
  }));
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-SCREEN" });
  assert.equal(report.identity.compoundIdentity, "MATCH");
  assert.deepEqual(report.pressure.shortScreen.lapWindow, [2, 3, 4, 5]);
  assert.equal(report.pressure.shortScreen.status, "AVAILABLE");
  assert.equal(report.pressure.shortScreen.selectionBasis, "LITERAL_AC_LAPS");
  assert.equal(report.pressure.shortScreen.overallClosureClassification, "PASS");
  close(report.pressure.shortScreen.perWheel.fl.meanPsi, 32, 1e-9, "canonical FL pressure");
  assert.notEqual(report.pressure.perWheel.fl.latePsi, report.pressure.shortScreen.perWheel.fl.meanPsi);
  assert.match(report.markdown, /does not replace the canonical short-screen window/i);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("session-relative rebase maps AC laps 9-12 to relative laps 2-5 only after a proven pit start", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-relative-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 12 });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-REBASED" });
  assert.equal(report.pressure.shortScreen.status, "AVAILABLE");
  assert.equal(report.pressure.shortScreen.selectionBasis, "SESSION_RELATIVE_REBASED");
  assert.deepEqual(report.pressure.shortScreen.relativeLapWindow, [2, 3, 4, 5]);
  assert.deepEqual(report.pressure.shortScreen.rawAcLapWindow, [9, 10, 11, 12]);
  assert.deepEqual(report.pressure.shortScreen.lapMapping, [
    { relativeLap: 1, rawAcLap: 8 }, { relativeLap: 2, rawAcLap: 9 }, { relativeLap: 3, rawAcLap: 10 }, { relativeLap: 4, rawAcLap: 11 }, { relativeLap: 5, rawAcLap: 12 }
  ]);
  close(report.pressure.shortScreen.perWheel.fl.meanPsi, 33.3554542326, 1e-9, "rebased LF");
  close(report.pressure.shortScreen.perWheel.rr.meanPsi, 38.5787996146, 1e-9, "rebased RR");
  assert.equal(report.pressure.shortScreen.overallClosureClassification, "REVIEW");
  assert.equal(report.session.distanceBasis, "CURRENT_TIRE_SET_DISTANCE");
  assert.equal(report.session.distanceBases.currentTireSet.startM, 0);
  assert.equal(report.session.distanceBases.loggerCumulative.startM, 50000);
  assert.ok(report.markdown.includes("SESSION_RELATIVE_REBASED"));
  fs.rmSync(directory, { recursive: true, force: true });
});

test("raw lap 7 out-lap and raw lap 16 partial capture are excluded while raw laps 9-12 remain the decision window", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-relative-partial-tail-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 16, partialLap: 16 });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-REBASED-PARTIAL-TAIL" });
  assert.equal(report.pressure.shortScreen.status, "AVAILABLE");
  assert.deepEqual(report.pressure.shortScreen.rawAcLapWindow, [9, 10, 11, 12]);
  assert.deepEqual(report.pressure.shortScreen.excludedRawAcLaps, [7, 16]);
  assert.deepEqual(report.laps.partialOrInvalid, [16]);
  assert.deepEqual(report.pressure.lateLapWindow, [12, 13, 14, 15]);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("interrupted or partial decision capture remains unresolved", () => {
  for (const options of [
    { startLap: 7, endLap: 11 },
    { startLap: 7, endLap: 12, partialLap: 12 }
  ]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-interrupted-"));
    const { csv, manifest } = writeSyntheticSession(directory, options);
    const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-INTERRUPTED" });
    assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
    assert.equal(report.pressure.shortScreen.selectionBasis, "UNRESOLVED");
    assert.match(report.pressure.shortScreen.selectionReasons.join(" "), /fewer than five complete pit-free timed laps/i);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a nominally complete lap with insufficient moving samples cannot enter the decision window", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-insufficient-moving-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 12, insufficientMovingLap: 10 });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-INSUFFICIENT-MOVING" });
  assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
  assert.equal(report.laps.byLap.find((lap) => lap.lap === 10).movingSamples, 10);
  assert.match(report.pressure.shortScreen.selectionReasons.join(" "), /sufficient moving samples/i);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("ambiguous mid-track capture never receives a session-relative pressure decision", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-ambiguous-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 12, startInPit: false, startSpeedKmh: 180, startDistanceM: 5000 });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-AMBIGUOUS" });
  assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
  assert.equal(report.pressure.shortScreen.selectionBasis, "UNRESOLVED");
  assert.deepEqual(report.pressure.shortScreen.rawAcLapWindow, []);
  assert.equal(report.pressure.shortScreen.samples, 0);
  assert.match(report.pressure.shortScreen.selectionReasons.join(" "), /stationary in the pits|distance reset/i);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("missing pressure channels remain null and never become fake negative axle errors", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-null-pressure-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 0, endLap: 6, outLap: false, loggerStartM: 0, missingFront: true });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-NULL" });
  assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
  assert.equal(report.pressure.shortScreen.selectionBasis, "UNRESOLVED");
  assert.equal(report.pressure.shortScreen.perWheel.fl.meanPsi, null);
  assert.equal(report.pressure.shortScreen.perWheel.fl.errorPsi, null);
  assert.equal(report.pressure.shortScreen.perWheel.fl.classification, "UNRESOLVED");
  assert.equal(report.pressure.shortScreen.axles.front.meanPsi, null);
  assert.equal(report.pressure.shortScreen.axles.front.errorPsi, null);
  assert.equal(report.pressure.shortScreen.axles.front.classification, "UNRESOLVED");
  assert.notEqual(report.pressure.shortScreen.axles.front.errorPsi, -32);
  assert.match(report.pressure.shortScreen.selectionReasons.join(" "), /pressure channels are missing/i);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("hash mismatch remains fail closed before either literal or rebased screen selection", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-mismatch-"));
  const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 12, physicsHashMatch: false, generatedHash: "different" });
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-MISMATCH" });
  assert.equal(report.identity.generatedVsActive, "STALE/HASH_MISMATCH");
  assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
  assert.equal(report.pressure.shortScreen.selectionBasis, "UNRESOLVED");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("car or compound identity mismatch blocks a session-relative decision", () => {
  for (const options of [
    { manifestCar: "ks_maserati_250f_6c" },
    { csvCompound: "Wet (W)" }
  ]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aclm-identity-mismatch-"));
    const { csv, manifest } = writeSyntheticSession(directory, { startLap: 7, endLap: 12, ...options });
    const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-IDENTITY-MISMATCH" });
    assert.equal(report.pressure.shortScreen.status, "INCOMPLETE/UNRESOLVED");
    assert.equal(report.pressure.shortScreen.selectionBasis, "UNRESOLVED");
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
