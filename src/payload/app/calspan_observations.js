(function(root){
"use strict";
const CORPUS=Object.freeze({schema:"ACLM Calspan 1976 indexed corpus 1.0",sourceVolumes:9,indexedPages:3630,appendixBTireIds:380,reportedProcuredTires:378,identityCountDiscrepancy:2,testPackages:358,uniqueMappedMasterTires:306,measurementPages:708,measurementPageTypes:Object.freeze({cornering_coefficients:348,braking_coefficients:286,test_data:65,combined_interaction:9}),mappingConfidence:Object.freeze({HIGH:126,MEDIUM:138,LOW:94}),fullyDigitizedForceCurvePointObservations:0,sourceScope:"1976 NHTSA/Calspan passenger-tire program",defaultRacingApplicability:"MECHANISM_ONLY"});
const STRICT=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
function strictNumber(raw){const value=String(raw??"").trim();if(!STRICT.test(value))return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function normalizeCondition(raw={},digits=4){const round=n=>n===null?null:Number(n.toFixed(digits)),speed=strictNumber(raw.road_speed_mph_raw),water=strictNumber(raw.water_depth_mil_raw),pressure=strictNumber(raw.cold_infl_psi_raw),load=strictNumber(raw.design_load_lb_raw);return {raw:{...raw},normalized:{roadSpeedMph:speed,roadSpeedKph:round(speed===null?null:speed*1.609344),waterDepthMil:water,waterDepthMm:round(water===null?null:water*.0254),coldInflationPsi:pressure,coldInflationKpa:round(pressure===null?null:pressure*6.8947572932),designLoadLb:load,designLoadN:round(load===null?null:load*4.4482216153)},rule:"strict numeric token only; malformed OCR stays raw"};}
function observation(record={}){const digitized=Number(record.digitized_curve_point_count||0);return {...record,observationKind:"MEASUREMENT_PAGE_LOCATOR",digitizedCurvePointCount:Number.isFinite(digitized)?digitized:0,productionEligible:false,productionBlockers:["source PDF/plot digitization required","racing-family applicability review required","controlled regression certification required"]};}
function summary(){return {...CORPUS,measurementPageTypes:{...CORPUS.measurementPageTypes},mappingConfidence:{...CORPUS.mappingConfidence},evidenceBoundary:"The counts describe indexed records and page locators, not digitized force curves or production coefficients."};}
const api={CORPUS,strictNumber,normalizeCondition,observation,summary};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.ACLMCalspan=api;
})(typeof window!=="undefined"?window:globalThis);
