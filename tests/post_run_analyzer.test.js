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
    activeInstalledPhysics: { tyresIniSha256: "same", activePressureIdealFrontPsi: 32, activePressureIdealRearPsi: 38, activeCompoundIdentity: { name: "Dry Endurance", shortName: "D" } },
    generatedConfiguration: { tireFileSha256: "same" }
  }));
  const report = analyzePostRun(csv, manifest, { fixtureId: "SYNTHETIC-SCREEN" });
  assert.equal(report.identity.compoundIdentity, "MATCH");
  assert.deepEqual(report.pressure.shortScreen.lapWindow, [2, 3, 4, 5]);
  assert.equal(report.pressure.shortScreen.status, "AVAILABLE");
  assert.equal(report.pressure.shortScreen.overallClosureClassification, "PASS");
  close(report.pressure.shortScreen.perWheel.fl.meanPsi, 32, 1e-9, "canonical FL pressure");
  assert.notEqual(report.pressure.perWheel.fl.latePsi, report.pressure.shortScreen.perWheel.fl.meanPsi);
  assert.match(report.markdown, /does not replace the canonical short-screen window/i);
  fs.rmSync(directory, { recursive: true, force: true });
});
