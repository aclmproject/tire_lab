(function(root){
"use strict";
const ATM_PSI=14.6959;

function solveColdPsi(idealHotPsi,targetHotC,referenceColdC,atmPsi=ATM_PSI){
  idealHotPsi=Number(idealHotPsi);
  targetHotC=Number(targetHotC);
  referenceColdC=Number(referenceColdC);
  if(!Number.isFinite(idealHotPsi)||!Number.isFinite(targetHotC)||!Number.isFinite(referenceColdC)) return NaN;
  const th=targetHotC+273.15, tc=referenceColdC+273.15;
  if(th<=0||tc<=0) return NaN;
  return (idealHotPsi+atmPsi)*(tc/th)-atmPsi;
}
function predictHotPsi(coldGaugePsi,hotC,referenceColdC,atmPsi=ATM_PSI){
  coldGaugePsi=Number(coldGaugePsi);
  hotC=Number(hotC);
  referenceColdC=Number(referenceColdC);
  if(!Number.isFinite(coldGaugePsi)||!Number.isFinite(hotC)||!Number.isFinite(referenceColdC)) return NaN;
  const th=hotC+273.15, tc=referenceColdC+273.15;
  if(th<=0||tc<=0) return NaN;
  return (coldGaugePsi+atmPsi)*(th/tc)-atmPsi;
}
function classifyClosure(errorPsi){
  const e=Math.abs(Number(errorPsi));
  if(!Number.isFinite(e)) return "UNRESOLVED";
  if(e<=0.5) return "GOOD";
  if(e<=1.5) return "REVIEW";
  return "FAIL / pressure model mismatch";
}
function pressureReport(options={}){
  const staticPsi=Number(options.staticPsi),idealPsi=Number(options.idealPsi),referenceColdC=Number(options.referenceColdC),targetHotC=Number(options.targetHotC);
  const predictedHotPsiValue=predictHotPsi(staticPsi,targetHotC,referenceColdC),predictedRisePsi=predictedHotPsiValue-staticPsi,errorPsi=predictedHotPsiValue-idealPsi;
  return {
    generatedPressureStaticPsi:staticPsi,
    generatedPressureIdealPsi:idealPsi,
    referenceColdTemperatureC:referenceColdC,
    referenceStabilizedTemperatureC:targetHotC,
    predictedHotPressureRisePsi:predictedRisePsi,
    predictedStabilizedHotPressurePsi:predictedHotPsiValue,
    predictedHotPressureErrorPsi:errorPsi,
    closureClassification:classifyClosure(errorPsi),
    referenceDuty:options.referenceDuty||null,
    inputs:options.inputs||null,
    modelScope:"constant-volume ideal-gas first-order pressure prediction",
    modeledFactors:["starting pressure","starting temperature","reference stabilized internal temperature"],
    pendingCalibrationFactors:["internal air volume and dimensional growth","vehicle and axle load","rolling/flex heating","construction and carcass compliance","track duty","compound","measured surface/carcass/core transfer"],
    decision:"diagnostic prediction only; do not force every track to the same hot pressure"
  };
}
function optimalTempFromLutText(text){
  const pts=String(text||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const p=line.split("|"); return [Number(p[0]),Number(p[1])];
  }).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
  if(!pts.length) return NaN;
  const max=Math.max(...pts.map(p=>p[1]));
  const peak=pts.filter(p=>Math.abs(p[1]-max)<1e-9).map(p=>p[0]);
  return (Math.min(...peak)+Math.max(...peak))/2;
}
const api={ATM_PSI,solveColdPsi,predictHotPsi,classifyClosure,pressureReport,optimalTempFromLutText};
if(typeof module!=="undefined"&&module.exports) module.exports=api;
root.ACLMPressure=api;
})(typeof window!=="undefined"?window:globalThis);
