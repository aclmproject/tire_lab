"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const packs = path.join(root, "artifacts", "canonical_packs");
const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const entry = (archive, name) => execFileSync("tar", ["-xOf", archive, name], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });

function verifyAcEnvelope(archive) {
  const car = entry(archive, "car.ini");
  const tires = entry(archive, "tyres.ini");
  const thermal = JSON.parse(entry(archive, "ACLM_THERMAL_V2_CALIBRATION.json"));
  assert.match(car, /^\[HEADER\]\r?\nVERSION=extended-2\b/m);
  assert.match(tires, /^\[HEADER\]\r?\nVERSION=10\b/m);
  assert.equal(thermal.physicsMode, "CSP Extended Physics - Thermal V2");
  assert.equal(thermal.globalThermalRetune, false);
  assert.equal(thermal.profileCoherent, true);
  assert.equal(thermal.historicalEvidenceStatus, "PARTIALLY SOURCED");
}

test("canonical 917K pack is supplier-neutral CLS035/FAM035 dry endurance", () => {
  const archive = path.join(packs, "ACLM_Porsche_917_K_TirePack.zip");
  assert.equal(sha(archive), "74fd82729ee2f2c250f03e6c7e7ee3667f9084ca15916a5e88ba731458cec963");
  verifyAcEnvelope(archive);
  const tires = entry(archive, "tyres.ini");
  const profile = JSON.parse(entry(archive, "ACLM_PROFILE_STATE.json"));
  const pressure = JSON.parse(entry(archive, "ACLM_PRESSURE_CLOSURE_REPORT.json"));
  assert.match(tires, /^NAME=Dry Endurance$/m);
  assert.match(tires, /^SHORT_NAME=D$/m);
  assert.equal(profile.context.classId, "CLS035");
  assert.equal(profile.context.familyId, "FAM035");
  assert.equal(profile.state.construction.value, "bias");
  assert.equal(profile.state.supplier.value, "General / unknown");
  assert.equal(pressure.globalThermalRetune, false);
  assert.equal(pressure.entries.length, 2);
});

test("canonical 1957 250F pack is CLS102/FAM002 treaded bias with fixture-only Pirelli citations", () => {
  const archive = path.join(packs, "ACLM_Maserati_250F_6_cylinder_TirePack.zip");
  assert.equal(sha(archive), "0fa34b08f0f3c67f4f2fdf5542cddb42bbc7b348c14c7126b94d8a695456f10a");
  verifyAcEnvelope(archive);
  const tires = entry(archive, "tyres.ini");
  const profile = JSON.parse(entry(archive, "ACLM_PROFILE_STATE.json"));
  const evidence = JSON.parse(entry(archive, "ACLM_HISTORICAL_EVIDENCE_STATUS.json"));
  const pressure = JSON.parse(entry(archive, "ACLM_PRESSURE_CLOSURE_REPORT.json"));
  assert.match(tires, /^NAME=Period Treaded Race$/m);
  assert.match(tires, /^SHORT_NAME=R$/m);
  assert.equal(profile.context.classId, "CLS102");
  assert.equal(profile.context.familyId, "FAM002");
  assert.equal(profile.state.construction.value, "bias");
  assert.equal(profile.state.supplier.value, "Pirelli");
  assert.deepEqual(profile.state.supplier.sourceIds, ["SRC146", "SRC148", "SRC149"]);
  assert.equal(evidence.overall, "PARTIALLY SOURCED");
  assert.equal(evidence.categories.supplier.status, "DIRECTLY SOURCED");
  assert.equal(evidence.categories.pressure.status, "PROVISIONAL");
  assert.equal(evidence.categories.temperature.status, "PROVISIONAL");
  assert.equal(pressure.globalThermalRetune, false);
});
