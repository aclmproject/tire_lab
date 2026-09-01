"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("250F evidence matrix reflects resolved v1.7.1 taxonomy and canonical fixture", () => {
  const matrix = JSON.parse(read("docs/MASERATI_250F_CROSSPLY_EVIDENCE_MATRIX.json"));
  assert.equal(matrix.taxonomy.classId, "CLS102");
  assert.equal(matrix.taxonomy.familyId, "FAM002");
  assert.equal(matrix.taxonomy.status, "RESOLVED_KNOWLEDGE_V1_7_1");
  assert.equal(matrix.canonicalFixture.knowledgeVersion, "1.7.1");
  assert.deepEqual(matrix.canonicalFixture.achievableSetupColdPressurePsi, { front: 24, rear: 24 });
  assert.equal(matrix.canonicalFixture.tirePackSha256, "0fa34b08f0f3c67f4f2fdf5542cddb42bbc7b348c14c7126b94d8a695456f10a");
  assert.doesNotMatch(matrix.decision, /do not generate|blocked/i);

  const markdown = read("docs/MASERATI_250F_CROSSPLY_EVIDENCE_MATRIX.md");
  assert.match(markdown, /Knowledge v1\.7\.1 closes the former class gap/);
  assert.doesNotMatch(markdown, /blocked pending|class \| UNKNOWN/i);
});

test("250F live card fails closed and preserves the canonical pressure screen", () => {
  const card = read("docs/MASERATI_250F_LIVE_TEST_CARD_v0102.md");
  assert.match(card, /physicsHashMatch=true/);
  assert.match(card, /24 psi LF \/ 24 psi RF \/ 24 psi LR \/ 24 psi RR/);
  assert.match(card, /AI_REFERENCE/);
  assert.match(card, /complete laps 2–5/i);
  assert.match(card, /Warmers requested: OFF/);
  assert.match(card, /Exit Assetto Corsa completely/);
  assert.match(card, /fresh AC session/);
  assert.match(card, /Import the newly installed `ks_maserati_250f_6c` car into Tire Lab/);
  assert.match(card, /Thermal and wear channels are \*\*STORE, DO NOT FIT\*\*/);
  assert.match(card, /0fa34b08f0f3c67f4f2fdf5542cddb42bbc7b348c14c7126b94d8a695456f10a/);
});

test("four-host program keeps every cross-ply fixture and shared-retune guardrail", () => {
  const program = read("docs/CROSS_PLY_FOUR_HOST_PROGRAM.md");
  for (const host of ["Maserati 250F", "Ford GT40 Mk II", "Porsche 917K", "Ford Escort RS1600"]) {
    assert.match(program, new RegExp(host));
  }
  assert.match(program, /STALE\/HASH_MISMATCH/);
  assert.match(program, /HOLD SHARED COEFFICIENTS/);
  assert.match(program, /physicsHashMatch=true/);
  assert.match(program, /No pressure, compliance, Thermal V2, wear, or production knowledge numeric coefficient may be pooled or retuned/);
});

test("durable checkpoints preserve completed 917K result and frozen Knowledge authority", () => {
  const current = read("docs/CURRENT_PROJECT_CHECKPOINT.md");
  const research = read("docs/RESEARCH_KNOWLEDGE_CHECKPOINT.md");
  assert.match(current, /Baseline A: `FAIL`/);
  assert.match(current, /Corrected B: `REVIEW`/);
  assert.match(current, /30 psi front \/ 35 psi rear/);
  assert.match(current, /29F\/34R/);
  assert.match(current, /Request no further 917K driving now/);
  assert.match(current, /No driving or calibration use unless `physicsHashMatch=true`/);
  assert.match(research, /Knowledge version: v1\.7\.1/);
  assert.match(research, /Families, generator priors, measurements, scaling rules, and all production numerical collections are frozen unchanged from v1\.7\.0/);
  assert.match(research, /250F \+ GT40 \+ 917K \+ Escort/);
  assert.match(research, /OVERNIGHT_RESEARCH_INGEST_2026-09-01/);
});

test("overnight research ingest remains evidence-staged and numerically frozen", () => {
  const ingest = read("docs/OVERNIGHT_RESEARCH_INGEST_2026-09-01.md");
  assert.match(ingest, /30 targeted full texts/);
  assert.match(ingest, /10 measurements, 18 observations, 10 scaling rules and 8 methodology records/);
  assert.match(ingest, /443 temporal-label conflicts/);
  assert.match(ingest, /No candidate Knowledge release is created/);
  assert.match(ingest, /Production families, classes, measurements, generator priors and scaling numerics are unchanged/);
});
