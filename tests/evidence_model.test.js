"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const evidence=require("../src/payload/app/evidence_model.js"),calspan=require("../src/payload/app/calspan_observations.js");
const root=path.resolve(__dirname,"..");

test("Calspan corpus counts stay record-type explicit",()=>{
 const summary=calspan.summary();
 assert.equal(summary.measurementPages,708);assert.equal(summary.fullyDigitizedForceCurvePointObservations,0);
 assert.equal(Object.values(summary.measurementPageTypes).reduce((a,b)=>a+b,0),708);
 assert.equal(summary.appendixBTireIds-summary.reportedProcuredTires,2);
});
test("strict normalization preserves malformed OCR as unresolved",()=>{
 assert.equal(calspan.strictNumber("32."),32);assert.equal(calspan.strictNumber("2.4-"),null);assert.equal(calspan.strictNumber("lG20"),null);
 const x=calspan.normalizeCondition({road_speed_mph_raw:"50",cold_infl_psi_raw:"24",design_load_lb_raw:"1000",water_depth_mil_raw:"20"});
 assert.equal(x.normalized.roadSpeedKph,80.4672);assert.equal(x.normalized.coldInflationKpa,165.4742);assert.equal(x.normalized.designLoadN,4448.2216);assert.equal(x.normalized.waterDepthMm,.508);
});
test("generic Calspan evidence cannot override racing family evidence",()=>{
 const applicability=evidence.classifyApplicability({discipline:"passenger-road",mechanismSupported:true},{familyId:"FAM035",discipline:"world sportscar",construction:"bias"});
 assert.equal(applicability,evidence.APPLICABILITY.MECHANISM_ONLY);
 const decision=evidence.promotionDecision({applicability,digitizedPointCount:0,mappingConfidence:"HIGH"},{applicability:evidence.APPLICABILITY.SAME_FAMILY});
 assert.equal(decision.promote,false);assert.ok(decision.missing.includes("digitizedPointCount>=2"));assert.ok(decision.missing.includes("does not override higher-specificity evidence"));
});
test("promotion gate requires provenance, uncertainty, controlled fixture and regression",()=>{
 const decision=evidence.promotionDecision({applicability:evidence.APPLICABILITY.CLOSE_ANALOG,digitizedPointCount:8,mappingConfidence:"HIGH"});
 for(const field of ["sourceHash","sourceLocator","observationIdentity","parameterProvenance","uncertainty","controlledFixture","regressionPass"])assert.ok(decision.missing.includes(field),field);
});
test("architecture separates steady/transient, thermal states, wear meanings and failure modes",()=>{
 const a=evidence.architecture();
 assert.equal(a.relationships.transient.steadyStateSeparateFromBuildup,true);
 assert.deepEqual(a.relationships.thermal.states,["surface","carcass/shoulder","contained air/core"]);
 assert.equal(a.relationships.wear.components.length,4);assert.ok(a.failureTaxonomy.includes("tread separation or chunking"));
 assert.deepEqual(a.identityDimensions,["era","discipline","class","supplier","productFamily","constructionGeneration","eventYear","size","axle","compound","wetState"]);
});
test("Knowledge v1.9.0 preserves every frozen production collection",()=>{
 const a=require("../knowledge/releases/ACLM_Tire_Knowledge_v1.8.0.json"),b=require("../knowledge/releases/ACLM_Tire_Knowledge_v1.9.0.json");
 const hash=x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
 for(const key of ["generatorPriors","measurements","scalingRules","fitmentOverrides","classes"])assert.equal(hash(a[key]),hash(b[key]),key);
 assert.equal(b.calspanCorpus.digitizedForceCurvePointObservations,0);assert.equal(b.researchFamilyPriors.length,85);
});
test("all 708 observation rows are non-promoted page locators",()=>{
 const file=fs.readFileSync(path.join(root,"research_import","calspan_1976","CALSPAN_TEST_OBSERVATIONS.csv"),"utf8").trim().split(/\r?\n/);
 assert.equal(file.length,709);assert.ok(file[0].includes("digitized_curve_point_count"));
 for(const line of file.slice(1))assert.ok(line.includes("PAGE_LOCATOR_ONLY_NO_XY_POINTS"));
});
