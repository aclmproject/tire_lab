(function(root){
"use strict";
const APPLICABILITY=Object.freeze({SAME_FAMILY:"SAME_FAMILY",CLOSE_ANALOG:"CLOSE_ANALOG",MECHANISM_ONLY:"MECHANISM_ONLY",NOT_APPLICABLE:"NOT_APPLICABLE"});
const CONFIDENCE=Object.freeze({DIRECT_MEASURED:"DIRECT_MEASURED",SOURCE_TRANSCRIBED:"SOURCE_TRANSCRIBED",DERIVED:"DERIVED",INFERRED:"INFERRED",EXPERIMENTAL:"EXPERIMENTAL",UNRESOLVED:"UNRESOLVED"});
const PIPELINE=Object.freeze([
 {stage:"A",name:"SOURCE_CAPTURE",gate:"immutable source hash, page locator, raw text/value"},
 {stage:"B",name:"OBSERVATION",gate:"test identity, units, conditions and channel recorded; no curve claim without coordinates"},
 {stage:"C",name:"APPLICABILITY",gate:"SAME_FAMILY, CLOSE_ANALOG, MECHANISM_ONLY or NOT_APPLICABLE"},
 {stage:"D",name:"PARAMETER_CANDIDATE",gate:"value/range, uncertainty, provenance and dependency path explicit"},
 {stage:"E",name:"CONTROLLED_EXPERIMENT",gate:"isolated hypothesis, fixture, expected observables and rejection rule"},
 {stage:"F",name:"PRODUCTION_PROMOTION",gate:"family/event scope, regression certification and no higher-specificity conflict"}
]);
const IDENTITY_DIMENSIONS=Object.freeze(["era","discipline","class","supplier","productFamily","constructionGeneration","eventYear","size","axle","compound","wetState"]);
const RELATIONSHIPS=Object.freeze({
 pressure:{dependsOn:["cold pressure","contained-air temperature","cavity volume change","vertical load","speed","construction","rim/geometry"],outputs:["hot pressure","loaded radius","contact patch","stiffness modifiers"],status:"formula implemented; family-specific cavity growth unresolved"},
 transient:{steadyStateSeparateFromBuildup:true,lateral:["relaxation length","load","pressure","speed","construction"],longitudinal:["relaxation length","load","pressure","speed","construction"],aligningMoment:["pneumatic trail","Fy","camber thrust","construction"],status:"architecture defined; Calspan page locators require digitization"},
 forceMoment:{channels:["Fy","Fx","Mz","pneumatic trail","camber thrust","combined slip"],dependencies:["load sensitivity","pressure","camber","slip angle","slip ratio","speed","construction","compound","surface state"]},
 thermal:{states:["surface","carcass/shoulder","contained air/core"],inputs:["slip work","rolling hysteresis","brake heat","ambient/road","speed/cooling","pressure","construction"],outputs:["grip modifier","pressure evolution","degradation risk"]},
 geometry:{states:["unloaded radius","loaded radius","deflection","high-speed growth","contact-patch length/width/pressure distribution"],dependencies:["load","pressure","speed","belt/carcass architecture","rim","temperature"]},
 wear:{components:["physical abrasion","competitive degradation","service/stint durability","AC virtual-km grip health"],status:"kept separate; no universal conversion"},
 resistance:{components:["rolling resistance","hysteresis heating","mass","rotational inertia"],dependencies:["load","pressure","speed","temperature","construction"]}
});
const FAILURE_TAXONOMY=Object.freeze(["puncture/cut","tread separation or chunking","thermal burst","casing fatigue","bead/rim interface","impact damage","secondary accident damage"]);
const PROMOTION_REQUIRED=Object.freeze(["sourceHash","sourceLocator","observationIdentity","applicability","parameterProvenance","uncertainty","controlledFixture","regressionPass"]);
function specificity(applicability){return ({SAME_FAMILY:4,CLOSE_ANALOG:3,MECHANISM_ONLY:2,NOT_APPLICABLE:0})[applicability]??-1;}
function classifyApplicability(evidence={},target={}){
 if(evidence.notApplicable===true)return APPLICABILITY.NOT_APPLICABLE;
 const sameFamily=evidence.familyId&&target.familyId&&evidence.familyId===target.familyId;
 const sameGeneration=!evidence.constructionGeneration||!target.constructionGeneration||evidence.constructionGeneration===target.constructionGeneration;
 if(sameFamily&&sameGeneration)return APPLICABILITY.SAME_FAMILY;
 const sameDiscipline=evidence.discipline&&target.discipline&&evidence.discipline===target.discipline;
 const sameConstruction=evidence.construction&&target.construction&&evidence.construction===target.construction;
 if(sameDiscipline&&sameConstruction)return APPLICABILITY.CLOSE_ANALOG;
 if(evidence.mechanismSupported!==false)return APPLICABILITY.MECHANISM_ONLY;
 return APPLICABILITY.NOT_APPLICABLE;
}
function promotionDecision(candidate={},existing={}){
 const missing=PROMOTION_REQUIRED.filter(key=>candidate[key]===undefined||candidate[key]===null||candidate[key]===""||candidate[key]===false);
 if(!candidate.digitizedPointCount||candidate.digitizedPointCount<2)missing.push("digitizedPointCount>=2");
 if(specificity(candidate.applicability)<specificity(APPLICABILITY.CLOSE_ANALOG))missing.push("applicability>=CLOSE_ANALOG");
 if(candidate.mappingConfidence==="LOW")missing.push("mappingConfidence!=LOW");
 if(existing.applicability&&specificity(existing.applicability)>specificity(candidate.applicability))missing.push("does not override higher-specificity evidence");
 return {promote:missing.length===0,status:missing.length?"BLOCKED":"ELIGIBLE_FOR_REVIEW",missing:[...new Set(missing)]};
}
function parameterRecord(name,value,options={}){return {name,value:value??null,unit:options.unit||null,confidence:options.confidence||CONFIDENCE.UNRESOLVED,sourceIds:[...(options.sourceIds||[])],applicability:options.applicability||APPLICABILITY.MECHANISM_ONLY,uncertainty:options.uncertainty||null,known:options.known===true,inferred:options.inferred===true,experimental:options.experimental===true,production:options.production===true};}
function familyIdentity(input={}){return Object.fromEntries(IDENTITY_DIMENSIONS.map(key=>[key,input[key]??null]));}
function architecture(){return {schema:"ACLM evidence-to-model architecture 1.0",identityDimensions:[...IDENTITY_DIMENSIONS],pipeline:PIPELINE.map(x=>({...x})),relationships:RELATIONSHIPS,failureTaxonomy:[...FAILURE_TAXONOMY],compoundPolicy:{historicalRole:"source identity",normalizedRole:"cross-family UI comparison only",rule:"normalized labels never erase historical compound identity"},wetPolicy:{states:["dry","intermediate","wet","standing-water/aquaplaning"],rule:"separate hardware/compound/test-condition branches where evidence permits"},scrubIn:{separateFromWear:true,status:"architecture placeholder pending family-specific evidence"},promotionRequired:[...PROMOTION_REQUIRED]};}
const api={APPLICABILITY,CONFIDENCE,PIPELINE,IDENTITY_DIMENSIONS,RELATIONSHIPS,FAILURE_TAXONOMY,classifyApplicability,promotionDecision,parameterRecord,familyIdentity,architecture};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.ACLMEvidenceModel=api;
})(typeof window!=="undefined"?window:globalThis);
