"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
require(path.join(__dirname,"..","src","payload","app","validation_core.js"));
const core=globalThis.ACLMValidationCore;

function test(name,fn){try{fn();process.stdout.write("PASS "+name+"\n");}catch(error){process.stderr.write("FAIL "+name+": "+error.stack+"\n");process.exitCode=1;}}

test("BRM warm/cold fixture proves convergence without authorizing a retune",()=>{
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","telemetry","brm_p48_csp_v2_warm_cold_ab.json"),"utf8"));
 const result=core.analyzeCalibrationFixture(fixture);
 assert.equal(result.converged,true);
 assert.equal(result.startGapC,34);
 assert.ok(result.maxEquilibriumDeltaC<=.91);
 assert.equal(result.classification,fixture.expectedDiagnostic);
 assert.equal(result.coefficientDecision,"hold");
 assert.match(result.frictionConclusion,/Do not increase FRICTION_K/);
 assert.deepEqual(result.networkAudit,fixture.networkAudit);
 assert.equal(result.pressureAudit.hypotheses.C.startsWith("Leading pressure-only hypothesis"),true);
 assert.equal(result.wearAudit.runs[1].aidTireRate,5);
 assert.equal(result.wearAudit.runs[1].classification,"5x accelerated wear — incident/abuse test");
 assert.equal(fixture.nextTest.car,"Ford Escort RS1600");
});

test("telemetry summary preserves float wear and normalizes accelerated tests",()=>{
 const headers=["distance_traveled_m","air_temp_c","road_temp_c","aid_tire_rate"];
 for(const metric of ["pressure_psi","wear_raw","core_temp_c","temp_inner_c","temp_middle_c","temp_outer_c"])for(const wheel of ["fl","fr","rl","rr"])headers.push(metric+"_"+wheel);
 function row(distance,wear,core,surface){const values=[distance,26,37,5];for(const metric of ["pressure","wear","core","inner","middle","outer"])for(let i=0;i<4;i++)values.push(metric==="pressure"?[22.6,22.2,23.5,23.1][i]:metric==="wear"?wear:metric==="core"?core[i]:surface[i]+({inner:-1,middle:0,outer:1}[metric]||0));return values.join(",");}
 const csv=headers.join(",")+"\n"+row(0,"100.00000000",[36,36,36,36],[42,42,46,46])+"\n"+row(18370,"99.98765432",[46,44,53,51],[58,55,69,68])+"\n"+row(36740,"99.95000001",[48.6,45.3,56.3,53.3],[66,63,82,82])+"\n";
 const summary=core.telemetrySummary(core.parseTelemetry(csv),{wearMultiplier:1,requestedConditions:{airTempC:26,roadTempC:26},intendedTemperatureWindow:{low:62.25,high:92.25,fullGripLow:70.5,fullGripHigh:81.5},idealPressurePsi:26,generatedColdPressurePsi:{front:20.2,rear:20.2}});
 assert.equal(summary.conditions.observed.roadTempC.mean,37);
 assert.equal(summary.conditions.requested.roadTempC,26);
 assert.equal(summary.conditions.mismatchIsRejection,false);
 assert.equal(summary.wear.aidTireRate,5);
 assert.equal(summary.wear.multiplierSource,"recorded AC aidTireRate");
 assert.equal(summary.wear.wheels.fl.startRawText,"100.00000000");
 assert.equal(summary.wear.wheels.fl.endRawText,"99.95000001");
 assert.ok(Math.abs(summary.wear.wheels.fl.deltaFromStartRaw-(-.04999999))<1e-10);
 assert.ok(Math.abs(summary.wear.wheels.fl.normalized1xDeltaEstimate-(-.009999998))<1e-10);
 assert.ok(Math.abs(summary.wear.realDistanceKm-36.74)<1e-12);
 assert.equal(summary.wear.normalization.isEstimate,true);
 assert.equal(summary.thermalDiagnostic.classification,core.COUPLED_NETWORK_DIAGNOSTIC);
 assert.match(summary.thermalDiagnostic.frictionConclusion,/Do not increase FRICTION_K/);
 assert.equal(summary.pressureAudit.generatedPressureIdealPsi,26);
 assert.ok(summary.pressureAudit.gapBelowIdealPsi>2);
});

test("older CSV can declare a fallback multiplier and remains explicitly estimated",()=>{
 const csv="distance_traveled_m,wear_raw_fl,wear_raw_fr,wear_raw_rl,wear_raw_rr\n0,100,100,100,100\n10000,99.5,99.5,99.4,99.4\n";
 const summary=core.telemetrySummary(core.parseTelemetry(csv),{wearMultiplier:2});
 assert.equal(summary.wear.aidTireRate,2);
 assert.equal(summary.wear.multiplierSource,"user-declared fallback");
 assert.equal(summary.wear.normalization.isEstimate,true);
 assert.equal(summary.wear.wheels.fl.normalized1xDeltaEstimate,-.25);
 assert.match(summary.wear.normalization.warning,/estimate, not a direct 1x measurement/);
});

test("BRM 5x incident run reports nominal exposure and blocks delta-to-life normalization",()=>{
 const csv=[
  "distance_traveled_m,aid_tire_rate,wear_raw_fl,wear_raw_fr,wear_raw_rl,wear_raw_rr",
  "0,5,100.000000,100.000000,100.000000,100.000000",
  "23810,5,100.000000,100.000000,99.999992,100.000000",
  "26460,5,100.000000,100.000000,99.920000,99.999992",
  "32430,5,100.000000,100.000000,99.693832,99.822067"
 ].join("\n")+"\n";
 const w=core.telemetrySummary(core.parseTelemetry(csv),{wearTestClassification:"incident-abuse"}).wear;
 assert.equal(w.aidTireRate,5);
 assert.equal(w.incidentAbuse,true);
 assert.equal(w.nominalMultiplierNormalizedExposureKm,162.15);
 assert.equal(w.wheels.rl.endRawText,"99.693832");
 assert.equal(w.wheels.rr.endRawText,"99.822067");
 assert.equal(w.nominalExposureLabel,"NOMINAL MULTIPLIER-NORMALIZED EXPOSURE — NOT A DIRECT HISTORICAL LIFE ESTIMATE.");
 assert.equal(w.wheels.rl.firstPlateauExitRealKm,23.81);
 assert.equal(w.wheels.rl.firstPlateauExitNominalExposureKm,119.05);
 assert.equal(w.wheels.rr.firstPlateauExitRealKm,26.46);
 assert.equal(w.wheels.rr.firstPlateauExitNominalExposureKm,132.3);
 assert.equal(Number.isNaN(w.wheels.rl.normalized1xDeltaEstimate),true);
 assert.equal(w.normalization.deltaNormalizationAllowed,false);
 assert.match(w.normalization.warning,/Do not divide final grip-health loss/);
});

test("Escort validation profile requires a year-correct class match",()=>{
 const profile=core.TEST_CARS.find(x=>x.id==="escort_mk1_g2");
 const classes=[
  {id:"OLD",name:"1950-59 Touring / Saloon racing",from:1950,to:1959},
  {id:"RIGHT",name:"1972-76 Group 2 / ETCC Touring",from:1972,to:1976}
 ];
 assert.equal(core.selectTestClass(classes,profile).id,"RIGHT");
 const protocol=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","telemetry","escort_rs1600_clean_1x_protocol.json"),"utf8"));
 assert.equal(protocol.tireFamilyId,"FAM023");
 assert.equal(protocol.classId,"CLS022");
 assert.equal(protocol.aidTireRate,1);
 assert.equal(protocol.warmers,false);
 assert.equal(protocol.decisionGate,"Review this clean 1x dataset before running a 5x accelerated Escort test.");
});
