"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const report = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "porsche_917k", "Porsche_917K_Monza_Pressure_AB_Report.json"), "utf8"));

test("917K Monza A/B evidence retains the hash-matched canonical TirePack", () => {
  assert.equal(report.activeTireIdentity.physicsHashMatch, true);
  assert.equal(report.activeTireIdentity.sameTireVerified, true);
  assert.equal(report.activeTireIdentity.tyresIniSha256, "2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4");
  assert.equal(report.activeTireIdentity.internalSlot, "medium");
});

test("917K corrected run improves every canonical laps 2-5 closure error", () => {
  for (const wheel of ["fl", "fr", "rl", "rr"]) {
    assert.ok(Math.abs(report.correctedB.canonicalWindow[wheel].errorPsi) < Math.abs(report.baselineA.canonicalWindow[wheel].errorPsi), wheel);
  }
  assert.equal(report.baselineA.overallClosure, "FAIL / pressure model mismatch");
  assert.equal(report.correctedB.overallClosure, "REVIEW");
  assert.equal(report.correctedB.canonicalWindow.fl.classification, "PASS");
  assert.equal(report.correctedB.canonicalWindow.rl.classification, "PASS");
});

test("917K evidence keeps thermal, wear and four-host guardrails closed", () => {
  assert.equal(report.guardrails.physicsCoefficientChangesAuthorized, false);
  assert.equal(report.guardrails.wear, "STORE, DO NOT FIT");
  assert.deepEqual(report.guardrails.crossPlyProgram, ["Maserati 250F", "Ford GT40", "Porsche 917K", "Ford Escort RS1600"]);
  assert.match(report.guardrails.thermal, /UNRESOLVED/);
});
