"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

test("full research archive provenance is complete and numerically guarded", () => {
  const provenance = readJson("research_import/INGESTION_PROVENANCE.json");
  assert.equal(provenance.stats.top_level_inputs, 75);
  assert.equal(provenance.stats.top_level_archives, 74);
  assert.equal(provenance.stats.workbooks, 1);
  assert.equal(provenance.stats.archive_errors, 0);
  assert.equal(provenance.stats.member_errors, 0);
  assert.equal(provenance.stats.parse_errors, 0);
  assert.equal(provenance.stats.canonical_evidence_records, 2478);
  assert.equal(provenance.stats.canonical_sources, 1304);
  assert.equal(provenance.productionNumericChangesRecommended, false);
  for (const output of provenance.outputs) {
    assert.equal(fs.existsSync(path.join(root, "research_import", output)), true, output);
  }
});

test("Knowledge v1.8.0 preserves frozen production collections and event-scopes 917 supplier evidence", () => {
  const previous = readJson("knowledge/releases/ACLM_Tire_Knowledge_v1.7.1.json");
  const current = readJson("knowledge/releases/ACLM_Tire_Knowledge_v1.8.0.json");
  for (const key of ["generatorPriors", "measurements", "scalingRules", "fitmentOverrides", "classes"]) {
    assert.deepEqual(current[key], previous[key], key);
  }
  assert.equal(current.releaseVersion, "1.8.0");
  const profile = current.profiles.find(item => item.id === "CAR023");
  assert.ok(profile);
  assert.equal(profile.supplier, null);
  assert.match(profile.supplierScope, /event/i);
});
