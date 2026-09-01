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

test("917K 30F/35R confirmation and independent repeat retain exact identity and mappings", () => {
  assert.equal(report.confirmationC.csvSha256, "9fcd20777c1ebdff2937a3df273b0aed1165c916a0559d1e2006b17627345721");
  assert.equal(report.confirmationC.manifestSha256, "aabe0c094cd742cc5efcab397b5af9eaf68dea2e4a8690410d7de540c71f9cae");
  assert.equal(report.confirmationC.windowSelection.basis, "LITERAL_AC_LAPS");
  assert.deepEqual(report.confirmationC.windowSelection.rawAcLaps, [2, 3, 4, 5]);
  assert.equal(report.confirmationC2.csvSha256, "76868db94ba76ecfb6fc51173e702cb76b577eeb2550f784b01aca0be95a6bf3");
  assert.equal(report.confirmationC2.manifestSha256, "f0e95dff7339b29a78f75e0b20f098837e5060d1f78772522f77e0b72d22ec38");
  assert.equal(report.confirmationC2.windowSelection.basis, "SESSION_RELATIVE_REBASED");
  assert.deepEqual(report.confirmationC2.windowSelection.rawAcLaps, [9, 10, 11, 12]);
  assert.deepEqual(report.confirmationC2.windowSelection.mapping, [
    { relativeLap: 1, rawAcLap: 8 },
    { relativeLap: 2, rawAcLap: 9 },
    { relativeLap: 3, rawAcLap: 10 },
    { relativeLap: 4, rawAcLap: 11 },
    { relativeLap: 5, rawAcLap: 12 }
  ]);
});

test("917K C2 independently repeats C and closes the driving phase without a physics retune", () => {
  for (const wheel of ["fl", "fr", "rl", "rr"]) {
    const c = report.confirmationC.canonicalWindow[wheel];
    const c2 = report.confirmationC2.canonicalWindow[wheel];
    assert.equal(c.classification, "REVIEW");
    assert.equal(c2.classification, "REVIEW");
    assert.ok(Math.abs(c.meanPsi - c2.meanPsi) < 0.023, wheel);
  }
  assert.equal(report.confirmationC2.intentMetadata.status, "UNCLASSIFIED_GENERIC_TELEMETRY");
  assert.match(report.decision, /29 psi front and 34 psi rear/);
  assert.match(report.decision, /Request no further 917K driving now/);
});

test("917K evidence keeps thermal, wear and four-host guardrails closed", () => {
  assert.equal(report.guardrails.physicsCoefficientChangesAuthorized, false);
  assert.equal(report.guardrails.wear, "STORE, DO NOT FIT");
  assert.deepEqual(report.guardrails.crossPlyProgram, ["Maserati 250F", "Ford GT40", "Porsche 917K", "Ford Escort RS1600"]);
  assert.match(report.guardrails.thermal, /UNRESOLVED/);
});
