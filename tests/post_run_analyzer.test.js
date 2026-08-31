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
