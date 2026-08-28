"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const thermal=require("../src/payload/app/thermal_v2.js");
const LUT="0|0.75\n60|1.00\n100|0.92\n";
const brm={vehicleMass:520,frontWeight:44,construction:"bias",era:1960,compound:"race",speedKph:205,confidence:.72,rollingResistance0:12,rollingResistance1:.0008,idealHotPressurePsi:27,optimumTemperatureC:72};
const front={...brm,axle:"front",width:.096,radius:.304,rimRadius:.2032,rate:53760,sidewallStiffness:1,fz0:1007,expectedLoad:1122,drivenDuty:0,brakeExposure:.58,pressurePsi:20.2};
const rear={...brm,axle:"rear",width:.124,radius:.288,rimRadius:.1778,rate:69440,sidewallStiffness:1,fz0:1285,expectedLoad:1428,drivenDuty:1,brakeExposure:.42,pressurePsi:20.2};

function fixture(inputs){
 let ini="[HEADER]\nVERSION=10\n\n[THERMAL_MODEL]\nVERSION=2\n\n[_EXTENSION]\nLATERAL_RAYS=2\nLONGITUDINAL_RAYS=4\nMAX_RAY_ANGLE=60\nDISABLE_RAY_DOUBLING=0\nSMOOTH_LOAD_SENS=1\n\n";
 const files={};inputs.forEach((pair,i)=>{for(const [axle,input] of Object.entries(pair)){const r=thermal.calculate(input),lut=`curve_${i}.lut`;ini+=thermal.renderLegacy(r,input.compound,axle,i,lut)+"\n"+thermal.renderV2(r,axle,i)+"\n";files[lut]=LUT;}});return {ini,files};
}

test("1960 BRM CSP V2 fixture has real V2 architecture and zero obsolete controls",()=>{
 const pack=fixture([{front,rear}]),audit=thermal.inspectPackage(pack.ini,pack.files,1,true);assert.equal(audit.pass,true,audit.errors.join("; "));
 assert.equal(audit.sections.THERMAL_MODEL.VERSION,"2");assert.ok(audit.sections.THERMAL2_FRONT);assert.ok(audit.sections.THERMAL2_REAR);
 for(const s of [audit.sections.THERMAL_FRONT,audit.sections.THERMAL_REAR])for(const k of ["CORE_TRANSFER","INTERNAL_CORE_TRANSFER","ROLLING_K"])assert.equal(s[k],"0");
});

test("multi-compound V2 sections use AC/CSP numeric suffix convention",()=>{
 const pairs=[{front,rear},{front:{...front,compound:"hard"},rear:{...rear,compound:"hard"}},{front:{...front,compound:"wet",treaded:true},rear:{...rear,compound:"wet",treaded:true}}];
 const pack=fixture(pairs),audit=thermal.inspectPackage(pack.ini,pack.files,3,true);assert.equal(audit.pass,true,audit.errors.join("; "));
 for(const name of ["THERMAL_FRONT","THERMAL2_FRONT","THERMAL_REAR_1","THERMAL2_REAR_1","THERMAL_FRONT_2","THERMAL2_FRONT_2"])assert.ok(audit.sections[name],name);
});

test("missing and malformed LUTs are rejected",()=>{
 const pack=fixture([{front,rear}]);delete pack.files["curve_0.lut"];assert.equal(thermal.inspectPackage(pack.ini,pack.files,1,true).pass,false);
 pack.files["curve_0.lut"]="0|1\nnot-a-row\n";assert.match(thermal.inspectPackage(pack.ini,pack.files,1,true).errors.join(" "),/malformed/);
});

test("car.ini extended-2 edit preserves unrelated bytes and validates",()=>{
 const original="[HEADER]\r\nVERSION=1 ; keep comment\r\nPOWER_CURVE=abc\r\n\r\n[BASIC]\r\nTOTALMASS=520\r\nCUSTOM=do not touch\r\n";
 const updated=thermal.updateCarIni(original);assert.equal(updated,original.replace("VERSION=1","VERSION=extended-2"));assert.equal(thermal.validateCarIni(updated).pass,true);assert.equal(thermal.validateCarIni(original).pass,false);
});

test("physical inputs propagate and identical inputs remain deterministic",()=>{
 const f1=thermal.calculate(front),f2=thermal.calculate(front),r=thermal.calculate(rear);assert.deepEqual(f1,f2);
 assert.notEqual(f1.estimates.internalVolume,r.estimates.internalVolume);assert.notEqual(f1.estimates.estimatedMass,r.estimates.estimatedMass);
 assert.notEqual(f1.legacy.frictionK,r.legacy.frictionK);assert.notEqual(f1.v2.carcassRollingK,r.v2.carcassRollingK);assert.notEqual(f1.v2.brakeToCore,r.v2.brakeToCore);
});

test("cross-era families yield bounded, explainable coefficient changes",()=>{
 const cases=[
  {...front,construction:"bias",era:1960,width:.096,radius:.304,rimRadius:.2032,rate:53760,fz0:1007,expectedLoad:1122,speedKph:205},
  {...front,construction:"bias",era:1978,width:.270,radius:.325,rimRadius:.1651,rate:115000,fz0:2400,expectedLoad:2600,speedKph:255},
  {...front,construction:"radial",era:1988,width:.230,radius:.310,rimRadius:.1905,rate:145000,fz0:3300,expectedLoad:3500,speedKph:205},
  {...front,construction:"radial",era:1992,width:.300,radius:.340,rimRadius:.2286,rate:190000,fz0:4000,expectedLoad:4300,speedKph:275},
  {...front,construction:"radial",era:1996,width:.330,radius:.350,rimRadius:.2286,rate:215000,fz0:4700,expectedLoad:5100,speedKph:285,drivenDuty:1}
 ];
 const results=cases.map(thermal.calculate),unique=new Set(results.map(x=>JSON.stringify(x.v2)));assert.equal(unique.size,cases.length);
 for(const x of results){assert.ok(x.legacy.frictionK>=.0065&&x.legacy.frictionK<=.028);assert.ok(x.v2.carcassRollingK>=.055&&x.v2.carcassRollingK<=.36);assert.ok(x.v2.surfaceToAmbient>=.018&&x.v2.surfaceToAmbient<=.12);}
});

test("vanilla audit rejects accidental V2 while retaining Kunos thermal sections",()=>{
 const result=thermal.calculate(front),files={"curve.lut":LUT},ini="[HEADER]\nVERSION=10\n\n"+thermal.renderLegacy(result,"race","front",0,"curve.lut")+"\n"+thermal.renderLegacy(result,"race","rear",0,"curve.lut");
 assert.equal(thermal.inspectPackage(ini,files,1,false).pass,true);
 assert.equal(thermal.inspectPackage(ini+"\n[THERMAL_MODEL]\nVERSION=2\n",files,1,false).pass,false);
});

test("tracked project sources contain no personal absolute path",()=>{
 const roots=["src","tests"],bad=[];for(const root of roots){for(const file of walk(path.join(__dirname,"..",root))){if(!/\.(js|mjs|html|ps1|cmd|md|txt|json|yml)$/i.test(file))continue;const text=fs.readFileSync(file,"utf8");if(/C:\\Users\\|\/home\/[^/]+\//i.test(text))bad.push(path.relative(path.join(__dirname,".."),file));}}assert.deepEqual(bad,[]);
});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
