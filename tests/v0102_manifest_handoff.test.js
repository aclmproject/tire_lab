"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"src/payload/app/app.js"),"utf8");
const canonicalRoot=path.join(root,"artifacts/canonical_packs/verify_917k");

test("canonical 917K embedded telemetry identity matches its tyres.ini",()=>{
 const tyreText=fs.readFileSync(path.join(canonicalRoot,"tyres.ini"),"utf8");
 const carText=fs.readFileSync(path.join(canonicalRoot,"car.ini"),"utf8");
 const manifest=JSON.parse(fs.readFileSync(path.join(canonicalRoot,"ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"),"utf8"));
 const thermal=JSON.parse(fs.readFileSync(path.join(canonicalRoot,"ACLM_THERMAL_V2_CALIBRATION.json"),"utf8"));
 const pressure=JSON.parse(fs.readFileSync(path.join(canonicalRoot,"ACLM_PRESSURE_CLOSURE_REPORT.json"),"utf8"));
 const actual=crypto.createHash("sha256").update(tyreText).digest("hex");
 assert.equal(actual,"2a710b3333ddfc78acdac0b930959476b2cd0fe4950eab045c0e63da8a8742b4");
 assert.equal(manifest.tireFileSha256,actual);
 assert.equal(manifest.appVersion,"0.10.2");
 assert.equal(manifest.knowledgeVersion,"1.7.1");
 assert.equal(manifest.car,"Porsche 917 K");
 assert.equal(manifest.year,1970);
 assert.equal(manifest.family,"FAM035");
 assert.equal(manifest.class,"CLS035");
 assert.equal(manifest.construction,"bias");
 assert.equal(manifest.supplier,"General / unknown");
 assert.deepEqual(manifest.compound,["medium"]);
 assert.equal(manifest.referenceDriver,"AI_REFERENCE");
 assert.deepEqual(manifest.requestedCondition,{airTemperatureC:26,roadTemperatureC:26,wearMultiplier:1,fuelRate:null,damageRate:null,startingFuelLiters:null,sessionBlanketsEnabled:false});
 assert.deepEqual(manifest.pressureReference.axleReport.map(x=>[x.axle,x.achievableSetupColdPressurePsi]),[["front",28],["rear",33]]);
 assert.match(carText,/^VERSION=extended-2(?:\s*[;#].*)?$/m);
 assert.match(tyreText,/^VERSION=10$/m);
 assert.equal(thermal.physicsMode,"CSP Extended Physics - Thermal V2");
 assert.equal(thermal.globalThermalRetune,false);
 assert.equal(pressure.globalThermalRetune,false);
});

test("telemetry handoff verifies imported identity and never reuses stale generated files",()=>{
 const handoff=app.slice(app.indexOf("window.ACLMCurrentTelemetryManifest="));
 assert.match(app,/verifiedTelemetryHandoffFromImport/);
 assert.match(app,/actual!==expected/);
 assert.match(handoff,/if\(verifiedImportedTelemetryHandoff\)return/);
 assert.match(handoff,/withCurrentRunMetadata/);
 assert.match(app,/selectedSetupColdPressurePsi=selected/);
 assert.match(handoff,/generatedFiles=build\(\)/);
 assert.doesNotMatch(handoff,/if\(!generatedFiles\[/);
});

test("verified imported handoff persists until import replacement or explicit clear",()=>{
 const clearCalls=app.match(/clearVerifiedImportedTelemetryHandoff\(\)/g)||[];
 assert.equal(clearCalls.length,3,"handoff should clear only in its function declaration, a new import, and Clear imported data");
 assert.doesNotMatch(app,/TELEMETRY_HANDOFF_METADATA_IDS/);
 assert.doesNotMatch(app,/document\.addEventListener\([^\n]+clearVerifiedImportedTelemetryHandoff/);
});

test("physics import applies curated identity before its final preview rebuild",()=>{
 const body=app.slice(app.indexOf("function populateFromPhysics"),app.indexOf("async function doZipImport"));
 const curated=body.lastIndexOf("applyCuratedKnowledgeProfile(false)");
 const rebuild=body.lastIndexOf("generatedFiles=build()");
 assert.ok(curated>=0,"curated profile application missing");
 assert.ok(rebuild>curated,"preview rebuild must follow curated identity application");
});
