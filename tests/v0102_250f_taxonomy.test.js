"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const baseline = JSON.parse(fs.readFileSync(path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.0.json"), "utf8"));
const release = JSON.parse(fs.readFileSync(path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.1.json"), "utf8"));
const categories = require(path.join(root, "src", "payload", "app", "historical_categories.js"));
const profileState = require(path.join(root, "src", "payload", "app", "profile_state.js"));
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("Knowledge v1.7.1 adds only stable CLS102 and preserves all existing class records", () => {
  assert.equal(release.classes.length, baseline.classes.length + 1);
  assert.equal(hash(release.classes.slice(0, baseline.classes.length)), "2af8c909a035267892311bbda12a85f46e3fc95a6c9af5900f2a80bebe868f76");
  assert.deepEqual(release.classes.slice(0, baseline.classes.length), baseline.classes);
  assert.equal(release.classes.at(-1).id, "CLS102");
  assert.equal(new Set(release.classes.map(item => item.id)).size, release.classes.length);
});

test("CLS102 is a supplier-neutral 1954-58 treaded bias class mapped to FAM002", () => {
  const cls = release.classes.find(item => item.id === "CLS102");
  assert.equal(cls.name, "1954-58 Formula 1 / Grand Prix");
  assert.equal(cls.from, 1954);
  assert.equal(cls.to, 1958);
  assert.equal(cls.familyId, "FAM002");
  assert.equal(cls.construction, "bias");
  assert.equal(cls.dryType, "treaded");
  assert.equal("supplier" in cls, false);
  assert.equal("supportedSuppliers" in cls, false);
  assert.equal("supplierMenuOverlays" in cls, false);
  assert.match(cls.calibrationRule, /no class-level Pirelli/i);
  assert.equal(cls.menu.some(item => Number.isFinite(Number(item.lifeKm))), false);
});

test("1957 Maserati 250F resolves CLS102/FAM002/bias with fixture-only Pirelli provenance", () => {
  assert.equal(categories.loadKnowledgeRelease(release, "test"), true);
  const resolved = categories.resolveClass(1957, "Formula 1 / Grand Prix");
  assert.equal(resolved.classId, "CLS102");
  assert.equal(resolved.familyId, "FAM002");
  const context = categories.contextForClass(resolved.classId, 1957);
  assert.equal(context.construction, "bias");
  assert.equal(context.dryType, "treaded");
  assert.deepEqual(context.supportedSuppliers, []);
  const profile = categories.profileForCar("Maserati 250F 6C");
  assert.equal(profile.classId, "CLS102");
  assert.equal(profile.year, 1957);
  assert.equal(profile.supplier, "Pirelli");
  assert.equal(profile.supplierScope, "1957 works fixture only");
  assert.doesNotMatch(JSON.stringify(profile), /Dunlop|R5/i);

  const state = profileState.create("bias");
  profileState.applyContext(state, context, "1957 profile resolution");
  profileState.setSupplier(state, profile.supplier, profileState.PROVENANCE.DIRECT_HISTORICAL_EVIDENCE, {
    sourceIds: profile.sourceIds,
    confidence: "vehicle/year evidence",
    reason: profile.supplierScope
  });
  const audit = profileState.validate(state, context, {
    year: 1957,
    compound: "race",
    thermalConstruction: "bias",
    carIdentitySourceIds: ["SRC149"],
    geometrySourceIds: ["SRC149"]
  });
  assert.equal(audit.pass, true);
  assert.equal(audit.title, "PROFILE COHERENCE PASS");
  assert.equal(audit.historicalEvidenceStatus, "PARTIALLY SOURCED");
});

test("curated vehicle supplier provenance is carried into generated profile state", () => {
  const appSource = fs.readFileSync(path.join(root, "src", "payload", "app", "app.js"), "utf8");
  assert.match(appSource, /setResearched\("supplier",profile\.supplier,`ACLM Knowledge \$\{profile\.id\}`,profile\.sourceIds\|\|\[\]\)/);
  assert.match(appSource, /citations\.length\?citations:\[String\(source\)\]/);
});

test("1959+ Formula behavior remains CLS002/FAM003 and the 1957 fixture cannot resolve Dunlop R5", () => {
  const oldClass = release.classes.find(item => item.id === "CLS002");
  assert.deepEqual(oldClass, baseline.classes.find(item => item.id === "CLS002"));
  const oldResolution = categories.resolveClass(1960, "Formula 1");
  assert.equal(oldResolution.classId, "CLS002");
  assert.equal(oldResolution.familyId, "FAM003");
  const newResolution = categories.resolveClass(1957, "Formula 1");
  assert.notEqual(newResolution.familyId, "FAM003");
  assert.doesNotMatch(JSON.stringify(categories.profileForCar("Maserati 250F 6C")), /Dunlop|R5/i);
});

test("production numeric tire priors, measurements, families and scaling rules are byte-logically unchanged", () => {
  assert.equal(hash(release.families), "a06dbfed99e6b1acebf444e9bbf74c1c98facfbc031284e1d7652c476cec6437");
  assert.equal(hash(release.generatorPriors), "3e8f0cfa5522e8273506aad59a446a1a135bdb579115f8674dea125167d34334");
  assert.equal(hash(release.measurements), "0e84939894788abd33481962defe13b093c6a41bba27eee63125ee0385b7338d");
  assert.equal(hash(release.scalingRules), "3b8dd4d4c49a65cb391ad5e21a82dc95b874680855649ca044805eaa7f96cd42");
  assert.deepEqual(release.families, baseline.families);
  assert.deepEqual(release.generatorPriors, baseline.generatorPriors);
  assert.deepEqual(release.measurements, baseline.measurements);
  assert.deepEqual(release.scalingRules, baseline.scalingRules);
});
