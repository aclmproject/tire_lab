"use strict";
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 root.ACLMThermalV2=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)));
 const finite=(x,fallback)=>Number.isFinite(Number(x))?Number(x):fallback;
 const round=(x,d=6)=>Number(Number(x).toFixed(d));
 const RAYS=Object.freeze({lateral:2,longitudinal:4,maxAngle:60,disableDoubling:0,smoothLoadSensitivity:1,camberTemperatureSpread:1.6});
 const SOURCES=Object.freeze({
  schema:"CSP Cars – Tyre Thermal Models (V1/V2), revised 2026-06-06",
  rays:"CSP Cars – Tyre Physics extended-ray schema; ACLM uses 2 lateral and 4 longitudinal rays per side as a bounded V2 thermal-distribution compromise",
  geometry:"ACLM annular elliptical-section geometry reconstruction",
  pathways:"ACLM evidence-marked heat-pathway reconstruction prior; telemetry calibration required"
 });

 function suffix(index){return Number(index)===0?"":"_"+Math.max(0,Math.trunc(Number(index)||0));}
 function sections(axle,index){const side=String(axle).toLowerCase()==="front"?"FRONT":"REAR",s=suffix(index);return {tire:side+s,legacy:"THERMAL_"+side+s,v2:"THERMAL2_"+side+s};}
 function compoundFactors(kind){
  const key=String(kind||"race").toLowerCase();
  if(key==="soft"||key==="qualifying")return {friction:1.12,rolling:1.08,grain:.50,blister:.50};
  if(key==="hard"||key==="endurance")return {friction:.93,rolling:.94,grain:.28,blister:.28};
  if(key==="intermediate")return {friction:1.02,rolling:1.12,grain:.30,blister:.22};
  if(key==="wet"||key==="rain")return {friction:.91,rolling:1.18,grain:.18,blister:.12};
  return {friction:1,rolling:1,grain:.35,blister:.35};
 }
 function constructionFactors(type){
  const c=String(type||"unknown").toLowerCase();
  if(c.includes("bias")||c.includes("cross"))return {key:"bias",carcassFlex:1.18,conductance:.88,mass:1.08};
  if(c.includes("radial"))return {key:"radial",carcassFlex:.88,conductance:1.12,mass:.94};
  return {key:"mixed/unknown",carcassFlex:1,conductance:1,mass:1};
 }
 function materialFactors(material,belt){
  const text=(String(material||"")+" "+String(belt||"")).toLowerCase();
  if(/steel/.test(text))return {key:"steel reinforced",flex:.94,conductance:1.10,mass:1.07};
  if(/aramid|kevlar/.test(text))return {key:"aramid reinforced",flex:.96,conductance:.96,mass:.96};
  if(/nylon/.test(text))return {key:"nylon",flex:1.05,conductance:.94,mass:.98};
  if(/rayon/.test(text))return {key:"rayon",flex:1.02,conductance:.98,mass:1.01};
  return {key:"unspecified material prior",flex:1,conductance:1,mass:1};
 }
 function estimatePhysical(input){
  const width=clamp(finite(input.width,.20),.06,.50),radius=clamp(finite(input.radius,.32),.12,.55),rimRadius=clamp(finite(input.rimRadius,.20),.08,radius-.015);
  const sectionHeight=Math.max(.015,radius-rimRadius),majorRadius=(radius+rimRadius)/2;
  const radialA=sectionHeight*.78,lateralB=width*.44;
  const internalVolume=2*Math.PI*Math.PI*majorRadius*radialA*lateralB;
  const sectionPerimeter=Math.PI*(3*(radialA+lateralB)-Math.sqrt(Math.max(0,(3*radialA+lateralB)*(radialA+3*lateralB))));
  const casingArea=2*Math.PI*majorRadius*sectionPerimeter;
  const construction=constructionFactors(input.construction),material=materialFactors(input.carcassMaterial,input.beltConstruction);
  const treaded=!!input.treaded,treadDepth=treaded?clamp(finite(input.treadDepth,.006),.002,.012):.0045;
  const casingThickness=(construction.key==="bias"?.0064:construction.key==="radial"?.0052:.0058);
  const treadVolume=2*Math.PI*radius*width*treadDepth*(treaded?.62:.86);
  const materialVolume=casingArea*casingThickness*.72+treadVolume;
  const estimatedMass=clamp(materialVolume*1120*construction.mass*material.mass,2.2,35);
  const angularInertia=estimatedMass*(radius*radius+rimRadius*rimRadius)/2;
  return {width,radius,rimRadius,sectionHeight,internalVolume,casingArea,treadDepth,treadVolume,materialVolume,estimatedMass,angularInertia,construction:construction.key,material:material.key};
 }
 function calculate(input){
  const p=estimatePhysical(input),baseConstruction=constructionFactors(input.construction),material=materialFactors(input.carcassMaterial,input.beltConstruction),cf={...baseConstruction,carcassFlex:baseConstruction.carcassFlex*material.flex,conductance:baseConstruction.conductance*material.conductance},compound=compoundFactors(input.compound);
  const rate=clamp(finite(input.rate,85000),18000,600000),fz0=clamp(finite(input.fz0,2500),300,25000),expectedLoad=clamp(finite(input.expectedLoad,fz0),200,30000);
  const loadRatio=clamp(expectedLoad/fz0,.45,2.2),loadDensity=clamp(expectedLoad/(p.width*1000),3,90),rateDensity=clamp(rate/(p.width*1000),80,2200);
  const rr0=clamp(finite(input.rollingResistance0,12),4,35),rr1=clamp(finite(input.rollingResistance1,.00075),0,.01),sidewall=clamp(finite(input.sidewallStiffness,1),.35,2.5);
  const driven=clamp(finite(input.drivenDuty,.5),0,1),brake=clamp(finite(input.brakeExposure,.5),.08,.92),speed=clamp(finite(input.speedKph,180),60,360),pressure=clamp(finite(input.pressurePsi,24),8,55);
  const era=clamp(finite(input.era,1985),1900,2035),confidence=clamp(finite(input.confidence,.5),0,1);
  const volumeScale=clamp(p.internalVolume/.025,.35,2.5),areaScale=clamp(p.casingArea/.65,.35,2.5),sectionScale=clamp(p.sectionHeight/.09,.35,2.2);
  const flexWork=clamp((rr0/12)*cf.carcassFlex*(.72+.28*loadRatio)*(1+.10*driven),.45,2.2);
  const surfaceWork=clamp(compound.friction*(.78+.22*loadRatio)*(1+.08*driven)*(1+.0025*(loadDensity-20)),.55,1.8);
  const convectionDemand=clamp((speed/180)*areaScale/Math.sqrt(volumeScale),.45,2.2);
  const coupledCooling=clamp(.34*convectionDemand*(input.treaded?1.10:1),.16,.75);
  const coolFactor=clamp(6.8+1.4*(speed/180-1)+.45*(areaScale-1),4.5,10.5);
  const surfaceToAmbient=coupledCooling/coolFactor;
  const conductance=cf.conductance*clamp((p.casingArea/Math.max(p.materialVolume||.01,.004))*.008,.65,1.45);
  const legacy={
   surfaceTransfer:clamp(.88+.10*conductance+.05*(input.treaded?1:0)-.035*(loadRatio-1),.72,1.12),
   patchTransfer:clamp(.00145+.00055*(RAYS.lateral/2)+.00030*(p.width/.20-1),.0010,.0034),
   coreTransfer:0,internalCoreTransfer:0,rollingK:0,
   frictionK:clamp(.0124*surfaceWork,.0065,.028),coolFactor,
   surfaceRollingK:clamp(.00115*compound.rolling*flexWork*(1+.12*driven),.00055,.0045),
   grainGamma:1,grainGain:compound.grain,blisterGamma:1,blisterGain:compound.blister
  };
  const v2={
   carcassRollingK:clamp(.145*flexWork*(.92+.08*rateDensity/450),.055,.36),
   brakeToCore:clamp(.00010+.00048*brake*(.75+.25/volumeScale),.00005,.00062),
   surfaceToAmbient:clamp(surfaceToAmbient,.018,.12),
   surfaceToCarcass:clamp(.026*conductance*(1+.12/sectionScale),.012,.052),
   carcassToSurface:clamp(.42*conductance/(.82+.18*volumeScale),.20,.70),
   carcassToCore:clamp(.014*areaScale/volumeScale*(.90+.10*pressure/24),.004,.035),
   coreToCarcass:clamp(.00085*volumeScale/areaScale*(1+.12*(pressure/24-1)),.00025,.0025),
   coreToAmbient:clamp(.0026*(p.rimRadius/.20)*areaScale/volumeScale,.0008,.0075)
  };
  const formulas={
   estimates:"elliptical torus internal volume; casing area × construction thickness + tread volume; 1120 kg/m³ material prior",
   surfaceHeat:"FRICTION_K from compound, load ratio/density and driven duty; PERFORMANCE_CURVE is not used as a heat source",
   rollingHeat:"SURFACE_ROLLING_K and CARCASS_ROLLING_K from rolling resistance, construction flex, load and driven duty",
   cooling:"COOL_FACTOR × SURFACE_TO_AMBIENT is solved as one speed/area/volume-coupled pathway",
   conduction:"bidirectional surface/carcass/core paths from geometry, construction, volume, pressure and area",
   brake:"BRAKE_TO_CORE from imported/derived axle brake exposure and internal volume",
   evidence:"coefficients are reconstruction priors; confidence affects reporting only, never secretly scales physics"
  };
  return {schema:"ACLM CSP Thermal V2 calibration 1.0",inputs:{...input,rate,fz0,expectedLoad,loadRatio,loadDensity,rateDensity,rr0,rr1,sidewall,driven,brake,speed,pressure,era,confidence},estimates:p,legacy,v2,rays:{...RAYS},formulas,sources:{...SOURCES}};
 }
 function renderLegacy(result,compound,axle,index,curve){
  const s=sections(axle,index).legacy,t=result.legacy;
  return `[${s}]\nSURFACE_TRANSFER=${t.surfaceTransfer.toFixed(6)}\nPATCH_TRANSFER=${t.patchTransfer.toFixed(6)}\nCORE_TRANSFER=0\nINTERNAL_CORE_TRANSFER=0\nFRICTION_K=${t.frictionK.toFixed(6)}\nROLLING_K=0\nPERFORMANCE_CURVE=${curve}\nGRAIN_GAMMA=${t.grainGamma.toFixed(3)}\nGRAIN_GAIN=${t.grainGain.toFixed(3)}\nBLISTER_GAMMA=${t.blisterGamma.toFixed(3)}\nBLISTER_GAIN=${t.blisterGain.toFixed(3)}\nCOOL_FACTOR=${t.coolFactor.toFixed(4)}\nSURFACE_ROLLING_K=${t.surfaceRollingK.toFixed(6)}\n`;
 }
 function renderV2(result,axle,index){
  const s=sections(axle,index).v2,t=result.v2;
  return `[${s}]\nCARCASS_ROLLING_K=${t.carcassRollingK.toFixed(6)}\nBRAKE_TO_CORE=${t.brakeToCore.toFixed(7)}\nSURFACE_TO_AMBIENT=${t.surfaceToAmbient.toFixed(6)}\nSURFACE_TO_CARCASS=${t.surfaceToCarcass.toFixed(6)}\nCARCASS_TO_SURFACE=${t.carcassToSurface.toFixed(6)}\nCARCASS_TO_CORE=${t.carcassToCore.toFixed(6)}\nCORE_TO_CARCASS=${t.coreToCarcass.toFixed(7)}\nCORE_TO_AMBIENT=${t.coreToAmbient.toFixed(7)}\n`;
 }
 function updateCarIni(text){
  const original=String(text??""),nl=original.includes("\r\n")?"\r\n":"\n";
  const header=/^\s*\[HEADER\]\s*$/im.exec(original);
  if(!header)return `[HEADER]${nl}VERSION=extended-2${nl}${nl}`+original;
  const start=header.index+header[0].length,next=/^\s*\[[^\]]+\]\s*$/gm;next.lastIndex=start;const found=next.exec(original),end=found?found.index:original.length;
  const block=original.slice(start,end),version=/(^\s*VERSION\s*=\s*)([^;\r\n]*?)([ \t]*(?:;[^\r\n]*)?$)/im;
  if(version.test(block))return original.slice(0,start)+block.replace(version,"$1extended-2$3")+original.slice(end);
  return original.slice(0,start)+nl+"VERSION=extended-2"+block+original.slice(end);
 }
 function validateCarIni(text){const m=String(text||"").match(/(?:^|\n)\s*\[HEADER\][\s\S]*?(?=\n\s*\[|$)/i),v=m&&m[0].match(/(?:^|\n)\s*VERSION\s*=\s*([^;\r\n]+)/i);return {available:!!text,pass:!!v&&v[1].trim().toLowerCase()==="extended-2",version:v?v[1].trim():null};}
 function parseSections(text){const out={},names=[];let current=null;for(const raw of String(text||"").split(/\r?\n/)){const m=raw.match(/^\s*\[([^\]]+)\]/);if(m){current=m[1].trim();names.push(current);out[current]=out[current]||{};continue;}if(current&&raw.includes("=")&&!raw.trim().startsWith(";")){const i=raw.indexOf("=");out[current][raw.slice(0,i).trim()]=raw.slice(i+1).split(";")[0].trim();}}return {sections:out,names};}
 function lutErrors(name,text){const errors=[];if(typeof text!=="string")return [name+": missing LUT"];
  const rows=text.split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith(";")),xs=[];for(const row of rows){const p=row.split("|");if(p.length!==2||!Number.isFinite(Number(p[0]))||!Number.isFinite(Number(p[1])))errors.push(name+": malformed LUT row");else xs.push(Number(p[0]));}for(let i=1;i<xs.length;i++)if(xs[i]<=xs[i-1])errors.push(name+": non-increasing LUT X axis");if(xs.length<2)errors.push(name+": insufficient LUT rows");return errors;}
 function inspectPackage(ini,files,compoundCount,csp=true){const errors=[],parsed=parseSections(ini),sec=parsed.sections,count=Math.max(1,Math.trunc(compoundCount||1));
  if(sec.HEADER?.VERSION!=="10")errors.push("HEADER VERSION must be 10");if(new Set(parsed.names).size!==parsed.names.length)errors.push("duplicate INI sections");
  if(csp&&sec.THERMAL_MODEL?.VERSION!=="2")errors.push("THERMAL_MODEL VERSION must be 2");if(!csp&&(sec.THERMAL_MODEL||parsed.names.some(x=>/^THERMAL2_/.test(x))))errors.push("vanilla output contains CSP Thermal V2 sections");
  for(let i=0;i<count;i++)for(const axle of ["front","rear"]){const names=sections(axle,i),legacy=sec[names.legacy];if(!legacy)errors.push("missing "+names.legacy);else{for(const key of ["CORE_TRANSFER","INTERNAL_CORE_TRANSFER","ROLLING_K"])if(csp&&Number(legacy[key])!==0)errors.push(names.legacy+" obsolete "+key+" is nonzero");const lut=legacy.PERFORMANCE_CURVE;if(!lut||!(lut in files))errors.push(names.legacy+" missing performance LUT");else errors.push(...lutErrors(lut,files[lut]));}if(csp){const t=sec[names.v2];if(!t)errors.push("missing "+names.v2);else for(const key of ["CARCASS_ROLLING_K","BRAKE_TO_CORE","SURFACE_TO_AMBIENT","SURFACE_TO_CARCASS","CARCASS_TO_SURFACE","CARCASS_TO_CORE","CORE_TO_CARCASS","CORE_TO_AMBIENT"])if(!Number.isFinite(Number(t[key])))errors.push(names.v2+" missing/invalid "+key);}}
  return {pass:errors.length===0,errors,sections:sec};
 }
 return Object.freeze({RAYS,SOURCES,suffix,sections,estimatePhysical,calculate,renderLegacy,renderV2,updateCarIni,validateCarIni,parseSections,lutErrors,inspectPackage,round});
});
