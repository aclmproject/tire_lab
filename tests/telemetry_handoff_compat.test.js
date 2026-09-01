"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const compat = require("../src/payload/app/telemetry_handoff_compat.js");

const root = path.resolve(__dirname, "..");
const CURRENT_APP_VERSION = "0.10.4";
const packs = {
  maserati250f: path.join(root, "artifacts", "canonical_packs", "ACLM_Maserati_250F_6_cylinder_TirePack.zip"),
  porsche917k: path.join(root, "artifacts", "canonical_packs", "ACLM_Porsche_917_K_TirePack.zip")
};
const entry = (archive, name) => execFileSync("tar", ["-xOf", archive, name], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const fixture = archive => {
  const tyresIni = entry(archive, "tyres.ini");
  return {
    tyresIni,
    actualHash: crypto.createHash("sha256").update(tyresIni).digest("hex"),
    manifest: JSON.parse(entry(archive, "ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"))
  };
};

test("canonical v0.10.2 Maserati 250F handoff is accepted and retains curated identity", () => {
  const input = fixture(packs.maserati250f);
  const result = compat.validate({ manifest: input.manifest, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: input.actualHash });
  assert.equal(result.compatibility, "CERTIFIED_V0.10.2_CANONICAL_HANDOFF");
  assert.deepEqual(
    { year: result.manifest.year, class: result.manifest.class, family: result.manifest.family, construction: result.manifest.construction, supplier: result.manifest.supplier },
    { year: 1957, class: "CLS102", family: "FAM002", construction: "bias", supplier: "Pirelli" }
  );
});

test("canonical v0.10.2 Porsche 917K handoff is accepted and retains curated identity", () => {
  const input = fixture(packs.porsche917k);
  const result = compat.validate({ manifest: input.manifest, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: input.actualHash });
  assert.equal(result.compatibility, "CERTIFIED_V0.10.2_CANONICAL_HANDOFF");
  assert.deepEqual(
    { year: result.manifest.year, class: result.manifest.class, family: result.manifest.family, construction: result.manifest.construction, supplier: result.manifest.supplier },
    { year: 1970, class: "CLS035", family: "FAM035", construction: "bias", supplier: "General / unknown" }
  );
});

test("current application handoff remains accepted", () => {
  const input = fixture(packs.maserati250f);
  const current = { ...input.manifest, appVersion: CURRENT_APP_VERSION };
  const result = compat.validate({ manifest: current, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: input.actualHash });
  assert.equal(result.compatibility, "CURRENT_APPLICATION");
});

test("mismatched tyres.ini SHA-256 is rejected", () => {
  const input = fixture(packs.maserati250f);
  assert.throws(() => compat.validate({ manifest: input.manifest, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: "0".repeat(64) }), /does not match.*tyres\.ini SHA-256/i);
});

test("unsupported older, intervening and newer app versions are rejected", () => {
  const input = fixture(packs.maserati250f);
  for (const appVersion of ["0.10.1", "0.10.3", "0.10.5", "1.0.0"]) {
    assert.throws(() => compat.validate({ manifest: { ...input.manifest, appVersion }, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: input.actualHash }), /app version .* is not compatible/i, appVersion);
  }
});

test("wrong telemetry schema is rejected", () => {
  const input = fixture(packs.maserati250f);
  assert.throws(() => compat.validate({ manifest: { ...input.manifest, schema: "ACLM telemetry calibration manifest 1.0" }, currentAppVersion: CURRENT_APP_VERSION, actualTyresIniSha256: input.actualHash }), /schema is unsupported/i);
});
