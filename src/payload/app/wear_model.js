(function(root){
"use strict";
function finite(x){const n=Number(x);return Number.isFinite(n)?n:NaN;}
function points(input){return (Array.isArray(input)?input:String(input||"").trim().split(/\r?\n/).filter(Boolean).map(x=>x.split("|").map(Number))).map(p=>[finite(p[0]),finite(p[1])]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])).sort((a,b)=>a[0]-b[0]);}
function crossingAtGrip(input,target){
 const pts=points(input),t=finite(target),segments=[];
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if((a[1]-t)*(b[1]-t)<=0&&a[1]!==b[1]){const u=(t-a[1])/(b[1]-a[1]);if(u>=0&&u<=1)segments.push(a[0]+u*(b[0]-a[0]));}}
 const plateau=pts.filter(p=>p[1]===t).map(p=>p[0]);
 if(plateau.length)return {status:plateau.length>1?"AMBIGUOUS_PLATEAU_RANGE":"EXACT_POINT",x:plateau[0],range:[Math.min(...plateau),Math.max(...plateau)]};
 if(!segments.length)return {status:"NOT_REACHED",x:NaN,range:null};
 return {status:segments.length>1?"AMBIGUOUS_MULTIPLE_CROSSINGS":"INTERPOLATED",x:segments[0],range:segments.length>1?[Math.min(...segments),Math.max(...segments)]:null};
}
function landmarks(input,targets=[100,99.5,99,98,97,95,90,80]){const pts=points(input);if(!pts.length)return [];const peak=Math.max(...pts.map(p=>p[1])),leading=pts.filter((p,i)=>p[1]===peak&&pts.slice(0,i+1).every(q=>q[1]===peak)),terminal=pts[pts.length-1];return [{landmark:"PLATEAU_END",grip:peak,status:leading.length?"EXACT_POINT":"NOT_REACHED",x:leading.length?leading[leading.length-1][0]:NaN,range:null},...targets.map(grip=>({landmark:`GRIP_${String(grip).replace(".","_")}_PERCENT`,grip,...crossingAtGrip(pts,grip)})),{landmark:"TERMINAL_OR_FAILURE",grip:terminal[1],status:"EXACT_POINT",x:terminal[0],range:null}];}
function migrateLife(item={},context={}){
 const life=finite(item.lifeKm),basis=String(item.lifeBasis||""),lower=basis.toLowerCase(),range=String(item.lifeRangeKm||"").split(/[;,]/).map(Number).filter(Number.isFinite);
 const out={observedStintKm:null,competitiveLifeKm:null,serviceLifeKm:null,abrasionLifeKm:null,lifeRangeKm:range.length?range:null,lifeDefinition:"UNRESOLVED_LEGACY_PRIOR",lifeConfidence:Number.isFinite(finite(item.lifeConfidence))?finite(item.lifeConfidence):null,lifeBasis:basis||"legacy class-menu prior without an explicit life definition",sourceRefs:[...(item.sourceRefs||context.sourceRefs||[])]};
 if(Number.isFinite(life)){
  if(/abrasion|tread|service|durability/.test(lower)){out.abrasionLifeKm=life;out.serviceLifeKm=/service|durability/.test(lower)?life:null;out.lifeDefinition="PHYSICAL_ABRASION_OR_SERVICE_EVIDENCE";}
  else if(/stint|all-race|completed|observed/.test(lower)){out.observedStintKm=life;out.lifeDefinition="OBSERVED_STINT_OR_SERVICE_DISTANCE";}
  else if(/competitive|grip life|performance/.test(lower)){out.competitiveLifeKm=life;out.lifeDefinition="COMPETITIVE_PERFORMANCE_LIFE";}
  else if(/\bprior\b|reconstructed/.test(lower)){out.lifeDefinition="PROVISIONAL_GENERATOR_PRIOR";out.lifeRangeKm=out.lifeRangeKm||[life];}
  else{out.lifeDefinition="LEGACY_UNCLASSIFIED_PRIOR";out.lifeRangeKm=out.lifeRangeKm||[life];}
 }
 return out;
}
function referenceDutyFramework(options={}){
 return {schema:"ACLM reference-duty wear translation 1.0",status:"CALIBRATABLE_ARCHITECTURE_NOT_HISTORICALLY_FITTED",historicalTarget:options.historicalTarget||null,acImplementation:{virtualKm:"load/stress-sensitive AC exposure coordinate",useLoad:1,wearCurve:"maps AC virtual exposure to AC grip-health; not physical tread depth"},exposureIntegrand:"contact pressure × local slip velocity/work",candidateInputs:["normalized contact pressure/load","slip velocity","slip ratio","slip angle","driven/non-driven axle","temperature","construction","compound","tire geometry","speed/duty"],separation:["PHYSICAL_ABRASION","COMPETITIVE_GRIP_DEGRADATION","AC_WEAR_GRIP_HEALTH_SIGNAL"],coefficients:"not fitted; telemetry and source-specific calibration required",incidentPolicy:"incident/abuse runs demonstrate stress sensitivity but are excluded from clean stint-life fitting"};
}
const api={points,crossingAtGrip,landmarks,migrateLife,referenceDutyFramework};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.ACLMWearModel=api;
})(typeof window!=="undefined"?window:globalThis);
