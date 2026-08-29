"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const pressure=require(path.join(__dirname,"..","src","payload","app","pressure_solver.js"));
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

test("Escort baseline fails per-wheel pressure closure and raises the unsafe stop flag",()=>{
 const h=["distance_traveled_m","pressure_psi_fl","pressure_psi_fr","pressure_psi_rl","pressure_psi_rr","core_temp_c_fl","core_temp_c_fr","core_temp_c_rl","core_temp_c_rr","temp_middle_c_fl","temp_middle_c_fr","temp_middle_c_rl","temp_middle_c_rr","wheel_load_n_fl","wheel_load_n_fr","wheel_load_n_rl","wheel_load_n_rr","wheel_slip_raw_fl","wheel_slip_raw_fr","wheel_slip_raw_rl","wheel_slip_raw_rr","wear_raw_fl","wear_raw_fr","wear_raw_rl","wear_raw_rr","accg_lat","steering"];
 const row=(d,p)=>[d,...p,58,56,62,60,61,59,66,64,3100,3000,2800,2700,.08,.09,.14,.13,100,100,100,100,1.05,.31].join(",");
 const csv=h.join(",")+"\n"+row(0,[25,24,25,24])+"\n"+row(5000,[25,24,25,24])+"\n";
 const base=core.telemetrySummary(core.parseTelemetry(csv),{idealPressurePsi:27,pressureAB:{role:"baseline",unsafeBaseline:true,subjectiveFeedback:"excessive carcass flex and outside-tire rollover/tripping"}});
 assert.equal(base.pressureAudit.perWheel.fl.hotPressureErrorPsi,-2);
 assert.equal(base.pressureAudit.perWheel.fr.hotPressureErrorPsi,-3);
 assert.equal(base.pressureAudit.overallClosureClassification,"FAIL / pressure model mismatch");
 assert.equal(base.pressureAudit.safetyFlag,"GENERATED BASELINE UNSAFE FOR CONTINUED HIGH-SPEED VALIDATION");
 assert.deepEqual(base.pressureAudit.complianceAuditKeys,core.PRESSURE_COMPLIANCE_KEYS);
});

test("same-tire Escort pressure A/B closes pressure without deciding the generator prematurely",()=>{
 const h="distance_traveled_m,pressure_psi_fl,pressure_psi_fr,pressure_psi_rl,pressure_psi_rr,core_temp_c_fl,core_temp_c_fr,core_temp_c_rl,core_temp_c_rr,temp_middle_c_fl,temp_middle_c_fr,temp_middle_c_rl,temp_middle_c_rr,wheel_load_n_fl,wheel_load_n_fr,wheel_load_n_rl,wheel_load_n_rr,wheel_slip_raw_fl,wheel_slip_raw_fr,wheel_slip_raw_rl,wheel_slip_raw_rr,wear_raw_fl,wear_raw_fr,wear_raw_rl,wear_raw_rr,accg_lat,steering";
 const data=p=>h+"\n0,"+p.join(",")+",50,50,55,55,55,55,60,60,3000,3000,2800,2800,.1,.1,.12,.12,100,100,100,100,1,.3\n5000,"+p.join(",")+",52,52,57,57,57,57,62,62,3100,3100,2900,2900,.08,.08,.1,.1,100,100,99.99,99.99,1.1,.28\n";
 const a=core.telemetrySummary(core.parseTelemetry(data([25,24,25,24])),{idealPressurePsi:27,pressureAB:{role:"baseline",tirePackId:"escort-fam023-pack",coldPressureAdjustmentPsi:{fl:0,fr:0,rl:0,rr:0}}});
 const b=core.telemetrySummary(core.parseTelemetry(data([27,27,27,27])),{idealPressurePsi:27,pressureAB:{role:"corrected",tirePackId:"escort-fam023-pack",coldPressureAdjustmentPsi:{fl:2,fr:3,rl:2,rr:3}}});
 const result=core.comparePressureAB(a,b);
 assert.equal(result.sameTireRequired,true);
 assert.equal(result.sameTireVerified,true);
 assert.equal(result.allowedChange,"cold pressure only");
 assert.equal(result.correctedPressureClosureGood,true);
 assert.equal(result.perWheel.fr.closureImprovementPsi,3);
 assert.match(result.decision,/prioritize cold-pressure prediction/);
});

test("generated pressure report separates static, ideal, rise and predicted hot",()=>{
 const r=pressure.pressureReport({staticPsi:20,idealPsi:27,referenceColdC:26,targetHotC:80,inputs:{estimatedInternalAirVolumeM3:.025}});
 assert.equal(r.generatedPressureStaticPsi,20);
 assert.equal(r.generatedPressureIdealPsi,27);
 assert.ok(Number.isFinite(r.predictedHotPressureRisePsi));
 assert.ok(Number.isFinite(r.predictedStabilizedHotPressurePsi));
 assert.ok(r.pendingCalibrationFactors.includes("internal air volume and dimensional growth"));
});
