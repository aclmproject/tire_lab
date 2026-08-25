"use strict";
const $ = id => document.getElementById(id);
const n = id => Number($(id).value);
const v = id => $(id).value.trim();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let generatedFiles={};
let importedPressureReference={};
let importedTireReference={};

const BASE_LAT=[1.98,1.88317305,1.7833464,1.68138135,1.5781392,1.47448125,1.3712688,1.26936315,1.1696256,1.07291745,0.9801,0.89203455,0.8095824,0.73360485,0.6649632,0.60451875];
const BASE_LON=[1.9404,1.846916379,1.753112592,1.659541653,1.566756576,1.475310375,1.385756064,1.298646657,1.214535168,1.133974611,1.057518,0.985718349,0.919128672,0.858301983,0.803791296,0.756149625];

let activeHistoricalContext=null;

function activeFamilyPrior(){
 return activeHistoricalContext?.familyId?window.ACLMHistoricalCategories?.priorForFamily?.(activeHistoricalContext.familyId):null;
}
function priorCompoundValue(comp,axis){
 const p=activeFamilyPrior();if(!p)return null;
 const base=axis==="lat"?Number(p.gripLat):Number(p.gripLong);
 if(!Number.isFinite(base))return null;
 const ref=axis==="lat"?compDefs.medium.dy:compDefs.medium.dx;
 const current=axis==="lat"?compDefs[comp].dy:compDefs[comp].dx;
 // Preserve the compound hierarchy while moving the whole tire into the historical family.
 return base*(current/ref);
}
function dryCompound(comp){return comp!=="wet"&&comp!=="intermediate";}


const GENERAL_UNKNOWN="General / unknown";
const TYRE_SUPPLIERS=[
 "Dunlop","Michelin","Goodyear","Pirelli","Bridgestone","Yokohama","Firestone","Avon",
 "BFGoodrich","Continental","Toyo","Falken","Hoosier","Hankook","Kumho","Englebert",
 "Englebert-Colombes","Uniroyal","Cooper","Maxxis","Nitto","General Tire","CEAT","Vredestein"
];
function runtimeClasses(){return window.ACLMHistoricalCategories?.CLASSES||[];}
function runtimeFamilies(){return window.ACLMHistoricalCategories?.FAMILIES||[];}
function appendMenuOption(parent,value,label=value){
 const opt=document.createElement("option");opt.value=String(value);opt.textContent=String(label);parent.appendChild(opt);return opt;
}
function ensureSelectOption(select,value,label=value,groupLabel="Current / researched"){
 const val=String(value??"").trim();if(!select||!val)return null;
 let opt=[...select.options].find(o=>o.value===val);
 if(!opt){
   let group=Array.from(select.children||[]).find(x=>String(x.tagName||"").toUpperCase()==="OPTGROUP"&&x.label===groupLabel);
   if(!group){group=document.createElement("optgroup");group.label=groupLabel;select.appendChild(group);}
   opt=appendMenuOption(group,val,label);
 }
 select.value=val;return opt;
}
function setMenuValue(id,value,label=value,groupLabel="Current / researched"){
 const el=$(id);if(!el)return false;
 if(String(el.tagName||"").toUpperCase()==="SELECT")ensureSelectOption(el,value,label,groupLabel);
 else el.value=String(value);
 return true;
}
function populateSeriesClassOptions(){
 const sel=$("series");if(!sel)return;
 const previous=sel.value||GENERAL_UNKNOWN,presetId=$("preset")?.value||"auto";
 const familyFilter=/^FAM\d+$/i.test(presetId)?presetId:null;
 const allClasses=runtimeClasses().slice();
 const shown=allClasses.filter(c=>!familyFilter||c.familyId===familyFilter)
   .sort((a,b)=>a.from-b.from||a.name.localeCompare(b.name));
 const families=runtimeFamilies().slice().sort((a,b)=>a.from-b.from||a.name.localeCompare(b.name));
 sel.innerHTML="";
 appendMenuOption(sel,GENERAL_UNKNOWN,"General / Unknown");
 for(const family of families){
   const classes=shown.filter(c=>c.familyId===family.id);if(!classes.length)continue;
   const group=document.createElement("optgroup");
   group.label=family.id+" — "+family.name+" ("+family.from+"–"+family.to+")";
   for(const c of classes)appendMenuOption(group,c.name,c.id+" — "+c.name+" ("+c.from+"–"+c.to+")");
   sel.appendChild(group);
 }
 const previousClass=allClasses.find(c=>c.name===previous);
 if(/unknown/i.test(previous))sel.value=GENERAL_UNKNOWN;
 else if(previousClass&&familyFilter&&previousClass.familyId!==familyFilter)sel.value=GENERAL_UNKNOWN;
 else ensureSelectOption(sel,previous,previous,previousClass?"Calibrated class":"Current / researched");
 if(!sel.value)sel.value=GENERAL_UNKNOWN;
}
function populateSupplierOptions(){
 const sel=$("supplier");if(!sel)return;
 const previous=sel.value||GENERAL_UNKNOWN;
 sel.innerHTML="";
 appendMenuOption(sel,GENERAL_UNKNOWN,"General / Unknown");
 for(const supplier of TYRE_SUPPLIERS)appendMenuOption(sel,supplier,supplier);
 if(/unknown/i.test(previous))sel.value=GENERAL_UNKNOWN;
 else ensureSelectOption(sel,previous,previous,"Current / researched");
 if(!sel.value)sel.value=GENERAL_UNKNOWN;
}
function clearMenuProvenance(id){
 const el=$(id);if(!el)return;
 el.classList.remove("imported-field","researched-field");
 delete el.dataset.researchSource;
 el.title="Manual selection";
}
function refreshMenuDrivenOutput(){
 updateOutputName();refreshSolvedPressures();renderTireGraphs();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
}
function applySeriesMenuSelection(){
 const selected=v("series"),preset=$("preset");
 if(!selected||/unknown/i.test(selected)){
   if(/^FAM\d+$/i.test(preset?.value||""))applyPreset(preset.value);
   else{activeHistoricalContext=null;updateHistoricalCompoundLabels();renderHistoricalFamilySummary("Series/class remains General / Unknown.");}
   return;
 }
 const cls=runtimeClasses().find(c=>c.name===selected);
 if(cls){
   const ctx=window.ACLMHistoricalCategories?.contextForClass?.(cls.id,v("year"));
   if(ctx){preset.value=ctx.familyId;applyHistoricalContext(ctx,"selected calibrated series/class");populateSeriesClassOptions();return;}
 }
 autoApplyHistoricalContext("selected researched series/class");
 populateSeriesClassOptions();
}

function populateHistoricalCategoryOptions(){
 const sel=$("preset"); if(!sel||!window.ACLMHistoricalCategories)return;
 // Keep Auto and Manual, then expose every family from the current knowledge release.
 [...sel.querySelectorAll("option[data-family]")].forEach(o=>o.remove());
 [...sel.querySelectorAll("optgroup")].forEach(g=>g.remove());
 const groups=new Map();
 window.ACLMHistoricalCategories.FAMILIES
  .slice().sort((a,b)=>a.from-b.from||a.name.localeCompare(b.name))
  .forEach(f=>{
    const decade=Math.floor(f.from/10)*10;
    let group=groups.get(decade);
    if(!group){group=document.createElement("optgroup");group.label=`${decade}s tire families`;groups.set(decade,group);sel.appendChild(group);}
    const o=document.createElement("option");o.value=f.id;o.dataset.family="1";o.textContent=`${f.id} — ${f.name} (${f.from}–${f.to})`;group.appendChild(o);
  });
}
function shortForHistoricalName(name,slot){
 const n=String(name||"");
 if(/\bqualifying\b/i.test(n))return "Q";
 if(/\bsprint\b/i.test(n))return "S";
 if(/\bendurance\b/i.test(n))return "E";
 const m=n.match(/\bDry\s+([ABC])\b/i);if(m)return m[1].toUpperCase();
 if(/\bcontrol\b/i.test(n))return "C";
 if(slot==="intermediate")return "I";
 if(slot==="wet")return "W";
 return slot==="soft"?"S":slot==="hard"?"E":"R";
}
function historicalSlot(comp){return activeHistoricalContext?.slots?.[comp]||null;}
function compoundDisplayName(comp){return historicalSlot(comp)?.name||compDefs?.[comp]?.name||comp;}
function compoundShortName(comp){const x=historicalSlot(comp);return x?shortForHistoricalName(x.name,comp):(compDefs?.[comp]?.short||comp.slice(0,1).toUpperCase());}
function historicalLifeKm(comp){const x=historicalSlot(comp);return x&&Number.isFinite(Number(x.lifeKm))?Number(x.lifeKm):null;}
function compoundTypeHint(comp){
 if(comp==="wet")return "RAIN";
 if(comp==="intermediate")return "RACING_TREADED";
 if(activeHistoricalContext?.dryType==="treaded")return "VINTAGE_PERFORMANCE";
 return "SLICK";
}
function updateHistoricalCompoundLabels(){
 const defaults={soft:"Qualifying / Sprint",medium:"Race",hard:"Endurance",intermediate:"Intermediate",wet:"Wet"};
 const ids={soft:"cSoftLabel",medium:"cMediumLabel",hard:"cHardLabel",intermediate:"cInterLabel",wet:"cWetLabel"};
 Object.entries(ids).forEach(([slot,id])=>{
   const x=historicalSlot(slot),el=$(id);if(!el)return;
   el.textContent=x?`${x.name}${Number.isFinite(Number(x.lifeKm))?` (~${Number(x.lifeKm)} km prior)`:""}`:defaults[slot];
   const input=$({soft:"cSoft",medium:"cMedium",hard:"cHard",intermediate:"cInter",wet:"cWet"}[slot]);
   if(input) input.parentElement?.classList.toggle("historical-unavailable",!!activeHistoricalContext&&!x);
 });
}
function renderHistoricalFamilySummary(extra=""){
 const el=$("historicalFamilySummary");if(!el)return;
 if(!activeHistoricalContext){
   el.innerHTML=`<b>Historical category:</b> unresolved. Research or choose a family. Tire Lab will preserve manual compound choices until a category is resolved.${extra?` ${escapeHtml(extra)}`:""}`;
   return;
 }
 const c=activeHistoricalContext;
 const menu=(c.menu||[]).map(x=>`${x.name}${x.lifeKm?` ~${x.lifeKm} km`:""}`).join(" · ");
 const construction=c.construction==="mixed"?"mixed/transition — review exact supplier/car":(c.construction==="bias"?"bias/cross-ply":"radial");
 const warns=(c.warnings||[]).length?`<br><span class="warning">${escapeHtml(c.warnings.join(" "))}</span>`:"";
 const k=window.ACLMHistoricalCategories?.knowledgeInfo?.()||{};
 const prior=window.ACLMHistoricalCategories?.priorForFamily?.(c.familyId);
 const physics=prior?`<br><b>Physics prior:</b> μy ${Number(prior.gripLat).toFixed(2)} · μx ${Number(prior.gripLong).toFixed(2)} · hot ${Number(prior.hotPsi).toFixed(1)} psi · relax ${Number(prior.relax).toFixed(3)} m`:"";
 el.innerHTML=`<b>${escapeHtml(c.familyId)} — ${escapeHtml(c.familyName)}</b>${c.classId?`<br>Class calibration: ${escapeHtml(c.classId)} — ${escapeHtml(c.className)}`:""}<br>Construction: ${escapeHtml(construction)} · dry architecture: ${escapeHtml(c.dryType)}<br><b>Period menu:</b> ${escapeHtml(menu||"No menu resolved")}${physics}<br><span class="muted">Knowledge v${escapeHtml(k.version||"?")} · ${escapeHtml(k.source||"fallback")}</span>${warns}${extra?`<br>${escapeHtml(extra)}`:""}`;
}
function applyHistoricalContext(ctx,source="historical category"){
 activeHistoricalContext=ctx||null;
 if(!ctx){updateHistoricalCompoundLabels();renderHistoricalFamilySummary();return false;}
 if(ctx.familyId && $("preset").value!=="manual") $("preset").value=ctx.familyId;
 if(ctx.construction && ctx.construction!=="mixed" && !fieldIsDirect("construction")){
   $("construction").value=ctx.construction;markResearched("construction",source);
 }
 const prior=window.ACLMHistoricalCategories?.priorForFamily?.(ctx.familyId);
 if(prior){
   // Geometry/mass from the imported car is preserved. Tire-family structure is regenerated.
   const fwMm=n("fw")*1000,rwMm=n("rw")*1000;
   if(Number.isFinite(Number(prior.ratePerWidth))){
     $("rateF").value=Math.round(Number(prior.ratePerWidth)*fwMm);
     $("rateR").value=Math.round(Number(prior.ratePerWidth)*rwMm);
     ["rateF","rateR"].forEach(id=>{ $(id).classList.add("researched-field"); $(id).title=`ACLM Knowledge ${ctx.familyId} structural prior`; });
   }
   if(Number.isFinite(Number(prior.hotPsi))){
     $("pIdeal").value=Number(prior.hotPsi).toFixed(1);
     $("pIdeal").classList.add("researched-field");$("pIdeal").title=`ACLM Knowledge ${ctx.familyId} hot-pressure prior`;
   }
 }
 const pairs={soft:"cSoft",medium:"cMedium",hard:"cHard",intermediate:"cInter",wet:"cWet"};
 for(const [slot,id] of Object.entries(pairs)) $(id).checked=!!ctx.slots?.[slot];
 // Never leave the generator with zero compounds if a sparse family record is encountered.
 if(!Object.values(pairs).some(id=>$(id).checked)) $("cMedium").checked=true;
 updateHistoricalCompoundLabels();
 renderHistoricalFamilySummary();
 if($("wearNote") && (String($("wearNote").value||"").includes("provisional until") || !String($("wearNote").value||"").trim())){
   const life=(ctx.menu||[]).filter(x=>x.lifeKm).map(x=>`${x.name} ${x.lifeKm} km`).join(", ");
   $("wearNote").value=life?`ACLM historical class-life prior: ${life}. Wear shape remains evidence-weighted and should be telemetry-certified for the specific car/track.`:"Historical family applied; wear remains evidence-weighted pending specific stint evidence.";
 }
 if(typeof refreshSolvedPressures==="function")refreshSolvedPressures();
 if(typeof renderTireGraphs==="function")renderTireGraphs();
 return true;
}
function autoApplyHistoricalContext(source="year + racing class"){
 if(!window.ACLMHistoricalCategories)return false;
 const ctx=window.ACLMHistoricalCategories.resolveContext(v("year"),v("series"));
 if(!ctx){activeHistoricalContext=null;updateHistoricalCompoundLabels();renderHistoricalFamilySummary("No class/family match was strong enough; manual review required.");return false;}
 if(ctx.ambiguous){
   activeHistoricalContext=null;updateHistoricalCompoundLabels();
   renderHistoricalFamilySummary(`Multiple historical class calibrations remain plausible: ${(ctx.candidates||[]).map(x=>x.name).join(" / ")}.`);
   return false;
 }
 $("preset").value=ctx.familyId;
 return applyHistoricalContext(ctx,source);
}
function applyPreset(key){
 if(key==="manual"){
   activeHistoricalContext=null;updateHistoricalCompoundLabels();renderHistoricalFamilySummary("Manual mode: current checkboxes and construction are preserved.");return;
 }
 if(key==="auto"){
   if(!autoApplyHistoricalContext("automatic year/class category")){
     // Safe fallback: one dry race tire instead of an empty or invented S/M/H ladder.
     if(!["cSoft","cMedium","cHard","cInter","cWet"].some(id=>$(id).checked))$("cMedium").checked=true;
   }
   return;
 }
 const ctx=window.ACLMHistoricalCategories?.contextForFamily(key,v("year"));
 if(ctx) applyHistoricalContext(ctx,"manually selected historical tire family");
}
populateHistoricalCategoryOptions();
populateSeriesClassOptions();
populateSupplierOptions();
function parseLutPoints(text){return String(text||"").trim().split(/\r?\n/).filter(Boolean).map(line=>{const p=line.split("|").map(Number);return{x:p[0],y:p[1]};}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function graphCanvas(id,title,xLabel,yLabel,series,opts={}){
 const c=$(id);if(!c)return;const rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(320,Math.floor(rect.width||640)),h=Math.max(220,Math.floor(rect.height||250));
 c.width=Math.floor(w*dpr);c.height=Math.floor(h*dpr);const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const pad={l:54,r:18,t:26,b:42},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,all=series.flatMap(s=>s.points||[]);
 if(!all.length){ctx.fillStyle="#94a3b8";ctx.font="13px sans-serif";ctx.fillText("No curve data",pad.l,pad.t+20);return;}
 let xmin=opts.xmin??Math.min(...all.map(p=>p.x)),xmax=opts.xmax??Math.max(...all.map(p=>p.x)),ymin=opts.ymin??Math.min(...all.map(p=>p.y)),ymax=opts.ymax??Math.max(...all.map(p=>p.y));
 if(xmax===xmin)xmax=xmin+1;if(ymax===ymin)ymax=ymin+1;const xp=x=>pad.l+(x-xmin)/(xmax-xmin)*pw,yp=y=>pad.t+ph-(y-ymin)/(ymax-ymin)*ph;
 ctx.strokeStyle="#293544";ctx.lineWidth=1;ctx.fillStyle="#94a3b8";ctx.font="11px sans-serif";
 for(let i=0;i<=5;i++){const x=xmin+(xmax-xmin)*i/5,px=xp(x);ctx.beginPath();ctx.moveTo(px,pad.t);ctx.lineTo(px,pad.t+ph);ctx.stroke();ctx.textAlign="center";ctx.fillText((Math.abs(x)>=100?x.toFixed(0):x.toFixed(1)).replace(".0",""),px,pad.t+ph+17);}
 for(let i=0;i<=5;i++){const y=ymin+(ymax-ymin)*i/5,py=yp(y);ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(pad.l+pw,py);ctx.stroke();ctx.textAlign="right";ctx.fillText((Math.abs(y)>=10?y.toFixed(0):y.toFixed(2)).replace(".00",""),pad.l-7,py+4);}
 ctx.strokeStyle="#66788d";ctx.strokeRect(pad.l,pad.t,pw,ph);ctx.fillStyle="#dbe5ef";ctx.font="bold 12px sans-serif";ctx.textAlign="left";ctx.fillText(title,pad.l,16);
 ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(xLabel,pad.l+pw/2,h-8);ctx.save();ctx.translate(13,pad.t+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText(yLabel,0,0);ctx.restore();
 const palette=["#43b4ff","#ffb347","#77dd77","#e684ff","#ff6b6b","#f4e04d"];
 series.forEach((s,si)=>{const pts=s.points||[];if(!pts.length)return;ctx.strokeStyle=palette[si%palette.length];ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;ctx.beginPath();pts.forEach((p,i)=>{const X=xp(p.x),Y=yp(p.y);if(i===0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);});ctx.stroke();pts.forEach(p=>{ctx.beginPath();ctx.arc(xp(p.x),yp(p.y),2.4,0,Math.PI*2);ctx.fill();});ctx.font="11px sans-serif";ctx.textAlign="left";ctx.fillText(s.name,pad.l+8+si*110,pad.t+14);});
}
function refreshGraphCompoundOptions(){const sel=$("graphCompound");if(!sel)return;const cur=sel.value,comps=selectedCompounds();sel.innerHTML="";comps.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=compoundDisplayName(c);sel.appendChild(o);});if(comps.includes(cur))sel.value=cur;else if(comps.includes("medium"))sel.value="medium";}
function renderTireGraphs(){
 refreshGraphCompoundOptions();const comp=$("graphCompound")?.value||selectedCompounds()[0];if(!comp)return;
 const front=parseLutPoints(wearText(comp+"F")),rear=parseLutPoints(wearText(comp+"R"));
 graphCanvas("wearGraph",`${compoundDisplayName(comp)} wear curve`,"Virtual km","Grip %",[{name:"Front",points:front},{name:"Rear",points:rear}],{ymin:Math.min(45,...front.concat(rear).map(p=>p.y)),ymax:101});
 const temp=parseLutPoints(performanceCurveText(comp));graphCanvas("tempGraph",`${compoundDisplayName(comp)} temperature curve`,"Temperature °C","Grip factor",[{name:compoundDisplayName(comp),points:temp}],{ymin:Math.min(.7,...temp.map(p=>p.y)),ymax:1.02});
 const comps=selectedCompounds(),dy=comps.map((c,i)=>({x:i,y:(activeFamilyPrior()&&dryCompound(c)?priorCompoundValue(c,"lat"):compDefs[c].dy)})),dx=comps.map((c,i)=>({x:i,y:(activeFamilyPrior()&&dryCompound(c)?priorCompoundValue(c,"long"):compDefs[c].dx)}));
 graphCanvas("gripGraph","Peak grip reference","Selected compound index","μ reference",[{name:"DY_REF",points:dy},{name:"DX_REF",points:dx}],{xmin:0,xmax:Math.max(1,comps.length-1)});
}

$("preset").addEventListener("change",e=>{applyPreset(e.target.value);populateSeriesClassOptions();});
$("series").addEventListener("change",()=>{clearMenuProvenance("series");applySeriesMenuSelection();refreshMenuDrivenOutput();});
$("supplier").addEventListener("change",()=>{clearMenuProvenance("supplier");refreshMenuDrivenOutput();});
$("reset").addEventListener("click",()=>{applyPreset($("preset").value);populateSeriesClassOptions();populateSupplierOptions();});

function inlineCurve(base,scale){
 let pts=[];
 for(let i=0;i<base.length;i++) pts.push(`${i*1000}=${(base[i]*scale).toFixed(6)}`);
 return "("+pts.join("|")+")";
}
function camberLut(axle,construction){
 if(construction==="bias"){
   return "-6|0.82\n-5|0.87\n-4|0.92\n-3|0.965\n-2|0.995\n-1|1.000\n0|0.990\n1|0.965\n2|0.925\n";
 }
 if(axle==="front") return "-7|0.82\n-6|0.88\n-5|0.94\n-4|0.985\n-3.2|1.000\n-2.5|0.996\n-1.5|0.975\n0|0.920\n1|0.875\n";
 return "-7|0.80\n-6|0.87\n-5|0.94\n-4|0.985\n-3.0|1.000\n-2.2|0.997\n-1.2|0.978\n0|0.930\n1|0.885\n";
}
const tempCurves={
 soft:"0|0.72\n30|0.80\n45|0.90\n60|0.97\n75|1.00\n95|1.00\n110|0.98\n125|0.93\n145|0.82\n165|0.68\n185|0.52\n",
 medium:"0|0.68\n35|0.78\n50|0.88\n65|0.95\n80|0.99\n90|1.00\n105|1.00\n120|0.97\n140|0.90\n160|0.78\n180|0.61\n",
 hard:"0|0.64\n40|0.74\n55|0.84\n70|0.92\n85|0.98\n95|1.00\n115|1.00\n130|0.98\n150|0.92\n175|0.80\n195|0.64\n",
 intermediate:"0|0.78\n20|0.87\n35|0.95\n50|1.00\n70|1.00\n85|0.97\n100|0.91\n120|0.80\n140|0.64\n",
 wet:"0|0.84\n10|0.90\n25|0.97\n40|1.00\n60|1.00\n75|0.96\n90|0.88\n105|0.76\n120|0.60\n"
};

function performanceCurveText(comp){
 const p=activeFamilyPrior();
 if(!p||!dryCompound(comp)||!Number.isFinite(Number(p.tempOpt))||!Number.isFinite(Number(p.tempWidth))) return tempCurves[comp];
 let center=Number(p.tempOpt),width=Math.max(8,Number(p.tempWidth));
 if(comp==="soft") center-=4;
 if(comp==="hard") center+=4;
 const pts=[
   [Math.max(0,center-2.6*width),.66],[Math.max(0,center-1.8*width),.78],
   [Math.max(0,center-1.15*width),.90],[Math.max(0,center-.55*width),.98],
   [Math.max(0,center-.22*width),1.00],[center+.22*width,1.00],
   [center+.65*width,.97],[center+1.25*width,.89],[center+2.0*width,.74],[center+2.8*width,.55]
 ];
 const out=[];for(const [x,y] of pts){const X=Math.round(x);if(!out.length||X>out[out.length-1][0])out.push([X,y]);}
 return out.map(p=>`${p[0]}|${p[1].toFixed(2)}`).join("\n")+"\n";
}

const wearBase={
 softF:[[0,100],[2,100],[5,99.5],[8.8,97],[13.2,94],[16.5,91],[22,86],[27,80],[33.5,72],[40.5,63],[54,48],[81,30],[108,18]],
 softR:[[0,100],[2,100],[5,99],[8.8,96],[13.2,93.5],[16.5,91],[22,86],[27,81],[33.5,75],[40.5,68],[54,54],[81,32],[108,18]],
 mediumF:[[0,100],[2,100],[5,99.5],[8.8,98],[13.2,96.5],[16.5,95],[22,92],[27,89],[33.5,85],[40.5,80],[54,70],[81,50],[108,32],[150,16]],
 mediumR:[[0,100],[2,100],[5,99],[8.8,97],[13.2,95],[16.5,92.5],[22,88],[27,84],[33.5,78],[40.5,70],[54,54],[81,31],[108,17],[150,8]],
 hardF:[[0,100],[2,100],[5,100],[10,99.7],[15,99.1],[22,98],[33.5,96],[47,92],[67.5,86],[81,80],[108,68],[150,52],[200,35]],
 hardR:[[0,100],[2,100],[5,99.9],[10,99.4],[15,98.6],[22,97],[33.5,94],[47,89],[67.5,81],[81,74],[108,61],[150,44],[200,29]],
 intermediateF:[[0,100],[3,100],[8,99],[15,97],[25,93],[40,87],[60,78],[85,64],[115,48],[150,34]],
 intermediateR:[[0,100],[3,100],[8,99],[15,96.5],[25,92],[40,85],[60,75],[85,60],[115,44],[150,30]],
 wetF:[[0,100],[3,100],[8,99],[15,98],[25,95],[40,90],[60,83],[85,73],[115,60],[150,48]],
 wetR:[[0,100],[3,100],[8,99],[15,97.5],[25,94],[40,88],[60,80],[85,69],[115,56],[150,43]]
};
function wearText(key){
 let pts=wearBase[key].map(p=>[Number(p[0]),Number(p[1])]);
 const comp=String(key).replace(/[FR]$/,"");
 // Historical class menus include a service-life prior. Use it to scale the X axis
 // while preserving the non-linear wear->grip shape. This is a class prior, not a
 // claim that a supplier's exact tread-loss curve is known.
 const targetLife=historicalLifeKm(comp);
 if(Number.isFinite(targetLife)&&targetLife>5){
   const lifeThreshold=$("terminalNormalGrip")?clamp(n("terminalNormalGrip"),51,95):60;
   let baseLifeX=null;
   for(const pt of pts) if(pt[1]>=lifeThreshold && pt[0]>0) baseLifeX=pt[0];
   if(baseLifeX&&baseLifeX>0){
     const scale=clamp(targetLife/baseLifeX,0.20,6.0);
     pts=pts.map(p=>[Number((p[0]*scale).toFixed(3)),p[1]]);
   }
 }
 if($("terminalFailure")?.checked){
   const normalGrip=clamp(n("terminalNormalGrip"),1,99);
   const failureGrip=clamp(n("terminalFailureGrip"),1,99);
   const gap=Math.max(0.01,n("terminalFailureGap"));
   const minNormal=Math.max(normalGrip,failureGrip+0.1);
   let cut=-1;
   for(let i=0;i<pts.length;i++) if(pts[i][1]>=minNormal) cut=i;
   if(cut<1) cut=Math.max(1,pts.length-1);
   pts=pts.slice(0,cut+1);
   const last=pts[pts.length-1];
   let effFailure=Math.min(failureGrip,last[1]-0.1);
   effFailure=Math.max(1,effFailure);
   pts.push([Number((last[0]+gap).toFixed(3)),Number(effFailure.toFixed(3))]);
 }
 return pts.map(p=>p[0]+"|"+p[1]).join("\n")+"\n";
}

const compDefs={
 soft:{name:"Soft",short:"S",type:"SLICK",dy:1.6274,dx:1.5941,fall:.90,angle:7.8,flex:.00050,flexGain:.036,lsy:.80,lsx:.84,p:"S",side:1.00,sideX:1.80,
 thF:{surf:.0155,patch:.00024,core:.00036,internal:.0036,fric:.093,roll:.165,cool:1.55,sroll:1.04},
 thR:{surf:.0150,patch:.00023,core:.00036,internal:.0036,fric:.089,roll:.155,cool:1.60,sroll:.99}},
 medium:{name:"Medium",short:"M",type:"SLICK",dy:1.5800,dx:1.5477,fall:.92,angle:8.2,flex:.00048,flexGain:.034,lsy:.81,lsx:.85,p:"M",side:1.00,sideX:1.80,
 thF:{surf:.0140,patch:.00024,core:.00036,internal:.0036,fric:.087,roll:.170,cool:1.70,sroll:.98},
 thR:{surf:.0138,patch:.00023,core:.00036,internal:.0036,fric:.083,roll:.155,cool:1.74,sroll:.94}},
 hard:{name:"Hard",short:"H",type:"SLICK",dy:1.5484,dx:1.5167,fall:.94,angle:8.4,flex:.00046,flexGain:.031,lsy:.82,lsx:.86,p:"H",side:1.01,sideX:1.80,
 thF:{surf:.0130,patch:.00023,core:.00034,internal:.0034,fric:.081,roll:.175,cool:1.82,sroll:.92},
 thR:{surf:.0128,patch:.00022,core:.00035,internal:.0035,fric:.078,roll:.150,cool:1.80,sroll:.88}},
 intermediate:{name:"Intermediate",short:"I",type:"RACING_TREADED",dy:1.46,dx:1.43,fall:.93,angle:9.0,flex:.00055,flexGain:.042,lsy:.78,lsx:.82,p:"I",side:.96,sideX:1.65,
 thF:{surf:.0170,patch:.00028,core:.00038,internal:.0038,fric:.096,roll:.185,cool:1.48,sroll:1.08},
 thR:{surf:.0165,patch:.00027,core:.00038,internal:.0038,fric:.092,roll:.170,cool:1.52,sroll:1.03}},
 wet:{name:"Wet",short:"W",type:"RAIN",dy:1.14,dx:1.11,fall:.92,angle:9.6,flex:.00062,flexGain:.048,lsy:.76,lsx:.80,p:"W",side:.93,sideX:1.55,
 thF:{surf:.0190,patch:.00032,core:.00040,internal:.0040,fric:.105,roll:.195,cool:1.32,sroll:1.15},
 thR:{surf:.0185,patch:.00031,core:.00040,internal:.0040,fric:.101,roll:.180,cool:1.36,sroll:1.10}}
};

function selectedCompounds(){
 const ids=[["soft","cSoft"],["medium","cMedium"],["hard","cHard"],["intermediate","cInter"],["wet","cWet"]];
 return ids.filter(x=>$(x[1]).checked).map(x=>x[0]);
}
function targetTempForCompound(comp){
 if(!window.ACLMPressure) return NaN;
 return window.ACLMPressure.optimalTempFromLutText(performanceCurveText(comp));
}
function solvedColdPressure(comp){
 if(!window.ACLMPressure) return NaN;
 return window.ACLMPressure.solveColdPsi(n("pIdeal"),targetTempForCompound(comp),n("pRefTemp"));
}
function pressure(comp,axle){
 const p=compDefs[comp].p;
 if($("autoSolvePressure")?.checked){
   const solved=solvedColdPressure(comp);
   if(Number.isFinite(solved)) return solved;
 }
 return n("p"+p+(axle==="front"?"F":"R"));
}
function importedPressureSummary(){
 const parts=[];
 for(const [comp,r] of Object.entries(importedPressureReference||{})){
   if(r && (Number.isFinite(r.front)||Number.isFinite(r.rear))){
     parts.push(`${comp}: ${Number.isFinite(r.front)?r.front.toFixed(1):"-"} F / ${Number.isFinite(r.rear)?r.rear.toFixed(1):"-"} R psi`);
   }
 }
 return parts.join("; ");
}
function refreshSolvedPressures(){
 const auto=$("autoSolvePressure")?.checked;
 const pairs={soft:["pSF","pSR"],medium:["pMF","pMR"],hard:["pHF","pHR"],intermediate:["pIF","pIR"],wet:["pWF","pWR"]};
 const details=[];
 for(const [comp,ids] of Object.entries(pairs)){
   const temp=targetTempForCompound(comp);
   if(auto){
     const psi=solvedColdPressure(comp);
     if(Number.isFinite(psi)){
       ids.forEach(id=>{$(id).value=psi.toFixed(1);$(id).readOnly=true;});
       details.push(`${compDefs[comp].name}: ${psi.toFixed(1)} psi @ ${temp.toFixed(1)} deg C target`);
     }
   }else{
     ids.forEach(id=>$(id).readOnly=false);
   }
 }
 const status=$("pressureSolveStatus");
 if(status){
   if(auto){
     status.innerHTML=`<b>Auto pressure solve active.</b> Reference ${n("pRefTemp").toFixed(1)} deg C -> ideal ${n("pIdeal").toFixed(1)} psi at each compound's peak thermal window. ${escapeHtml(details.join(" | "))}${importedPressureSummary()?`<br><b>Imported AC cold-pressure reference only:</b> ${escapeHtml(importedPressureSummary())}`:""}`;
   }else{
     status.innerHTML=`<b>Manual cold-pressure mode.</b> Tire Lab will use the F/R values shown above. ${importedPressureSummary()?`Imported AC reference: ${escapeHtml(importedPressureSummary())}`:""}`;
   }
 }
}
function fz0(axle){
 const m=n("mass"), fw=n("frontWeight")/100, factor=n("fzFactor");
 const raw=m*9.80665*(axle==="front"?fw:(1-fw))/2*factor;
 const ov=n(axle==="front"?"fzF":"fzR");
 return Math.round(ov>0?ov:raw);
}
function tireSection(comp,axle,index){
 const d=compDefs[comp], isF=axle==="front";
 const suffix=index===0?"":"_"+index;
 const section=(isF?"FRONT":"REAR")+suffix;
 const width=n(isF?"fw":"rw"), rad=n(isF?"fr":"rr"), rim=n(isF?"frr":"rrr");
 const rate=n(isF?"rateF":"rateR");
 const prior=activeFamilyPrior();
 const dyRef=(prior&&dryCompound(comp)?priorCompoundValue(comp,"lat"):d.dy);
 const dxRef=(prior&&dryCompound(comp)?priorCompoundValue(comp,"long"):d.dx);
 const scaleLat=dyRef/1.50, scaleLon=dxRef/1.50;
 const wear=`aclm_${comp}_${axle}_wear.lut`;
 const dc=`camber_table_${axle}.lut`;
 const type=compoundTypeHint(comp);
 const displayName=compoundDisplayName(comp);
 const shortName=compoundShortName(comp);
 const pstatic=pressure(comp,axle);
 const inertia=(width*rad*(isF?15.0:15.5)).toFixed(3);
 const damp=Math.round(prior&&dryCompound(comp)&&Number.isFinite(Number(prior.damp))?Number(prior.damp):rate*0.00155);
 let lines=[
 `[${section}]`,
 `NAME=${displayName}`,
 `SHORT_NAME=${shortName}`,
 `TYPE_HINT=${type}`,
 `WIDTH=${width.toFixed(6)}`,
 `RADIUS=${rad.toFixed(6)}`,
 `RIM_RADIUS=${rim.toFixed(6)}`,
 `ANGULAR_INERTIA=${inertia}`,
 `DAMP=${damp}`,
 `RATE=${Math.round(rate)}`,
 `SIDEWALL_K_MULT=${d.side.toFixed(3)}`,
 `SIDEWALL_K_MULT_X=${d.sideX.toFixed(3)}`,
 `DY_CURVE=${inlineCurve(BASE_LAT,scaleLat)}`,
 `DX_CURVE=${inlineCurve(BASE_LON,scaleLon)}`,
 `DY0=${(dyRef*0.98).toFixed(4)}`,
 `DY1=-0.0500`,
 `DX0=${(dxRef*0.98).toFixed(4)}`,
 `DX1=-0.0500`,
 `WEAR_CURVE=${wear}`,
 `SPEED_SENSITIVITY=${(prior&&dryCompound(comp)?Number(prior.speedSens):(comp==="wet"?.0023:.0030)).toFixed(5)}`,
 `RELAXATION_LENGTH=${(prior&&dryCompound(comp)?Number(prior.relax):(isF?(v("construction")==="bias"?.125:.098):(v("construction")==="bias"?.135:.104))).toFixed(5)}`,
 `ROLLING_RESISTANCE_0=${(prior&&dryCompound(comp)?Number(prior.rr0):(comp==="wet"?14:12)).toFixed(4)}`,
 `ROLLING_RESISTANCE_1=${(prior&&dryCompound(comp)?Number(prior.rr1):(isF?.00074:.00080)).toFixed(6)}`,
 `ROLLING_RESISTANCE_SLIP=${Math.round(prior&&dryCompound(comp)?Number(prior.rrSlip):(isF?5200:5450))}`,
 `FLEX=${(prior&&dryCompound(comp)?Number(prior.flex):d.flex).toFixed(6)}`,
 `FLEX_GAIN=${(prior&&dryCompound(comp)&&Number.isFinite(Number(prior.flexGain))?Number(prior.flexGain):d.flexGain).toFixed(5)}`,
 `CAMBER_GAIN=${(prior&&dryCompound(comp)?Number(prior.camberGain):(v("construction")==="bias"?.16:(isF?.115:.125))).toFixed(3)}`,
 `DCAMBER_0=${(prior&&dryCompound(comp)?Number(prior.dcamber0):(isF?1.145916:1.336902)).toFixed(6)}`,
 `DCAMBER_1=${(prior&&dryCompound(comp)?Number(prior.dcamber1):(isF?-8.207016:-12.766469)).toFixed(6)}`,
 `DCAMBER_LUT=${dc}`,
 `DCAMBER_LUT_SMOOTH=1`,
 `FRICTION_LIMIT_ANGLE=${(prior&&dryCompound(comp)?Number(prior.frictionAngle):d.angle).toFixed(2)}`,
 `XMU=${(prior&&dryCompound(comp)?Number(prior.xmu):0.25).toFixed(3)}`,
 `PRESSURE_STATIC=${pstatic.toFixed(1)}`,
 `PRESSURE_SPRING_GAIN=${Math.round(prior&&dryCompound(comp)&&Number.isFinite(Number(prior.pressureGainPerMm))?Number(prior.pressureGainPerMm)*width*1000:rate*(isF?.023:.022))}`,
 `PRESSURE_FLEX_GAIN=0.370`,
 `PRESSURE_RR_GAIN=${comp==="wet"?.32:.30}`,
 `PRESSURE_D_GAIN=${comp==="wet"?.0032:.0030}`,
 `PRESSURE_IDEAL=${n("pIdeal").toFixed(1)}`,
 `FZ0=${fz0(axle)}`,
 `LS_EXPY=${(prior&&dryCompound(comp)?Number(prior.loadY):d.lsy).toFixed(4)}`,
 `LS_EXPX=${(prior&&dryCompound(comp)?Number(prior.loadX):d.lsx).toFixed(4)}`,
 `DY_REF=${dyRef.toFixed(4)}`,
 `DX_REF=${dxRef.toFixed(4)}`,
 `FALLOFF_LEVEL=${(prior&&dryCompound(comp)?Number(prior.falloffLevel):d.fall).toFixed(3)}`,
 `FALLOFF_SPEED=${(prior&&dryCompound(comp)?Number(prior.falloffSpeed):(comp==="wet"?4:5)).toFixed(2)}`,
 `CX_MULT=${comp==="wet"?"1.03":"1.10"}`,
 `RADIUS_ANGULAR_K=${(prior&&dryCompound(comp)?Number(prior.radiusK):(v("construction")==="bias"?.045:.018)).toFixed(4)}`,
 `BRAKE_DX_MOD=${comp==="wet"?"0.020":"0.030"}`,
 `COMBINED_FACTOR=${comp==="wet"?"2.20":"2.00"}`
 ];
 if(comp==="wet" && $("wetTread").checked) lines.push("TREAD_DEPTH=0.0075","TREAD_COVER=0.42");
 if(comp==="intermediate" && $("wetTread").checked) lines.push("TREAD_DEPTH=0.0035","TREAD_COVER=0.24");
 return lines.join("\n")+"\n";
}
function thermalSection(comp,axle,index){
 const d=compDefs[comp], prior=activeFamilyPrior();
 let t=axle==="front"?d.thF:d.thR;
 if(prior&&dryCompound(comp)){
   t={
    surf:Number(prior.surfaceTransfer),patch:Number(prior.patchTransfer),core:Number(prior.coreTransfer),
    internal:Number(prior.internalCoreTransfer),fric:Number(prior.frictionK),roll:Number(prior.rollingK),
    cool:Number(prior.cool),sroll:Number(prior.rollingK)*5.8
   };
 }
 const suffix=index===0?"":"_"+index, sec="THERMAL_"+(axle==="front"?"FRONT":"REAR")+suffix;
 return `[${sec}]
SURFACE_TRANSFER=${t.surf.toFixed(6)}
PATCH_TRANSFER=${t.patch.toFixed(6)}
CORE_TRANSFER=${t.core.toFixed(6)}
INTERNAL_CORE_TRANSFER=${t.internal.toFixed(6)}
FRICTION_K=${t.fric.toFixed(5)}
ROLLING_K=${t.roll.toFixed(5)}
PERFORMANCE_CURVE=aclm_${comp}_tcurve.lut
GRAIN_GAMMA=1.000
GRAIN_GAIN=${comp==="soft"?.50:.35}
BLISTER_GAMMA=1.000
BLISTER_GAIN=${comp==="soft"?.50:.35}
COOL_FACTOR=${t.cool.toFixed(3)}
SURFACE_ROLLING_K=${t.sroll.toFixed(4)}
`;
}

function provenanceLabel(id){
 const el=$(id);
 if(!el) return "Unknown";
 if(el.classList.contains("imported-field")) return "Direct AC package";
 if(el.classList.contains("researched-field")) return "Historical research / inferred";
 const value=String(el.value||"").trim().toLowerCase();
 if(!value||value==="unknown"||value==="general / unknown") return "Unresolved";
 return "User-selected / Tire Lab profile";
}
function reportConfidenceScore(){
 let score=0;
 const prov=id=>provenanceLabel(id);
 if(v("car")) score += prov("car")==="Direct AC package"?12:prov("car")==="Historical research / inferred"?9:6;
 if(v("year")) score += prov("year")==="Direct AC package"?10:prov("year")==="Historical research / inferred"?8:4;
 if(v("series") && !/unknown/i.test(v("series"))) score += prov("series")==="Historical research / inferred"?12:8;
 if(v("supplier") && !/unknown/i.test(v("supplier"))) score += prov("supplier")==="Historical research / inferred"?10:7;
 score += v("construction")==="radial"||v("construction")==="bias"?8:4;
 const geomIds=["fw","fr","frr","rw","rr","rrr"];
 const directGeom=geomIds.filter(id=>provenanceLabel(id)==="Direct AC package").length;
 score += directGeom>=5?14:directGeom>=2?10:6;
 score += provenanceLabel("mass")==="Direct AC package"?8:4;
 const ws=$("wearStatus")?.value||"provisional";
 score += ws==="historical"?14:ws==="imported"?9:5;
 const srcCount=(lastResearchCandidates?.pages||[]).length;
 score += srcCount>=2?12:srcCount===1?8:0;
 return clamp(Math.round(score),0,100);
}
function reportFindings(){
 const out=[];
 if(!v("car")) out.push("Car identity is unresolved; historical accuracy cannot be certified.");
 else out.push(`Car identity used for this tire pack: ${v("car")}.`);
 if(!v("year")) out.push("Racing year is unresolved.");
 if(!v("series")||/unknown/i.test(v("series"))) out.push("Racing class/series is unresolved; compound family and construction context should be treated as generic.");
 else out.push(`Selected historical racing context: ${v("series")}.`);
 if(!v("supplier")||/unknown/i.test(v("supplier"))) out.push("Tire supplier is unresolved; supplier-specific peak grip, thermal window and wear behavior are not claimed.");
 else out.push(`Selected supplier context: ${v("supplier")}.`);
 if(activeHistoricalContext) out.push(`Historical tire category ${activeHistoricalContext.familyId} (${activeHistoricalContext.familyName}) is active; it controls construction/type, period menu and class-life wear priors without inventing supplier-proprietary peak grip.`);
 else out.push("Historical tire category is unresolved/manual; period compound availability has not been automatically constrained.");
 if(provenanceLabel("construction")==="Historical research / inferred") out.push(`Tire construction (${v("construction")==="bias"?"bias/cross-ply":"radial"}) was inferred from the researched historical tire designation.`);
 const ws=$("wearStatus")?.value||"provisional";
 if(ws!=="historical") out.push("Wear-to-grip behavior remains provisional/evidence-weighted rather than historically certified from period stint data.");
 else out.push("Wear calibration is marked historically calibrated from stint evidence.");
 if($("terminalFailure")?.checked) out.push(`Terminal tire failure is a simulation layer: ${n("terminalFailureGrip").toFixed(0)}% grip after +${n("terminalFailureGap").toFixed(2)} vKm beyond the final normal-wear point. It is not direct historical puncture evidence.`);
 if($("autoSolvePressure")?.checked) out.push(`Generated cold pressures are solved from the ${n("pRefTemp").toFixed(1)} deg C reference temperature to each compound's peak temperature window; imported PRESSURE_STATIC values are reference-only.`);
 else {
   const predF=window.ACLMPressure?.predictHotPsi(pressure("medium","front"),targetTempForCompound("medium"),n("pRefTemp"));
   if(Number.isFinite(predF)&&Math.abs(predF-n("pIdeal"))>1) out.push(`Manual Medium pressure predicts approximately ${predF.toFixed(1)} psi at the target thermal peak versus ${n("pIdeal").toFixed(1)} psi ideal.`);
 }
 if((lastResearchCandidates?.classes||[]).length>1 && /unknown/i.test(v("series"))) out.push("Multiple historical racing categories were found but no context has been selected yet.");
 if((lastResearchCandidates?.suppliers||[]).length>1 && /unknown/i.test(v("supplier"))) out.push("Multiple historical tire suppliers were found but no supplier context has been selected yet.");
 return out;
}
function historicalReportFileName(){return window.ACLMExportNaming.makeReportName(v("car"));}
function buildHistoricalReportData(comps){
 const sourcePages=(lastResearchCandidates?.pages||[]).map(p=>({
   title:p.title||"Historical source",
   url:p.fullurl||(`https://en.wikipedia.org/?curid=${p.pageid||""}`)
 }));
 const importedKeys=Object.keys(importedPhysics||{}).map(basename);
 const important=["ui_car.json","car.ini","tyres.ini","suspensions.ini","setup.ini"];
 const importedUsed=important.filter(x=>importedKeys.includes(x));
 const provNotes=[
   importedUsed.length?`Imported AC package files inspected for generation: ${importedUsed.join(", ")}.`:"No imported AC physics package is attached to this current report state.",
   "Green Tire Lab fields are direct values from the imported AC package. These document the mod state, not necessarily historical truth.",
   "Amber fields are historical research/inference and are retained as reviewable evidence rather than hidden assumptions.",
   "Unmarked values are user selections, defaults or Tire Lab reconstruction/calibration values."
 ];
 const limitations=[
   "A generated AC tire can be structurally valid while exact supplier proprietary coefficients remain unavailable.",
   "Peak friction, exact stiffness, thermal constants and wear-to-grip curves should only be described as factory-exact when primary evidence exists.",
   "Lap time and Assetto Corsa behavior are validation evidence for the simulation implementation, not standalone proof of historical tire specifications.",
   "User-adjustable AC tire-wear multipliers can compress or extend race strategy without changing the historical baseline wear curve."
 ];
 return {
   title:"Historical Tire Accuracy & Evidence Report",
   car:v("car")||"Unknown car",
   generatedAt:new Date().toLocaleString(),
   build:"v0.6.0",
   confidenceScore:reportConfidenceScore(),
   identity:[
     {label:"Car",value:v("car")||"Unknown",provenance:provenanceLabel("car")},
     {label:"Racing year",value:v("year")||"Unknown",provenance:provenanceLabel("year")},
     {label:"Series / class",value:v("series")||"General / unknown",provenance:provenanceLabel("series")},
     {label:"Tire supplier",value:v("supplier")||"Unknown",provenance:provenanceLabel("supplier")},
     {label:"Construction",value:v("construction"),provenance:"Selected historical/tire-family context"}
   ],
   model:[
     {label:"Historical tire category",value:activeHistoricalContext?`${activeHistoricalContext.familyId} — ${activeHistoricalContext.familyName}`:"Manual / unresolved"},
     {label:"Class calibration",value:activeHistoricalContext?.classId?`${activeHistoricalContext.classId} — ${activeHistoricalContext.className}`:"None"},
     {label:"Compounds",value:comps.map(c=>compoundDisplayName(c)).join(", ")},
     {label:"Vehicle mass used",value:`${n("mass").toFixed(0)} kg`},
     {label:"Static front weight used",value:`${n("frontWeight").toFixed(1)}%`},
     {label:"Front tire geometry",value:`${(n("fw")*1000).toFixed(0)} mm width, ${(n("fr")*2000).toFixed(0)} mm OD, rim radius ${(n("frr")*1000).toFixed(1)} mm`},
     {label:"Rear tire geometry",value:`${(n("rw")*1000).toFixed(0)} mm width, ${(n("rr")*2000).toFixed(0)} mm OD, rim radius ${(n("rrr")*1000).toFixed(1)} mm`},
     {label:"Vertical rate",value:`${(n("rateF")/1000).toFixed(1)} N/mm front / ${(n("rateR")/1000).toFixed(1)} N/mm rear`},
     {label:"Reference load FZ0",value:`${fz0("front")} N front / ${fz0("rear")} N rear`},
     {label:"Ideal hot pressure",value:`${n("pIdeal").toFixed(1)} psi`},
     {label:"Pressure generation",value:$("autoSolvePressure")?.checked?`Auto-solved from ${n("pRefTemp").toFixed(1)} deg C reference to each compound thermal peak`:"Manual generated cold pressures"},
     {label:"Medium generated cold pressure",value:`${pressure("medium","front").toFixed(1)} psi front / ${pressure("medium","rear").toFixed(1)} psi rear`},
     {label:"Imported AC cold-pressure reference",value:importedPressureSummary()||"None / not imported"},
     {label:"Blanket temperature",value:`${n("blankets").toFixed(0)} deg C`},
     {label:"Thermal implementation",value:$("legacyThermal").checked?"Legacy AC thermal model":"Thermal sections omitted"},
     {label:"Physics output",value:$("extended").checked?"AC v10 tire model with CSP extended-2 car context":"AC v10 tire model"},
     {label:"Knowledge release",value:`v${window.ACLMHistoricalCategories?.knowledgeInfo?.().version||"?"} / schema ${window.ACLMHistoricalCategories?.knowledgeInfo?.().schemaVersion||"?"}`},
     {label:"Historical family physics",value:activeFamilyPrior()?`${activeHistoricalContext?.familyId}: family-specific grip/load/transient/thermal priors active`:"No family Generator_Prior active"},
     {label:"Imported old tire reference",value:`RATE ${importedTireReference.rateF??"-"} F / ${importedTireReference.rateR??"-"} R N/m; ideal pressure ${importedTireReference.idealPressure??"-"} psi (reference only)`}
   ],
   findings:reportFindings(),
   wear:[
     {label:"Wear calibration status",value:$("wearStatus")?.value||"provisional"},
     {label:"Wear calibration note",value:$("wearNote")?.value||"No note"},
     {label:"Terminal failure",value:$("terminalFailure")?.checked?`Enabled: ${n("terminalFailureGrip").toFixed(0)}% grip after +${n("terminalFailureGap").toFixed(2)} vKm`:"Disabled"},
     {label:"Wear philosophy",value:"100% AC wear represents the best historical baseline; users can use AC wear multipliers to compress race strategy."}
   ],
   acImplementation:[
     "Assetto Corsa tire format VERSION=10.",
     "Front/rear tire sections include load curves, pressure model, FZ0, relaxation length, camber LUTs and combined-slip parameters.",
     "Every selected compound exports its front/rear wear LUT and temperature/performance LUT.",
     "The pack validator blocks export for missing referenced LUTs, malformed LUT rows, invalid geometry or other structural errors.",
     "This PDF is generated automatically and bundled with every Tire Lab ZIP export."
   ],
   provenance:provNotes,
   sources:sourcePages,
   limitations
 };
}

function build(){
 const comps=selectedCompounds();
 if(!v("car")||/^car$/i.test(v("car")))throw new Error("Car name is required before generating a tire pack.");
 lockExportName();
 if(!comps.length) throw new Error("Select at least one compound.");
 // Keep Medium as default when available, otherwise first available.
 const defaultIdx=Math.max(0,comps.indexOf("medium"));
 let ini=`; ================================================================
; ACLM PROJECT - HISTORICAL RACE TIRE MODEL
; Generated by ACLM Historical Tire Lab v0.6.0
; ${n("year")} | ${v("series")} | ${v("car")} | ${v("supplier")}
; Historical tire category: ${activeHistoricalContext?`${activeHistoricalContext.familyId} - ${activeHistoricalContext.familyName}`:"manual / unresolved"}
; Class calibration: ${activeHistoricalContext?.classId?`${activeHistoricalContext.classId} - ${activeHistoricalContext.className}`:"none"}
; Complete AC v10 output: required legacy keys + v10 load curves + camber LUTs + thermal/wear LUTs.
; Physics output: ${$("extended").checked?"CSP Extended Physics (extended-2)":"AC v10"}
; Historical values remain evidence-weighted reconstruction unless directly documented.
; ================================================================
[HEADER]
VERSION=10

[COMPOUND_DEFAULT]
INDEX=${defaultIdx}

[VIRTUALKM]
USE_LOAD=1

[EXPLOSION]
TEMPERATURE=400

[_EXTENSION]
LATERAL_RAYS=1
LONGITUDINAL_RAYS=2
MAX_RAY_ANGLE=40
DISABLE_RAY_DOUBLING=0
SMOOTH_LOAD_SENS=1

[ADDITIONAL1]
BLANKETS_TEMP=${Math.round(n("blankets"))}
PRESSURE_TEMPERATURE_GAIN=${n("pTempGain").toFixed(3)}
CAMBER_TEMP_SPREAD_K=1.4

`;
 const files={};
 files["camber_table_front.lut"]=camberLut("front",v("construction"));
 files["camber_table_rear.lut"]=camberLut("rear",v("construction"));
 comps.forEach((c,i)=>{
   ini+=tireSection(c,"front",i)+"\n"+tireSection(c,"rear",i)+"\n";
   if($("legacyThermal").checked) ini+=thermalSection(c,"front",i)+"\n"+thermalSection(c,"rear",i)+"\n";
   files[`aclm_${c}_front_wear.lut`]=wearText(c+"F");
   files[`aclm_${c}_rear_wear.lut`]=wearText(c+"R");
   files[`aclm_${c}_tcurve.lut`]=tempCurves[c];
 });
 files["tyres.ini"]=ini;
 files["ACLM_TIREPACK_MANIFEST.txt"]=`ACLM Historical Tire Lab v0.6.0
Car: ${v("car")}
Year/class: ${n("year")} / ${v("series")}
Supplier: ${v("supplier")}
Construction: ${v("construction")}
Historical category: ${activeHistoricalContext?`${activeHistoricalContext.familyId} - ${activeHistoricalContext.familyName}`:"manual / unresolved"}
Class calibration: ${activeHistoricalContext?.classId?`${activeHistoricalContext.classId} - ${activeHistoricalContext.className}`:"none"}
Compounds: ${comps.map(c=>compoundDisplayName(c)).join(", ")}
FZ0 front/rear: ${fz0("front")} / ${fz0("rear")} N
AC tire format: VERSION=10
CSP: ${$("extended").checked?"car.ini should use VERSION=extended-2":"not required by this export"}
Thermal: ${$("legacyThermal").checked?"legacy AC thermal model":"thermal sections omitted"}
Pressure generation: ${$("autoSolvePressure")?.checked?`auto-solved from ${n("pRefTemp").toFixed(1)} C reference to compound peak thermal temperatures`:"manual cold pressures"}
Imported AC cold-pressure reference: ${importedPressureSummary() || "none"}
Medium generated cold pressure F/R: ${pressure("medium","front").toFixed(1)} / ${pressure("medium","rear").toFixed(1)} psi
Ideal hot pressure: ${n("pIdeal").toFixed(1)} psi
Wear calibration: ${$("wearStatus")?.value || "provisional"}
Wear note: ${$("wearNote")?.value || ""}
Terminal failure: ${$("terminalFailure")?.checked ? `enabled; normal curve threshold ${n("terminalNormalGrip").toFixed(1)}% grip; failure ${n("terminalFailureGrip").toFixed(1)}% at +${n("terminalFailureGap").toFixed(2)} vKm` : "disabled"}
Output ZIP: ${currentExportZipName||outputZipName()}
NOTE: This pack is structurally complete and reference-validated. On-track grip, temperature and wear still require car-specific certification.
Historical PDF report: ${historicalReportFileName()}
`;
 if(!window.ACLMPdf || typeof window.ACLMPdf.create!=="function") throw new Error("Historical PDF report engine is unavailable.");
 files[historicalReportFileName()]=window.ACLMPdf.create(buildHistoricalReportData(comps));
 return files;
}
function parseIniSections(txt){
 const out={};let cur=null;
 txt.split(/\r?\n/).forEach(line=>{
   const m=line.match(/^\[([^\]]+)\]/); if(m){cur=m[1];out[cur]={};return;}
   if(cur && line.includes("=") && !line.trim().startsWith(";")){
     const k=line.slice(0,line.indexOf("=")).trim(), val=line.slice(line.indexOf("=")+1).trim(); out[cur][k]=val;
   }
 }); return out;
}
function validate(files){
 let errors=[], warnings=[], info=[];
 const ini=files["tyres.ini"]; const sec=parseIniSections(ini);
 if(sec.HEADER?.VERSION!=="10") errors.push("tyres.ini HEADER VERSION must be 10.");
 if(!v("car")) errors.push("Car name is missing; export filename cannot be made car-specific.");
 else {const expectedName=makeOutputZipName(v("car"));if((currentExportZipName||expectedName)!==expectedName)errors.push(`Export filename regression: expected ${expectedName}.`);info.push(`Export ZIP: ${expectedName}`);}
 const reportEntry=Object.entries(files).find(([fn])=>/_Historical_Tire_Accuracy_Report\.pdf$/i.test(fn));
 if(!reportEntry) errors.push("Historical tire accuracy PDF report is missing from the generated pack.");
 else {
   const bytes=reportEntry[1] instanceof Uint8Array?reportEntry[1]:new Uint8Array(reportEntry[1]);
   const sig=String.fromCharCode(...bytes.slice(0,5));
   if(sig!=="%PDF-") errors.push("Historical tire accuracy report does not contain a valid PDF signature.");
 }
 if(!sec.VIRTUALKM || sec.VIRTUALKM.USE_LOAD!=="1") errors.push("Missing [VIRTUALKM] USE_LOAD=1.");
 if(!sec.ADDITIONAL1) errors.push("Missing [ADDITIONAL1].");
 const fronts=Object.keys(sec).filter(x=>/^FRONT(_\d+)?$/.test(x)).sort((a,b)=>(Number(a.split("_")[1]||0)-Number(b.split("_")[1]||0)));
 const rears=Object.keys(sec).filter(x=>/^REAR(_\d+)?$/.test(x));
 const required=["NAME","SHORT_NAME","TYPE_HINT","WIDTH","RADIUS","RIM_RADIUS","RATE","DY_CURVE","DX_CURVE","DY0","DY1","DX0","DX1","WEAR_CURVE","RELAXATION_LENGTH","FLEX","CAMBER_GAIN","DCAMBER_LUT","PRESSURE_STATIC","PRESSURE_IDEAL","FZ0","LS_EXPY","LS_EXPX","DY_REF","DX_REF","FLEX_GAIN","FALLOFF_LEVEL","CX_MULT","RADIUS_ANGULAR_K","BRAKE_DX_MOD","COMBINED_FACTOR"];
 fronts.forEach((f,i)=>{
   const r=i===0?"REAR":"REAR_"+i;
   if(!sec[r]) errors.push(`Missing paired [${r}] for [${f}].`);
   [f,r].filter(Boolean).forEach(s=>{
     required.forEach(k=>{if(!(k in sec[s])) errors.push(`[${s}] missing ${k}.`)});
     const rad=Number(sec[s].RADIUS), rim=Number(sec[s].RIM_RADIUS);
     if(!(rad>rim && rim>0)) errors.push(`[${s}] invalid RADIUS/RIM_RADIUS relationship.`);
     const type=sec[s].TYPE_HINT;
     if(type==="RAIN" && $("wetTread").checked && (!("TREAD_DEPTH" in sec[s])||!("TREAD_COVER" in sec[s]))) errors.push(`[${s}] rain tire missing tread fields.`);
     ["WEAR_CURVE","DCAMBER_LUT"].forEach(k=>{const fn=sec[s][k];if(fn && !(fn in files)) errors.push(`[${s}] references missing ${fn}.`)});
   });
   const tf=i===0?"THERMAL_FRONT":"THERMAL_FRONT_"+i, tr=i===0?"THERMAL_REAR":"THERMAL_REAR_"+i;
   if($("legacyThermal").checked){
     [tf,tr].forEach(t=>{
       if(!sec[t]) errors.push(`Missing [${t}].`);
       else if(!(sec[t].PERFORMANCE_CURVE in files)) errors.push(`[${t}] references missing ${sec[t].PERFORMANCE_CURVE}.`);
     });
   }
 });
 // Generic LUT parse/monotonic check
 Object.entries(files).filter(([fn])=>fn.endsWith(".lut")).forEach(([fn,txt])=>{
   let xs=[]; txt.split(/\r?\n/).filter(x=>x.trim() && !x.trim().startsWith(";")).forEach(line=>{
     const p=line.split("|"); if(p.length!==2 || !isFinite(Number(p[0])) || !isFinite(Number(p[1]))) errors.push(`${fn}: malformed LUT row "${line}".`);
     else xs.push(Number(p[0]));
   });
   if(xs.length<2) errors.push(`${fn}: LUT has fewer than two numeric points.`);
   for(let i=1;i<xs.length;i++) if(xs[i]<=xs[i-1]) errors.push(`${fn}: X axis is not strictly increasing.`);
 });
 if(!window.ACLMPressure) errors.push("Pressure solver module is unavailable.");
 else {
   selectedCompounds().forEach(comp=>{
     const target=targetTempForCompound(comp);
     ["front","rear"].forEach(axle=>{
       const cold=pressure(comp,axle);
       const predicted=window.ACLMPressure.predictHotPsi(cold,target,n("pRefTemp"));
       if(!Number.isFinite(cold)||cold<=0) errors.push(`${comp} ${axle}: invalid generated cold pressure.`);
       if(Number.isFinite(predicted)){
         const delta=Math.abs(predicted-n("pIdeal"));
         if($("autoSolvePressure")?.checked && delta>0.15) errors.push(`${comp} ${axle}: auto pressure solver misses ideal hot pressure by ${delta.toFixed(2)} psi.`);
         if(!$("autoSolvePressure")?.checked && delta>1.0) warnings.push(`${comp} ${axle}: manual cold pressure predicts ${predicted.toFixed(1)} psi at ${target.toFixed(1)} C, ${delta.toFixed(1)} psi away from ideal.`);
       }
     });
   });
   info.push(`Pressure model: ${$("autoSolvePressure")?.checked?"auto-solved":"manual"} using ${n("pRefTemp").toFixed(1)} C cold reference.`);
 }
 if(n("blankets")===0 && v("construction")==="radial") warnings.push("Blankets are set to 0°C for a radial racing profile.");
 if($("terminalFailure")?.checked){
   const targetGap=n("terminalFailureGap"), targetGrip=n("terminalFailureGrip");
   Object.entries(files).filter(([fn])=>/_wear\.lut$/.test(fn)).forEach(([fn,txt])=>{
     const pts=txt.trim().split(/\r?\n/).filter(Boolean).map(line=>line.split("|").map(Number));
     if(pts.length>=2){
       const a=pts[pts.length-2], b=pts[pts.length-1];
       if(!(b[1]<a[1])) errors.push(`${fn}: terminal failure point must reduce grip.`);
       if(Math.abs((b[0]-a[0])-targetGap)>0.011) errors.push(`${fn}: terminal failure gap does not match configured ${targetGap} vKm.`);
       if(b[1]>targetGrip+0.011) errors.push(`${fn}: terminal failure grip exceeds configured ${targetGrip}%.`);
     }
   });
   info.push(`Terminal tire failure enabled: ${n("terminalFailureGrip").toFixed(0)}% target grip, +${n("terminalFailureGap").toFixed(2)} vKm after the final normal-wear point.`);
 }
 info.push(`${fronts.length} compound(s), ${Object.keys(files).length} total files.`);
 info.push(`Auto FZ0: ${fz0("front")} N front / ${fz0("rear")} N rear.`);
 info.push("All external wear, temperature and camber LUT references are resolved before export.");
 return {errors,warnings,info};
}
function renderValidation(x){
 let h="";
 if(!x.errors.length) h+=`<p class="ok"><b>PASS:</b> no structural AC/LUT errors found.</p>`;
 else h+=`<p class="error"><b>FAIL:</b> ${x.errors.length} error(s).</p><ul>${x.errors.map(e=>`<li class="error">${e}</li>`).join("")}</ul>`;
 if(x.warnings.length) h+=`<ul>${x.warnings.map(e=>`<li class="warning">${e}</li>`).join("")}</ul>`;
 h+=`<ul>${x.info.map(e=>`<li>${e}</li>`).join("")}</ul>`;
 $("validation").innerHTML=h;
 $("status").innerHTML=x.errors.length?'<span class="error">Export blocked until errors are fixed.</span>':'<span class="ok">AC output schema and file references validated.</span>';
 $("downloadZip").disabled=!!x.errors.length;
}
let currentExportZipName="";
function safeOutputStem(name){return window.ACLMExportNaming.safeOutputStem(name);}
function makeOutputZipName(carName){return window.ACLMExportNaming.makeOutputZipName(carName);}
function outputZipName(){return makeOutputZipName(v("car"));}
function lockExportName(){currentExportZipName=makeOutputZipName(v("car"));updateOutputName();return currentExportZipName;}
function updateOutputName(){const el=$("outputName");if(el)el.textContent=`Output ZIP: ${currentExportZipName||outputZipName()}`;}
function mimeForFile(name){
 if(/\.pdf$/i.test(name)) return "application/pdf";
 if(/\.zip$/i.test(name)) return "application/zip";
 if(/\.ini$|\.lut$|\.txt$/i.test(name)) return "text/plain";
 return "application/octet-stream";
}
function downloadBlob(name,data,type=null){
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:type||mimeForFile(name)}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function renderFiles(files){
 const div=$("files");div.innerHTML="";
 Object.keys(files).sort((a,b)=>a==="tyres.ini"?-1:b==="tyres.ini"?1:a.localeCompare(b)).forEach(fn=>{
   const a=document.createElement("a");a.href="#";a.textContent=fn;a.onclick=e=>{e.preventDefault();downloadBlob(fn,files[fn]);};div.appendChild(a);
 });
 $("preview").textContent=files["tyres.ini"]||"";
}
// minimal ZIP writer (store/no compression), no external dependencies.
function crc32(bytes){
 let table=crc32.table;if(!table){table=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}crc32.table=table}
 let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=table[(c^bytes[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;
}
function u16(v){return [v&255,(v>>>8)&255]} function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function zipStore(files){
 const te=new TextEncoder(), parts=[], central=[]; let offset=0;
 for(const [name,data] of Object.entries(files)){
   const nb=te.encode(name);
   const db=typeof data==="string"?te.encode(data):(data instanceof Uint8Array?data:new Uint8Array(data));
   const crc=crc32(db);
   const local=new Uint8Array([0x50,0x4b,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),...u16(0),...nb]);
   parts.push(local,db);
   const cen=new Uint8Array([0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb]);
   central.push(cen); offset+=local.length+db.length;
 }
 const cStart=offset,cSize=central.reduce((a,b)=>a+b.length,0), count=central.length;
 const eocd=new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(count),...u16(count),...u32(cSize),...u32(cStart),...u16(0)]);
 return new Blob([...parts,...central,eocd],{type:"application/zip"});
}

// -----------------------------------------------------------------------------
// v0.3.6: Existing Assetto Corsa physics importer + browser-app installation.
// -----------------------------------------------------------------------------
let importedPhysics = {};
let deferredInstallPrompt = null;

function escapeHtml(s){return String(s ?? "").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function markImported(id, source){
 const el=$(id); if(!el) return; el.classList.add("imported-field"); el.title=`Imported from ${source}`;
}
function clearImportedMarks(){
 document.querySelectorAll('.imported-field').forEach(x=>{x.classList.remove('imported-field');x.removeAttribute('title');});
 document.querySelectorAll('.researched-field').forEach(x=>{x.classList.remove('researched-field');x.removeAttribute('data-research-source');});
}
function setImported(id,val,source,precision=null){
 if(val===undefined || val===null || val==="" || !isFinite(Number(val))) return false;
 const el=$(id); if(!el) return false;
 el.value=precision===null?String(val):Number(val).toFixed(precision);
 markImported(id,source); return true;
}
function parseIniText(txt){
 const out={}; let cur=null;
 txt.replace(/^\uFEFF/,'').split(/\r?\n/).forEach(raw=>{
   let line=raw.trim(); if(!line || line.startsWith(';') || line.startsWith('#')) return;
   const sm=line.match(/^\[([^\]]+)\]/); if(sm){cur=sm[1].trim().toUpperCase();out[cur]=out[cur]||{};return;}
   if(!cur || !line.includes('=')) return;
   const pos=line.indexOf('='); const key=line.slice(0,pos).trim().toUpperCase();
   let value=line.slice(pos+1).trim(); const semi=value.indexOf(';'); if(semi>=0) value=value.slice(0,semi).trim();
   out[cur][key]=value;
 }); return out;
}
function basename(p){return String(p).replace(/\\/g,'/').split('/').filter(Boolean).pop()?.toLowerCase()||'';}
function numIni(sec,key){const x=sec?.[key]; return x!==undefined && isFinite(Number(x))?Number(x):null;}
function sectionForIndex(base,index){return index===0?base:`${base}_${index}`;}
function classifyCompound(name,type,shortName){
 const s=`${name||''} ${shortName||''} ${type||''}`.toLowerCase();
 if(/wet|rain|w\b/.test(s)) return 'wet';
 if(/inter|intermediate|cut.?slick/.test(s)) return 'intermediate';
 if(/soft|sprint|quali|qualifying/.test(s)) return 'soft';
 if(/hard|endurance|long/.test(s)) return 'hard';
 if(/medium|race|med/.test(s)) return 'medium';
 return null;
}
function decodeText(bytes){return new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/^\uFEFF/,'');}
async function inflateRaw(bytes){
 if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot decompress ZIP deflate streams. Use Edge/Chrome 110+ or import an unpacked data folder.');
 const ds=new DecompressionStream('deflate-raw');
 const stream=new Blob([bytes]).stream().pipeThrough(ds);
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
function findEOCD(u8){
 for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(u8[i]===0x50&&u8[i+1]===0x4b&&u8[i+2]===0x05&&u8[i+3]===0x06)return i;} return -1;
}
async function readZipPhysics(file){
 const u8=new Uint8Array(await file.arrayBuffer()); const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
 const eocd=findEOCD(u8); if(eocd<0) throw new Error('ZIP directory not found. The file may be corrupt or not a standard ZIP.');
 const entries=dv.getUint16(eocd+10,true), cdOffset=dv.getUint32(eocd+16,true); let ptr=cdOffset; const out={};
 for(let i=0;i<entries;i++){
   if(dv.getUint32(ptr,true)!==0x02014b50) throw new Error('Unsupported ZIP central directory layout.');
   const method=dv.getUint16(ptr+10,true), compSize=dv.getUint32(ptr+20,true), uncompSize=dv.getUint32(ptr+24,true);
   const nameLen=dv.getUint16(ptr+28,true), extraLen=dv.getUint16(ptr+30,true), commentLen=dv.getUint16(ptr+32,true), localOff=dv.getUint32(ptr+42,true);
   const name=decodeText(u8.slice(ptr+46,ptr+46+nameLen));
   ptr += 46+nameLen+extraLen+commentLen;
   if(name.endsWith('/') || uncompSize>4_000_000) continue;
   const bn=basename(name); const wanted=/\.(ini|lut|json|txt)$/i.test(bn) || ['data.acd'].includes(bn); if(!wanted) continue;
   if(dv.getUint32(localOff,true)!==0x04034b50) continue;
   const ln=dv.getUint16(localOff+26,true), le=dv.getUint16(localOff+28,true), dataStart=localOff+30+ln+le;
   const comp=u8.slice(dataStart,dataStart+compSize); let raw;
   if(method===0) raw=comp; else if(method===8) raw=await inflateRaw(comp); else continue;
   out[name]=decodeText(raw);
 }
 return out;
}
async function readFolderPhysics(fileList){
 const out={}; for(const f of Array.from(fileList||[])){
   const name=f.webkitRelativePath||f.name; if(!/\.(ini|lut|json|txt)$/i.test(name)) continue; if(f.size>4_000_000) continue;
   out[name]=await f.text();
 } return out;
}
function fileByBase(files,bn){const key=Object.keys(files).find(k=>basename(k)===bn.toLowerCase()); return key?{path:key,text:files[key]}:null;}
function allByBase(files,bn){return Object.keys(files).filter(k=>basename(k)===bn.toLowerCase()).map(k=>({path:k,text:files[k]}));}
function importedRow(label,value,source){return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(source)}</td></tr>`;}


let lastImportLabel="";
let lastResearchCandidates={classes:[],suppliers:[],constructions:[],pages:[]};

function fieldIsDirect(id){return !!$(id)?.classList.contains("imported-field");}
function markResearched(id,source){
 const el=$(id); if(!el || fieldIsDirect(id)) return false;
 el.classList.add("researched-field");
 el.dataset.researchSource=source||"research";
 el.title=`Researched / inferred from ${source||"public source"} — review before certification`;
 return true;
}
function setResearched(id,value,source){
 if(value===undefined || value===null || String(value).trim()==="" || fieldIsDirect(id)) return false;
 const el=$(id); if(!el) return false;
 setMenuValue(id,String(value)); markResearched(id,source); return true;
}
function clearResearchChoices(){
 lastResearchCandidates={classes:[],suppliers:[],constructions:[],pages:[]};
 $("researchChoices").hidden=true;
 $("classChoiceWrap").hidden=true;
 $("supplierChoiceWrap").hidden=true;
 $("classChoice").innerHTML="";
 $("supplierChoice").innerHTML="";
}
function normalizeCarName(s){
 return String(s||"")
   .replace(/[_\-]+/g," ")
   .replace(/\b(ACLM|Kunos|RSS|VRC|F302)\b/ig," ")
   .replace(/\s+/g," ").trim();
}
function researchBaseName(s){return window.ACLMResearch.researchBaseName(s);}
function detectSuppliers(text){return window.ACLMResearch.detectSuppliers(text);}
function yearCandidatesFromText(text){return window.ACLMResearch.yearCandidatesFromText(text);}
function extractRaceSentences(text){
 return String(text||"").split(/(?<=[.!?])\s+/)
  .filter(s=>/race|racing|motorsport|championship|season|debut|competed|entered|le mans|group c|c1|c2|gtp|gt1|gt2|gt3|gt500|gt300|bpr|imsa|fia gt|jgtc|super gt|tire|tyre|dunlop|michelin|goodyear|pirelli|bridgestone|yokohama/i.test(s));
}
function chooseRaceYear(text){return window.ACLMResearch.chooseRaceYear(text);}
function classCandidatesFromText(text){return window.ACLMResearch.classCandidatesFromText(text);}
function constructionCandidatesFromText(text){return window.ACLMResearch.constructionCandidatesFromText(text);}
function identityTokens(s){return window.ACLMResearch.identityTokens(s);}
function pageIdentityScore(page,carName){return window.ACLMResearch.pageIdentityScore(page,carName);}
async function fetchWikipediaWikitext(title){
 const params=new URLSearchParams({action:"parse",page:title,prop:"wikitext",format:"json",origin:"*"});
 const response=await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`,{cache:"no-store"});
 if(!response.ok) return "";
 const data=await response.json();
 return data?.parse?.wikitext?.["*"] || "";
}
async function wikipediaSearchPages(query){
 const params=new URLSearchParams({
   action:"query",generator:"search",gsrsearch:query,gsrlimit:"8",
   prop:"extracts|info",exintro:"1",explaintext:"1",inprop:"url",format:"json",origin:"*"
 });
 const response=await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`,{cache:"no-store"});
 if(!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
 const data=await response.json();
 return Object.values(data?.query?.pages||{});
}
async function wikipediaIdentityPages(carName){
 const base=researchBaseName(carName),queries=[`"${base}"`,`"${base}" motorsport`,`"${base}" racing`,`"${base}" competition`],merged=new Map();
 for(const q of queries){
   let pages=[];try{pages=await wikipediaSearchPages(q);}catch(e){}
   for(const p of pages){const old=merged.get(p.pageid);if(!old||pageIdentityScore(p,carName)>pageIdentityScore(old,carName))merged.set(p.pageid,p);}
   if(q===queries[0]&&[...merged.values()].some(p=>pageIdentityScore(p,carName)>=14))break;
 }
 const ranked=[...merged.values()].map(p=>({...p,_score:pageIdentityScore(p,carName)})).sort((a,b)=>b._score-a._score).filter(p=>p._score>=4),enriched=[];
 for(const p of ranked.slice(0,6)){let full="";try{full=await fetchWikipediaWikitext(p.title);}catch(e){}enriched.push({...p,_fulltext:full});}
 return enriched;
}
async function identifyImportedYear(){
 const status=$("researchStatus"),carName=v("car");
 if(!carName || fieldIsDirect("year") || Number(v("year"))>1900) return;
 status.textContent="Identifying racing year from the imported car identity…";
 try{
   const pages=await wikipediaIdentityPages(carName);
   if(!pages.length) throw new Error("No high-confidence identity page found.");
   // Use the strongest identity page only for automatic year identification.
   const year=chooseRaceYear(`${pages[0].title}. ${pages[0].extract||""}\n${pages[0]._fulltext||""}`);
   if(year){
     setResearched("year",year,`Wikipedia: ${pages[0].title}`);
     status.innerHTML=`<span class="ok"><b>Car identified:</b></span> ${escapeHtml(carName)}, racing year ${year}. Class and supplier remain General/Unknown until researched.`;
   }else{
     status.innerHTML=`<span class="warning">Car identified as ${escapeHtml(carName)}, but no single racing year was confident enough to auto-fill.</span>`;
   }
 }catch(e){
   status.innerHTML=`<span class="warning">Car imported as ${escapeHtml(carName)}. Automatic year lookup was inconclusive.</span>`;
 }
}
function setResearchDefaults(){
 setMenuValue("series",GENERAL_UNKNOWN);
 setMenuValue("supplier",GENERAL_UNKNOWN);
 $("series").classList.remove("imported-field","researched-field");
 $("supplier").classList.remove("imported-field","researched-field");
}
function addOption(select,value){
 const opt=document.createElement("option");opt.value=value;opt.textContent=value;select.appendChild(opt);
}
function renderResearchChoices(classes,suppliers){
 $("researchChoices").hidden=true;
 $("classChoiceWrap").hidden=true;
 $("supplierChoiceWrap").hidden=true;
 $("classChoice").innerHTML="";
 $("supplierChoice").innerHTML="";
 lastResearchCandidates.classes=classes;
 lastResearchCandidates.suppliers=suppliers;
 if(classes.length>1){
   $("classChoiceWrap").hidden=false;
   addOption($("classChoice"),"");
   $("classChoice").options[0].textContent="Select racing category…";
   classes.forEach(x=>addOption($("classChoice"),x));
 }
 if(suppliers.length>1){
   $("supplierChoiceWrap").hidden=false;
   addOption($("supplierChoice"),"");
   $("supplierChoice").options[0].textContent="Select tire supplier…";
   suppliers.forEach(x=>addOption($("supplierChoice"),x));
 }
 $("researchChoices").hidden = !((classes.length>1)||(suppliers.length>1));
}

function renderKnowledgeProfileSources(profile){
 const ids=profile?.sourceIds||[];const links=[];
 for(const id of ids){const s=window.ACLMHistoricalCategories?.sourceById?.(id);if(s?.url)links.push(`<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(id)} — ${escapeHtml(s.title||"source")}</a>`);}
 if(links.length)$("researchSources").innerHTML=links.join(" · ");
}
function applyCuratedKnowledgeProfile(showStatus=true){
 const profile=window.ACLMHistoricalCategories?.profileForCar?.(v("car"));if(!profile)return false;
 const cls=window.ACLMHistoricalCategories.classById(profile.classId);
 if(profile.year&&!fieldIsDirect("year"))setResearched("year",profile.year,`ACLM Knowledge ${profile.id}`);
 if(cls&&!fieldIsDirect("series"))setResearched("series",cls.name,`ACLM Knowledge ${profile.id}`);
 if(profile.supplier&&!fieldIsDirect("supplier"))setResearched("supplier",profile.supplier,`ACLM Knowledge ${profile.id}`);
 if(cls){const ctx=window.ACLMHistoricalCategories.contextForClass(cls.id,profile.year||v("year"));applyHistoricalContext(ctx,`ACLM Knowledge ${profile.id}`);}
 renderKnowledgeProfileSources(profile);
 if(showStatus)$("researchStatus").innerHTML=`<span class="ok"><b>Curated ACLM match:</b></span> ${escapeHtml(profile.display)} · ${escapeHtml(cls?.name||profile.classId)}${profile.supplier?` · ${escapeHtml(profile.supplier)}`:""} · confidence ${escapeHtml(String(profile.confidence||"?"))}/100.`;
 return true;
}

async function researchHistoricalProfile(){
 const status=$("researchStatus"),sources=$("researchSources"),carName=v("car");
 clearResearchChoices(); sources.innerHTML="";
 if(applyCuratedKnowledgeProfile(true)){try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){} return;}
 if(!carName||/custom race car|historical gt/i.test(carName)){
   status.innerHTML='<span class="warning">Need a usable imported car name before historical-context research can run.</span>';return;
 }
 status.textContent="Researching racing categories and tire suppliers…";
 try{
   const pages=await wikipediaIdentityPages(carName);
   if(!pages.length) throw new Error("No high-confidence identity page found.");
   // Restrict context extraction to identity-matched pages; this avoids the old
   // Supra/GT search contamination from broad list/season pages.
   const contextPages=pages.filter(p=>p._score>=Math.max(4,pages[0]._score-4)).slice(0,4);
   const combined=contextPages.map(p=>`${p.title}. ${p.extract||""}\n${p._fulltext||""}`).join("\n");
   const classes=classCandidatesFromText(combined);
   // Prefer the exact identity page's infobox tyre field. Broad page text can mention
   // rival suppliers and was the reason cars such as the BRM P48 returned nonsense
   // multi-supplier choices even when the infobox said Dunlop.
   const topInfoboxSuppliers=window.ACLMResearch.infoboxSupplierCandidates(contextPages[0]._fulltext||"");
   const suppliers=topInfoboxSuppliers.length?topInfoboxSuppliers:
     [...new Set([...contextPages.flatMap(p=>window.ACLMResearch.infoboxSupplierCandidates(p._fulltext||"")),...detectSuppliers(combined)])];
   const topConstruction=window.ACLMResearch.infoboxConstructionCandidates(contextPages[0]._fulltext||"");
   const constructions=topConstruction.length?topConstruction:
     [...new Set([...contextPages.flatMap(p=>window.ACLMResearch.infoboxConstructionCandidates(p._fulltext||"")),...constructionCandidatesFromText(combined)])];
   // Import-time year identification is best effort. If that did not resolve, the
   // full identity page used for research gets one more chance.
   if(!v("year")){
     const researchedYear=chooseRaceYear(`${contextPages[0].title}. ${contextPages[0].extract||""}\n${contextPages[0]._fulltext||""}`);
     if(researchedYear) setResearched("year",researchedYear,`Wikipedia: ${contextPages[0].title}`);
   }
   lastResearchCandidates={classes,suppliers,constructions,pages:contextPages};

   sources.innerHTML=contextPages.map(p=>{
     const href=p.fullurl||`https://en.wikipedia.org/?curid=${p.pageid}`;
     return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>`;
   }).join(" · ");

   // Exactly one candidate can be applied automatically. Multiple candidates
   // require user selection because the tire family can change by class/supplier.
   if(classes.length===1) setResearched("series",classes[0],`Wikipedia: ${contextPages[0].title}`);
   else $("series").value="General / unknown";

   if(suppliers.length===1) setResearched("supplier",suppliers[0],`Wikipedia: ${contextPages[0].title}`);
   else setMenuValue("supplier",GENERAL_UNKNOWN);

   if(constructions.length===1){
     $("construction").value=constructions[0];
     markResearched("construction",`historical tire designation on Wikipedia: ${contextPages[0].title}`);
   }

   renderResearchChoices(classes,suppliers);
   lastResearchCandidates.pages=contextPages;
   lastResearchCandidates.constructions=constructions;

   // A unique researched category should immediately change the period tire family
   // and compound menu. This is the key historical-mode behavior.
   if(classes.length===1) autoApplyHistoricalContext("researched year + racing class");

   const messages=[];
   if(classes.length===0) messages.push("no confident racing category found");
   else if(classes.length===1) messages.push(`class ${classes[0]}`);
   else messages.push(`${classes.length} racing categories found — select one below`);
   if(suppliers.length===0) messages.push("supplier remains unknown");
   else if(suppliers.length===1) messages.push(`supplier ${suppliers[0]}`);
   else messages.push(`${suppliers.length} tire suppliers found — select one below`);
   if(constructions.length===1) messages.push(`construction ${constructions[0]==="bias"?"bias/cross-ply":"radial"}`);
   else if(constructions.length>1) messages.push("construction evidence conflicts — review manually");
   status.innerHTML=`<span class="${classes.length>1||suppliers.length>1||constructions.length>1?'warning':'ok'}"><b>Research complete:</b></span> ${escapeHtml(messages.join("; "))}.`;
   try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 }catch(e){
   status.innerHTML=`<span class="warning"><b>Historical-context research was inconclusive:</b></span> ${escapeHtml(e.message)} Series/class and supplier were left unchanged.`;
 }
}
function applyResearchChoices(){
 let changed=false;
 if(!$("classChoiceWrap").hidden){
   const cls=$("classChoice").value;
   if(!cls){$("classChoice").classList.add("research-choice-needed");return;}
   $("classChoice").classList.remove("research-choice-needed");
   setResearched("series",cls,"selected from researched racing categories");changed=true;
 }
 if(!$("supplierChoiceWrap").hidden){
   const supplier=$("supplierChoice").value;
   if(!supplier){$("supplierChoice").classList.add("research-choice-needed");return;}
   $("supplierChoice").classList.remove("research-choice-needed");
   setResearched("supplier",supplier,"selected from researched tire suppliers");changed=true;
 }
 if(changed){
   autoApplyHistoricalContext("selected researched year + racing class");
   $("researchStatus").innerHTML='<span class="ok"><b>Historical context applied.</b></span> Tire generation now uses the selected class/supplier and its matched historical tire category/menu.';
   $("researchChoices").hidden=true;
   try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 }
}

function populateFromPhysics(files,label='import'){
 clearImportedMarks(); clearResearchChoices(); importedPhysics=files; importedPressureReference={}; importedTireReference={}; lastImportLabel=label; const rows=[]; const notes=[]; let populated=0;
 $('preset').value='auto'; activeHistoricalContext=null; updateHistoricalCompoundLabels(); renderHistoricalFamilySummary('Awaiting researched racing class.');
 // New car import must not inherit the previous car's historical profile.
 $('car').value='';
 $('year').value='';
 setResearchDefaults();
 $('researchSources').innerHTML='';
 $('researchStatus').textContent='Car identity is being read from the imported AC package.';
 // ui_car.json: reliable display identity when included.
 const ui=fileByBase(files,'ui_car.json');
 if(ui){try{
   const j=JSON.parse(ui.text);
   if(j.name){$('car').value=normalizeCarName(j.name);markImported('car',ui.path);populated++;rows.push(importedRow('Car',normalizeCarName(j.name),ui.path));}
   else if(j.brand&&j.model){const carName=normalizeCarName(`${j.brand} ${j.model}`);$('car').value=carName;markImported('car',ui.path);populated++;rows.push(importedRow('Car',carName,ui.path));}
   if(j.year && /^\d{4}/.test(String(j.year))){$('year').value=parseInt(j.year);markImported('year',ui.path);populated++;rows.push(importedRow('Year',parseInt(j.year),ui.path));}
 }catch(e){notes.push('ui_car.json was present but could not be parsed.');}}
 // car.ini
 const car=fileByBase(files,'car.ini');
 if(car){const c=parseIniText(car.text);
   if(!$('car').value){
     const screen=c.INFO?.SCREEN_NAME || c.INFO?.SHORT_NAME;
     if(screen){const carName=normalizeCarName(screen);$('car').value=carName;markImported('car',`${car.path} [INFO]`);populated++;rows.push(importedRow('Car',carName,`${car.path} [INFO]`));}
   }
   const mass=numIni(c.BASIC,'TOTALMASS') ?? numIni(c.BASIC,'MASS'); if(mass!==null){setImported('mass',mass,car.path,0);populated++;rows.push(importedRow('Mass',`${mass} kg`,car.path));}
   const hv=c.HEADER?.VERSION; if(hv){$('extended').checked=String(hv).toLowerCase().includes('extended'); rows.push(importedRow('car.ini physics version',hv,car.path));}
 }
 // suspensions.ini
 const sus=fileByBase(files,'suspensions.ini');
 if(sus){const s=parseIniText(sus.text); const cg=numIni(s.BASIC,'CG_LOCATION'); if(cg!==null && cg>0 && cg<1){setImported('frontWeight',cg*100,sus.path,2);populated++;rows.push(importedRow('Front static weight from CG_LOCATION',`${(cg*100).toFixed(2)}%`,sus.path));}
   const wb=numIni(s.BASIC,'WHEELBASE'); if(wb!==null) rows.push(importedRow('Wheelbase',`${wb.toFixed(3)} m`,sus.path));
   const ft=numIni(s.FRONT,'TRACK'), rt=numIni(s.REAR,'TRACK'); if(ft!==null) rows.push(importedRow('Front track',`${ft.toFixed(3)} m`,sus.path)); if(rt!==null) rows.push(importedRow('Rear track',`${rt.toFixed(3)} m`,sus.path));
 }
 // tyres.ini: default compound is the geometry/load source; all compounds can provide pressure labels.
 const tyre=fileByBase(files,'tyres.ini');
 if(tyre){const t=parseIniText(tyre.text); let idx=Math.max(0,Math.trunc(numIni(t.COMPOUND_DEFAULT,'INDEX')??0)); let fs=sectionForIndex('FRONT',idx), rs=sectionForIndex('REAR',idx);
   if(!t[fs]||!t[rs]){idx=0;fs='FRONT';rs='REAR';}
   const F=t[fs],R=t[rs];
   const mapping=[['fw',numIni(F,'WIDTH'),3,'Front width'],['fr',numIni(F,'RADIUS'),4,'Front radius'],['frr',numIni(F,'RIM_RADIUS'),4,'Front rim radius'],['rw',numIni(R,'WIDTH'),3,'Rear width'],['rr',numIni(R,'RADIUS'),4,'Rear radius'],['rrr',numIni(R,'RIM_RADIUS'),4,'Rear rim radius'],['fzF',numIni(F,'FZ0'),0,'Front FZ0'],['fzR',numIni(R,'FZ0'),0,'Rear FZ0']];
   mapping.forEach(([id,val,prec,lab])=>{if(val!==null){setImported(id,val,tyre.path,prec);populated++;rows.push(importedRow(lab,prec?Number(val).toFixed(prec):Math.round(val),`${tyre.path} [${id.startsWith('r')||id==='rateR'||id==='fzR'?rs:fs}]`));}});
   const oldRateF=numIni(F,'RATE'),oldRateR=numIni(R,'RATE');
   if(oldRateF!==null||oldRateR!==null){
     importedTireReference.rateF=oldRateF;importedTireReference.rateR=oldRateR;
     rows.push(importedRow('Existing AC tire RATE reference',`${oldRateF!==null?oldRateF.toFixed(0):"-"} F / ${oldRateR!==null?oldRateR.toFixed(0):"-"} R N/m`,tyre.path));
   }
   const idealF=numIni(F,'PRESSURE_IDEAL'),idealR=numIni(R,'PRESSURE_IDEAL');if(idealF!==null||idealR!==null){const p=idealF!==null&&idealR!==null?(idealF+idealR)/2:(idealF??idealR);importedTireReference.idealPressure=p;rows.push(importedRow('Existing AC ideal-pressure reference',`${p.toFixed(1)} psi`,tyre.path));}
   const blanket=numIni(t.ADDITIONAL1,'BLANKETS_TEMP');if(blanket!==null){setImported('blankets',blanket,tyre.path,0);populated++;rows.push(importedRow('Blanket temperature',`${blanket} °C`,tyre.path));}
   const ptg=numIni(t.ADDITIONAL1,'PRESSURE_TEMPERATURE_GAIN');if(ptg!==null){setImported('pTempGain',ptg,tyre.path,3);populated++;rows.push(importedRow('Pressure temperature gain',ptg,tyre.path));}
   const frontSecs=Object.keys(t).filter(k=>/^FRONT(_\d+)?$/.test(k)).sort((a,b)=>(Number(a.split('_')[1]||0)-Number(b.split('_')[1]||0)));
   ["cSoft","cMedium","cHard","cInter","cWet"].forEach(id=>$(id).checked=false);
   const found=[];
   const existingSuppliers=detectSuppliers(tyre.text);
   if(existingSuppliers.length) rows.push(importedRow('Existing tyre-file supplier clue',existingSuppliers.join(' / '),tyre.path));
   frontSecs.forEach((sec,i)=>{const rear=sectionForIndex('REAR',i);const f=t[sec]||{}, r=t[rear]||{};const cls=classifyCompound(f.NAME,f.TYPE_HINT,f.SHORT_NAME);const name=f.NAME||`Compound ${i}`;found.push(name);
     if(cls){
       const ids={soft:['cSoft','pSF','pSR'],medium:['cMedium','pMF','pMR'],hard:['cHard','pHF','pHR'],intermediate:['cInter','pIF','pIR'],wet:['cWet','pWF','pWR']}[cls];
       $(ids[0]).checked=true;
       const pf=numIni(f,'PRESSURE_STATIC'),pr=numIni(r,'PRESSURE_STATIC');
       importedPressureReference[cls]={front:pf,rear:pr,source:tyre.path};
       if(pf!==null||pr!==null) rows.push(importedRow(`${compDefs[cls].name} existing AC cold-pressure reference`,`${pf!==null?pf.toFixed(1):"-"} F / ${pr!==null?pr.toFixed(1):"-"} R psi`,tyre.path));
     }
   }); rows.push(importedRow('Existing compounds',found.join(', ')||'none detected',tyre.path));
   const type=`${F?.TYPE_HINT||''} ${F?.NAME||''}`.toLowerCase();
   // TYPE_HINT=SLICK does not prove radial construction. Only explicit construction
   // clues are marked direct; otherwise historical research is allowed to resolve it.
   if(/vintage|bias|cross/.test(type)){$('construction').value='bias';markImported('construction',tyre.path);}
   else if(/\bradial\b/.test(type)){$('construction').value='radial';markImported('construction',tyre.path);}
   if(!["cSoft","cMedium","cHard","cInter","cWet"].some(id=>$(id).checked)) $("cMedium").checked=true;
   updateHistoricalCompoundLabels();
 }
 const setup=fileByBase(files,'setup.ini'); if(setup){const s=parseIniText(setup.text); const pressureSecs=Object.keys(s).filter(k=>/PRESSURE|TYRE|TIRE/.test(k)); if(pressureSecs.length) rows.push(importedRow('Setup pressure controls',pressureSecs.slice(0,10).join(', '),setup.path));}
 const acd=Object.keys(files).some(k=>basename(k)==='data.acd'); if(acd) notes.push('data.acd was found. Tire Lab cannot decode encrypted/packed ACD data; include the unpacked data folder or a ZIP containing the loose physics files.');
 const lutCount=Object.keys(files).filter(k=>/\.lut$/i.test(k)).length; const iniCount=Object.keys(files).filter(k=>/\.ini$/i.test(k)).length;
 rows.push(importedRow('Physics files read',`${iniCount} INI / ${lutCount} LUT`,label));
 $('importSummary').innerHTML=`<table class="import-table"><tbody>${rows.join('')}</tbody></table>${notes.length?`<ul>${notes.map(x=>`<li class="warning">${escapeHtml(x)}</li>`).join('')}</ul>`:''}`;
 if(!$('car').value){
   const fallback=normalizeCarName(String(label||'').replace(/\.zip$/i,''));
   if(fallback && !/selected folder|abs_control/i.test(fallback)) setResearched('car',fallback,'ZIP/folder name');
 }
 $('importStatus').innerHTML=`<span class="ok"><b>Imported.</b></span> ${populated} direct Tire Lab values populated. Car/year identity is separated from historical class/supplier selection.`;
 updateOutputName();
 refreshSolvedPressures();
 // Rebuild preview immediately using imported values.
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 if($('car').value && applyCuratedKnowledgeProfile(false)){
   $('researchStatus').innerHTML=`<span class="ok"><b>Car identified + curated knowledge applied:</b></span> ${escapeHtml(v('car'))}${v('year')?`, ${escapeHtml(v('year'))}`:''}.`;
 } else if(!$('year').value && $('car').value) setTimeout(()=>identifyImportedYear(),80);
 else if($('car').value) $('researchStatus').innerHTML=`<span class="ok"><b>Car identified:</b></span> ${escapeHtml(v('car'))}${v('year')?`, ${escapeHtml(v('year'))}`:''}. Class and supplier remain General/Unknown until researched.`;
}
async function doZipImport(){const f=$('physicsZip').files?.[0]; if(!f){$('importStatus').innerHTML='<span class="warning">Choose a ZIP first.</span>';return;} $('importStatus').textContent='Reading ZIP…'; try{populateFromPhysics(await readZipPhysics(f),f.name);}catch(e){$('importStatus').innerHTML=`<span class="error">${escapeHtml(e.message)}</span>`;}}
async function doFolderImport(){const fs=$('physicsFolder').files; if(!fs?.length){$('importStatus').innerHTML='<span class="warning">Choose a data/car folder first.</span>';return;} $('importStatus').textContent='Reading folder…'; try{populateFromPhysics(await readFolderPhysics(fs),'selected folder');}catch(e){$('importStatus').innerHTML=`<span class="error">${escapeHtml(e.message)}</span>`;}}
$('importZip').addEventListener('click',doZipImport);$('importFolder').addEventListener('click',doFolderImport);
$('researchProfile').addEventListener('click',()=>researchHistoricalProfile());
$('applyResearchChoice').addEventListener('click',applyResearchChoices);
$('clearImport').addEventListener('click',()=>{importedPhysics={};clearImportedMarks();clearResearchChoices();activeHistoricalContext=null;$('preset').value='auto';updateHistoricalCompoundLabels();renderHistoricalFamilySummary();$('importSummary').innerHTML='';$('importStatus').textContent='No car physics imported yet.';$('researchStatus').textContent='Class / supplier research has not run yet.';$('researchSources').innerHTML='';});

// PWA install flow. Works because the packaged app is served from localhost by the installer.
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installPwa').hidden=false;});
$('installPwa').addEventListener('click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installPwa').hidden=true;}else{alert('If the install prompt is not available, use your browser menu: Apps → Install ACLM Historical Tire Lab (Edge) or Install app (Chrome).');}});
window.addEventListener('appinstalled',()=>{$('installPwa').hidden=true;$('serverState').textContent='Installed browser app';});
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

$("generate").addEventListener("click",()=>{
 updateOutputName();
 renderTireGraphs();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}
 catch(e){$("status").innerHTML=`<span class="error">${e.message}</span>`;$("validation").innerHTML="";$("downloadZip").disabled=true;}
});
$("downloadZip").addEventListener("click",()=>{
 const blob=zipStore(generatedFiles);const a=document.createElement("a");a.href=URL.createObjectURL(blob);
 a.download=currentExportZipName||makeOutputZipName(v("car"));a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
});
applyPreset("auto");
try{
  generatedFiles=build();
  const vr=validate(generatedFiles);
  renderValidation(vr);
  renderFiles(generatedFiles);
}catch(e){}

$("car").addEventListener("input",()=>{currentExportZipName="";updateOutputName();});
["terminalFailure","terminalNormalGrip","terminalFailureGrip","terminalFailureGap"].forEach(id=>{
 const el=$(id); if(el) el.addEventListener("change",()=>{
   try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 });
});
updateOutputName();


["pIdeal","pRefTemp"].forEach(id=>$(id).addEventListener("input",()=>{
 refreshSolvedPressures();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
}));
$("autoSolvePressure").addEventListener("change",()=>{
 refreshSolvedPressures();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
});
refreshSolvedPressures();

$("graphCompound").addEventListener("change",renderTireGraphs);
["cSoft","cMedium","cHard","cInter","cWet","terminalFailure","terminalNormalGrip","terminalFailureGrip","terminalFailureGap"].forEach(id=>{const el=$(id);if(el)el.addEventListener("change",renderTireGraphs);});
window.addEventListener("resize",()=>{clearTimeout(window.__aclmGraphResize);window.__aclmGraphResize=setTimeout(renderTireGraphs,120);});
setTimeout(renderTireGraphs,50);

const ACLM_APP_VERSION="0.6.0";
const ACLM_RELEASES_URL="https://github.com/aclmproject/tire_lab/releases";
let availableUpdate=null;
let onlineRequestActive=false;
function semverParts(v){return String(v||"0").replace(/^v/i,"").split(".").map(x=>parseInt(x,10)||0);}
function isNewerVersion(a,b){const A=semverParts(a),B=semverParts(b),n=Math.max(A.length,B.length);for(let i=0;i<n;i++){const x=A[i]||0,y=B[i]||0;if(x>y)return true;if(x<y)return false;}return false;}
async function checkForUpdates(silent=false){
 const status=$("updateStatus"),pageBtn=$("installUpdate"),checkBtn=$("checkUpdates");
 if(onlineRequestActive){status.innerHTML='<span class="warning"><b>Another online check is already running.</b></span> Please wait or use the release-page button.';return;}
 onlineRequestActive=true;
 checkBtn.disabled=true;
 pageBtn.disabled=false;
 availableUpdate=null;
 if(!silent)status.textContent="Checking the verified ACLM release manifest…";
 try{
   const r=await fetch("/api/update-info?ts="+Date.now(),{cache:"no-store"});
   const data=await r.json();
   if(!r.ok||data.error)throw new Error(data.error||("HTTP "+r.status));
   availableUpdate=data;
   if(data.warning){
     const cached=data.cached&&data.version?(" Cached manifest reports v"+escapeHtml(data.version)+"."):"";
     status.innerHTML='<span class="warning"><b>Online update check unavailable:</b></span> '+escapeHtml(data.warning)+cached+' The release page remains available.';
   }else if(isNewerVersion(data.version,ACLM_APP_VERSION)){
     status.innerHTML='<span class="warning"><b>Update available: v'+escapeHtml(data.version)+'</b></span> — installed v'+ACLM_APP_VERSION+(data.notes?("<br>"+escapeHtml(data.notes)):"");
   }else{
     status.innerHTML='<span class="ok"><b>Up to date.</b></span> Installed v'+ACLM_APP_VERSION+'; stable channel v'+escapeHtml(data.version||ACLM_APP_VERSION)+'.';
   }
 }catch(e){
   status.innerHTML='<span class="warning"><b>Update check unavailable:</b></span> '+escapeHtml(e.message)+' The release page remains available.';
 }finally{
   onlineRequestActive=false;
   checkBtn.disabled=false;
   pageBtn.disabled=false;
 }
}
function installAvailableUpdate(){
 const url=availableUpdate?.release_page||availableUpdate?.updates_folder||ACLM_RELEASES_URL;
 window.open(url,"_blank","noopener");
 $("updateStatus").innerHTML='<span class="ok"><b>Release page opened.</b></span> Download and run the installer manually.';
}
$("checkUpdates").addEventListener("click",()=>checkForUpdates(false));
$("installUpdate").disabled=false;
$("installUpdate").addEventListener("click",installAvailableUpdate);

function updateKnowledgeUi(message=""){
 const info=window.ACLMHistoricalCategories?.knowledgeInfo?.()||{};
 const build=$("knowledgeBuild"),schema=$("knowledgeSchema"),status=$("knowledgeStatus");
 if(build)build.textContent=`v${info.version||"?"}`;
 if(schema)schema.textContent=String(info.schemaVersion||"?");
 if(status&&message)status.innerHTML=message;
 const preset=$("preset"),selected=preset?.value||"";
 populateHistoricalCategoryOptions();
 if(preset&&selected&&[...preset.options].some(o=>o.value===selected))preset.value=selected;
 populateSeriesClassOptions();
 populateSupplierOptions();
 renderHistoricalFamilySummary();
}

async function loadCurrentKnowledge(){
 try{
   const r=await fetch("/api/knowledge-current?ts="+Date.now(),{cache:"no-store"});const data=await r.json();
   if(!r.ok||data.error)throw new Error(data.error||("HTTP "+r.status));
   window.ACLMHistoricalCategories.loadKnowledgeRelease(data.release,data.source||"local cache");
   updateKnowledgeUi(`<span class="ok"><b>Knowledge loaded:</b></span> v${escapeHtml(data.release.releaseVersion||"?")} from ${escapeHtml(data.source||"cache")}.`);
 }catch(e){updateKnowledgeUi(`<span class="warning"><b>Using bundled knowledge v1.2.0.</b></span> Local cache unavailable: ${escapeHtml(e.message)}`);}
}
async function syncKnowledge(force=false){
 const st=$("knowledgeStatus"),checkBtn=$("checkKnowledge"),syncBtn=$("syncKnowledge");
 if(onlineRequestActive){st.innerHTML='<span class="warning"><b>Another online check is already running.</b></span> Verified cached knowledge remains active.';return;}
 onlineRequestActive=true;
 checkBtn.disabled=true;
 syncBtn.disabled=true;
 st.textContent=force?"Synchronizing the latest verified ACLM tire knowledge…":"Checking the ACLM knowledge manifest…";
 try{
   const r=await fetch("/api/knowledge-sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({force})});
   const data=await r.json();if(!r.ok||data.error)throw new Error(data.error||("HTTP "+r.status));
   window.ACLMHistoricalCategories.loadKnowledgeRelease(data.release,data.source||"verified knowledge");
   updateKnowledgeUi('<span class="ok"><b>Knowledge '+(data.updated?"synchronized":"checked")+':</b></span> v'+escapeHtml(data.release.releaseVersion||"?")+' · schema '+escapeHtml(data.release.schemaVersion||"?")+' · '+(data.updated?"new cache installed":"verified cache is current")+'.');
 }catch(e){
   const loaded=escapeHtml($("knowledgeBuild")?.textContent||"current");
   st.innerHTML='<span class="warning"><b>Online knowledge check unavailable:</b></span> '+escapeHtml(e.message)+' Verified '+loaded+' cached/bundled knowledge remains active.';
 }finally{
   onlineRequestActive=false;
   checkBtn.disabled=false;
   syncBtn.disabled=false;
 }
}
$("checkKnowledge").addEventListener("click",()=>syncKnowledge(false));
$("syncKnowledge").addEventListener("click",()=>syncKnowledge(true));
setTimeout(loadCurrentKnowledge,250);
