"use strict";
const $ = id => document.getElementById(id);
const n = id => Number($(id).value);
const v = id => $(id).value.trim();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let generatedFiles={};
let importedPressureReference={};
let importedTireReference={};
let importedSetupPressureControls={};
let lastThermalCalibrations=[];

const BASE_LAT=[1.98,1.88317305,1.7833464,1.68138135,1.5781392,1.47448125,1.3712688,1.26936315,1.1696256,1.07291745,0.9801,0.89203455,0.8095824,0.73360485,0.6649632,0.60451875];
const BASE_LON=[1.9404,1.846916379,1.753112592,1.659541653,1.566756576,1.475310375,1.385756064,1.298646657,1.214535168,1.133974611,1.057518,0.985718349,0.919128672,0.858301983,0.803791296,0.756149625];

let activeHistoricalContext=null;
let historicalProfileState=window.ACLMProfileState.create($("construction")?.value||"radial",window.ACLMProfileState.PROVENANCE.UNKNOWN_FALLBACK,$("supplier")?.value||"General / unknown");
function constructionProvenance(){return historicalProfileState.construction;}
function supplierProvenance(){return historicalProfileState.supplier;}
function renderConstructionProvenance(){
 const p=constructionProvenance(),el=$("constructionProvenance");
 if(el)el.textContent=`Provenance: ${p.provenance} · ${(p.sourceIds||[]).join(", ")||"no source ID"} · ${p.confidence||"unresolved"}`;
}
function renderSupplierProvenance(){const p=supplierProvenance(),el=$("supplierProvenance");if(el)el.textContent=`Provenance: ${p.provenance} · ${(p.sourceIds||[]).join(", ")||"no source ID"} · ${p.confidence||"unresolved"}`;}
function setConstructionWithProvenance(value,provenance,details={}){
 window.ACLMProfileState.setConstruction(historicalProfileState,value,provenance,details);$("construction").value=historicalProfileState.construction.value;renderConstructionProvenance();
}
function currentHistoricalCoherence(compound=null){
 const directSourceIds=ids=>ids.map(id=>$(id)).filter(el=>el?.classList.contains("imported-field")).map(el=>el.title?.replace(/^Imported from\s*/i,"")||"imported AC package");
 return window.ACLMProfileState.validate(historicalProfileState,activeHistoricalContext,{year:n("year")||null,supplier:v("supplier"),compound,allowAnachronisticOverride:$("allowAnachronisticOverride")?.checked===true,geometry:{front:{width:n("fw"),radius:n("fr"),rimRadius:n("frr")},rear:{width:n("rw"),radius:n("rr"),rimRadius:n("rrr")}},thermalConstruction:v("construction"),carIdentitySourceIds:directSourceIds(["car","year"]),geometrySourceIds:directSourceIds(["fw","fr","frr","rw","rr","rrr"]),pressureEvidenceStatus:activeHistoricalContext?.familyId==="FAM023"?window.ACLMProfileState.EVIDENCE_STATUS.PROVISIONAL:undefined,pressureSourceIds:activeHistoricalContext?.familyId==="FAM023"?["ESCORT-RS1600-BRANDS-LIVE-V0101-003"]:[]});
}
function renderHistoricalCoherence(){
 const result=currentHistoricalCoherence(),el=$("historicalCoherenceStatus");if(!el)return result;
 const conflicts=result.issues.map(x=>`${x.code}: ${x.message}`).join(" ");
 el.className=`notice small ${result.pass?(result.issues.length?"warning":"ok"):"error"}`;el.innerHTML=`<b>${escapeHtml(result.title)}</b> — compatibility check only.${conflicts?` ${escapeHtml(conflicts)}`:""}`;
 const evidence=$("historicalEvidenceStatus");if(evidence){const gaps=Object.entries(result.evidence?.categories||{}).filter(([,x])=>x.status!==window.ACLMProfileState.EVIDENCE_STATUS.DIRECTLY_SOURCED).map(([k,x])=>`${k}: ${x.status}`).join(" · ");evidence.className="notice small warning";evidence.innerHTML=`<b>HISTORICAL EVIDENCE STATUS: ${escapeHtml(result.historicalEvidenceStatus)}</b>${gaps?`<br>${escapeHtml(gaps)}`:""}`;}
 return result;
}

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
const COMPOUND_NAME_FIELDS=Object.freeze({
 soft:Object.freeze({name:"compoundNameSoft",short:"compoundShortSoft"}),
 medium:Object.freeze({name:"compoundNameMedium",short:"compoundShortMedium"}),
 hard:Object.freeze({name:"compoundNameHard",short:"compoundShortHard"}),
 intermediate:Object.freeze({name:"compoundNameIntermediate",short:"compoundShortIntermediate"}),
 wet:Object.freeze({name:"compoundNameWet",short:"compoundShortWet"})
});
function cleanCompoundText(raw,maxLength,shortCode){
 let text=String(raw||"").replace(/[\r\n=;\[\]]/g," ").replace(/\s+/g," ").trim();
 if(shortCode)text=text.replace(/[^A-Za-z0-9_-]/g,"").toUpperCase();
 return text.slice(0,maxLength);
}
const COMPOUND_NAME_DEFAULTS=Object.freeze({
 soft:Object.freeze({name:"Soft",short:"S"}),
 medium:Object.freeze({name:"Medium",short:"M"}),
 hard:Object.freeze({name:"Hard",short:"H"}),
 intermediate:Object.freeze({name:"Intermediate",short:"I"}),
 wet:Object.freeze({name:"Wet",short:"W"})
});
function automaticCompoundDisplayName(comp){return historicalSlot(comp)?.name||COMPOUND_NAME_DEFAULTS[comp]?.name||comp;}
function automaticCompoundShortName(comp){const x=historicalSlot(comp);return x?shortForHistoricalName(x.name,comp):(COMPOUND_NAME_DEFAULTS[comp]?.short||comp.slice(0,1).toUpperCase());}
function compoundDisplayName(comp){
 const id=COMPOUND_NAME_FIELDS[comp]?.name,custom=id&&$(id)?cleanCompoundText($(id).value,48,false):"";
 return custom||automaticCompoundDisplayName(comp);
}
function compoundShortName(comp){
 const id=COMPOUND_NAME_FIELDS[comp]?.short,custom=id&&$(id)?cleanCompoundText($(id).value,5,true):"";
 return custom||automaticCompoundShortName(comp);
}
function refreshCompoundNameEditor(){
 for(const comp of Object.keys(COMPOUND_NAME_FIELDS)){
  const ids=COMPOUND_NAME_FIELDS[comp],name=$(ids.name),short=$(ids.short);
  if(name)name.placeholder="Auto: "+automaticCompoundDisplayName(comp);
  if(short)short.placeholder="Auto: "+automaticCompoundShortName(comp);
 }
}
function clearCompoundNameOverrides(){
 for(const ids of Object.values(COMPOUND_NAME_FIELDS)){if($(ids.name))$(ids.name).value="";if($(ids.short))$(ids.short).value="";}
 refreshCompoundNameEditor();renderTireGraphs();refreshLoadDutyStatus();
}
function historicalLifeEvidence(comp){const x=historicalSlot(comp);return x?window.ACLMWearModel.migrateLife(x,{sourceRefs:[activeHistoricalContext?.familyId,activeHistoricalContext?.classId].filter(Boolean)}):null;}
function historicalLifeKm(comp){const x=historicalLifeEvidence(comp);if(!x)return null;if(Number.isFinite(Number(x.competitiveLifeKm)))return Number(x.competitiveLifeKm);if(x.lifeDefinition==="PROVISIONAL_GENERATOR_PRIOR"&&Array.isArray(x.lifeRangeKm)&&x.lifeRangeKm.length)return Number(historicalSlot(comp)?.lifeKm);return null;}
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
 refreshCompoundNameEditor();
}
function renderHistoricalFamilySummary(extra=""){
 const el=$("historicalFamilySummary");if(!el)return;
 if(!activeHistoricalContext){
   el.innerHTML=`<b>Historical category:</b> unresolved. Research or choose a family. Tire Lab will preserve manual compound choices until a category is resolved.${extra?` ${escapeHtml(extra)}`:""}`;
   return;
 }
 const c=activeHistoricalContext;
 const menu=(c.menu||[]).map(x=>`${x.name}${x.lifeKm?` ~${x.lifeKm} km`:""}`).join(" · ");
 const intended=window.ACLMProfileState.familyConstruction(c),construction=intended.value?(intended.value==="bias"?"bias/cross-ply":"radial"):(c.construction==="mixed"?"mixed/transition — review exact supplier/car":"unresolved");
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
 const applied=window.ACLMProfileState.applyContext(historicalProfileState,ctx,source);
 if(applied.constructionChanged){$("construction").value=historicalProfileState.construction.value;$("construction").classList.remove("imported-field");markResearched("construction",source);}
 if(applied.supplierChanged){setMenuValue("supplier",historicalProfileState.supplier.value);$("supplier").classList.remove("imported-field","researched-field");}
 renderConstructionProvenance();renderSupplierProvenance();renderHistoricalCoherence();
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
     if(!$("axleIdealPressure")?.checked){$("pIdealF").value=$("pIdeal").value;$("pIdealR").value=$("pIdeal").value;}
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
 if(!ctx){activeHistoricalContext=null;window.ACLMProfileState.applyContext(historicalProfileState,null,source);renderConstructionProvenance();renderHistoricalCoherence();updateHistoricalCompoundLabels();renderHistoricalFamilySummary("No class/family match was strong enough; manual review required.");return false;}
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
    activeHistoricalContext=null;setConstructionWithProvenance(v("construction"),window.ACLMProfileState.PROVENANCE.USER_EXPLICIT_OVERRIDE,{reason:"manual historical mode selected",confidence:"explicit user choice"});updateHistoricalCompoundLabels();renderHistoricalFamilySummary("Manual mode: current checkboxes and construction are preserved.");renderHistoricalCoherence();return;
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

$("preset").addEventListener("change",e=>{applyPreset(e.target.value);populateSeriesClassOptions();renderHistoricalCoherence();});
$("series").addEventListener("change",()=>{clearMenuProvenance("series");applySeriesMenuSelection();refreshMenuDrivenOutput();});
$("supplier").addEventListener("change",()=>{clearMenuProvenance("supplier");window.ACLMProfileState.setSupplier(historicalProfileState,v("supplier"),window.ACLMProfileState.PROVENANCE.USER_EXPLICIT_OVERRIDE,{reason:"user changed supplier control",confidence:"explicit user choice"});renderSupplierProvenance();if(activeHistoricalContext)applyHistoricalContext(activeHistoricalContext,"supplier profile changed");refreshMenuDrivenOutput();});
$("construction").addEventListener("change",()=>{setConstructionWithProvenance(v("construction"),window.ACLMProfileState.PROVENANCE.USER_EXPLICIT_OVERRIDE,{reason:"user changed construction control",confidence:"explicit user choice"});renderHistoricalCoherence();refreshMenuDrivenOutput();});
$("year").addEventListener("change",()=>{if($("preset").value==="auto")autoApplyHistoricalContext("year changed");else if(activeHistoricalContext)applyHistoricalContext(activeHistoricalContext,"year changed");populateSeriesClassOptions();renderHistoricalCoherence();refreshMenuDrivenOutput();});
$("allowAnachronisticOverride")?.addEventListener("change",()=>{renderHistoricalCoherence();refreshMenuDrivenOutput();});
$("reset").addEventListener("click",()=>{applyPreset($("preset").value);populateSeriesClassOptions();populateSupplierOptions();});
for(const ids of Object.values(COMPOUND_NAME_FIELDS)){
 for(const id of [ids.name,ids.short]){const el=$(id);if(el)el.addEventListener("input",()=>{el.value=cleanCompoundText(el.value,id===ids.short?5:48,id===ids.short);refreshCompoundNameEditor();renderTireGraphs();refreshLoadDutyStatus();});}
}
$("resetCompoundNames")?.addEventListener("click",clearCompoundNameOverrides);
refreshCompoundNameEditor();

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
   const crossing=window.ACLMWearModel.crossingAtGrip(pts,lifeThreshold);
   const baseLifeX=crossing.x;
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
function idealPressure(axle){
 const split=$("axleIdealPressure")?.checked===true;
 return split?n(axle==="front"?"pIdealF":"pIdealR"):n("pIdeal");
}
function optionalNumber(id){const text=String($(id)?.value??"").trim(),value=Number(text);return text!==""&&Number.isFinite(value)?value:undefined;}
function setupPressureControl(axle){return importedSetupPressureControls?.[axle]||null;}
function pressureModelOptions(comp,axle){
 const front=axle==="front",width=n(front?"fw":"rw"),radius=n(front?"fr":"rr"),rimRadius=n(front?"frr":"rrr");
 const prior=activeFamilyPrior(),physical=window.ACLMThermalV2?.estimatePhysical({width,radius,rimRadius,construction:v("construction"),treaded:compoundTypeHint(comp)!=="SLICK",treadDepth:comp==="wet"?.0075:comp==="intermediate"?.0035:undefined});
 return {
  familyId:activeHistoricalContext?.familyId||null,axle,idealPsi:idealPressure(axle),ambientAirC:n("pRefTemp"),referenceColdC:n("pRefTemp"),referenceSetupTemperatureC:optionalNumber("pInitialCore"),referenceDriver:v("pReferenceDriver")||window.ACLMPressure.REFERENCE_DRIVER.UNKNOWN,setupPressureControl:setupPressureControl(axle),selectedSetupPressurePsi:optionalNumber(axle==="front"?"pSelectedF":"pSelectedR"),legacyTargetHotC:targetTempForCompound(comp),targetHotC:targetTempForCompound(comp),trackDutyFactor:n("pReferenceDuty")||1,
  referenceDuty:{familyId:activeHistoricalContext?.familyId||null,classId:activeHistoricalContext?.classId||null,driver:v("pReferenceDriver")||window.ACLMPressure.REFERENCE_DRIVER.UNKNOWN,trackDuty:"reference axle calibration duty; not every circuit or left/right corner",compound:comp,axle},
  inputs:{widthM:width,radiusM:radius,rimRadiusM:rimRadius,estimatedInternalAirVolumeM3:physical?.internalVolume??null,vehicleMassKg:n("mass"),axleLoadN:fz0(axle)*2,referenceTireLoadN:fz0(axle),rateNPerM:n(front?"rateF":"rateR"),construction:v("construction"),compound:comp,flex:prior&&dryCompound(comp)?Number(prior.flex):compDefs[comp].flex,carcassRollingK:prior&&dryCompound(comp)?Number(prior.rollingK):compDefs[comp][front?"thF":"thR"].roll,trackDutyFactor:n("pReferenceDuty")||1}
 };
}
function solvedPressureModel(comp,axle){
 if(!window.ACLMPressure)return null;
 return window.ACLMPressure.solveRecommendedColdPsi(pressureModelOptions(comp,axle));
}
function solvedColdPressure(comp,axle){
 return solvedPressureModel(comp,axle)?.recommendedColdPsi;
}
function pressure(comp,axle){
 const p=compDefs[comp].p;
 if($("autoSolvePressure")?.checked){
   const solved=solvedColdPressure(comp,axle);
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
     const front=solvedPressureModel(comp,"front"),rear=solvedPressureModel(comp,"rear");
     if(Number.isFinite(front?.recommendedColdPsi)&&Number.isFinite(rear?.recommendedColdPsi)){
       $(ids[0]).value=front.recommendedColdPsi.toFixed(1);$(ids[1]).value=rear.recommendedColdPsi.toFixed(1);ids.forEach(id=>$(id).readOnly=true);
       const fq=front.setupQuantization, rq=rear.setupQuantization;
       details.push(`${compDefs[comp].name}: continuous ${front.recommendedColdPsi.toFixed(1)} F / ${rear.recommendedColdPsi.toFixed(1)} R psi${fq?.control?.step?`; setup-achievable ${fq.achievablePsi.toFixed(1)} / ${rq.achievablePsi.toFixed(1)} psi at ${fq.control.step} psi steps`:"; setup quantization unknown"} -> ${front.predictedHotPsi.toFixed(1)} / ${rear.predictedHotPsi.toFixed(1)} hot; initial core reference ${front.referenceColdC.toFixed(1)} / ${rear.referenceColdC.toFixed(1)} C (${front.initialThermalState.source}); contained-air ${front.predictedContainedAirC.toFixed(1)} / ${rear.predictedContainedAirC.toFixed(1)} C`);
     }
   }else{
     ids.forEach(id=>$(id).readOnly=false);
   }
 }
 const status=$("pressureSolveStatus");
 if(status){
   if(auto){
     status.innerHTML=`<b>Auto pressure solve active.</b> Ambient, AC initial core, contained-air hot estimate, setup-reference temperature and tread optimum are separate states. The tread grip-curve optimum is not used as gas temperature. ${escapeHtml(details.join(" | "))}${importedPressureSummary()?`<br><b>Imported AC PRESSURE_STATIC reference only:</b> ${escapeHtml(importedPressureSummary())}`:""}<br><b>Track-specific per-corner tuning:</b> produced only after telemetry; it is not hard-coded into tyres.ini.`;
   }else{
     status.innerHTML=`<b>Manual cold-pressure mode.</b> Tire Lab will use the F/R values shown above. ${importedPressureSummary()?`Imported AC reference: ${escapeHtml(importedPressureSummary())}`:""}`;
   }
 }
}
function pressureClosureManifest(compounds){
 const entries=[];
 for(const comp of compounds)for(const axle of ["front","rear"]){
  const options=pressureModelOptions(comp,axle),model=solvedPressureModel(comp,axle),staticPsi=Number(pressure(comp,axle).toFixed(1));
  entries.push({compound:comp,axle,...window.ACLMPressure.pressureReport({...options,staticPsi,model})});
 }
 return {schema:"ACLM pressure closure report 4.1",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,car:v("car"),year:n("year")||null,series:v("series"),concepts:{acPhysicsReference:"PRESSURE_STATIC in tyres.ini",continuousRecommendation:"reference-duty axle calculation before setup control rounding",achievableSetupCold:"continuous recommendation quantized through imported setup.ini MIN/MAX/STEP when available",setupDefault:"DEFAULT in imported setup.ini when present",setupSelected:"actual AC/Content Manager setup selection when provided; persisted last.ini can override a generated recommendation",observedSessionStart:"recorded AC shared-memory pressure; authoritative for a live run",historicalDesiredHot:"PRESSURE_IDEAL, optionally axle-specific",trackSpecificCornerTuning:"post-run Validation Workspace recommendation; never hard-coded into tyres.ini"},globalThermalRetune:false,pressureFormula:"P2_abs = P1_abs × (T2_air/T1_air) × (V1/V2)",decision:"setup recommendation, grid, default, selected value and observed initial state are reported independently; global thermal, wear and historical numerical priors remain frozen",closureThresholdsPsi:{pass:"absolute hot error <= 0.5",review:"absolute hot error > 0.5 and <= 1.5",fail:"absolute hot error > 1.5"},entries};
}
function fz0(axle){
 const m=n("mass"), fw=n("frontWeight")/100, factor=n("fzFactor");
 const raw=m*9.80665*(axle==="front"?fw:(1-fw))/2*factor;
 const ov=n(axle==="front"?"fzF":"fzR");
 return Math.round(ov>0?ov:raw);
}
const LOAD_DUTY_PRIORS=Object.freeze({
 light:Object.freeze({label:"Light",cool:0.88,friction:1.08}),
 medium:Object.freeze({label:"Medium",cool:1.00,friction:1.00}),
 heavy:Object.freeze({label:"Heavy",cool:1.06,friction:0.96})
});
function loadDuty(axle){
 const widthMm=n(axle==="front"?"fw":"rw")*1000;
 const loadN=fz0(axle);
 const intensity=widthMm>0?loadN/widthMm:NaN;
 const key=Number.isFinite(intensity)?(intensity<9?"light":intensity<=13?"medium":"heavy"):"medium";
 return {axle,key,label:LOAD_DUTY_PRIORS[key].label,intensity,widthMm,loadN,...LOAD_DUTY_PRIORS[key]};
}
function applyLoadDutyThermal(base,axle){
 const duty=loadDuty(axle);
 return {...base,fric:clamp(Number(base.fric)*duty.friction,0.001,0.5),cool:clamp(Number(base.cool)*duty.cool,0.10,10),duty};
}
function loadDutySummary(){
 return ["front","rear"].map(axle=>{
  const d=loadDuty(axle);
  return (axle==="front"?"F":"R")+" "+d.label.toLowerCase()+" "+(Number.isFinite(d.intensity)?d.intensity.toFixed(2):"?")+" N/mm";
 }).join(" | ");
}
function compoundDutyAssessment(comp){
 const duties=["front","rear"].map(loadDuty),keys=duties.map(d=>d.key),notes=[];
 let level="pass";
 if(activeHistoricalContext){
  if(!historicalSlot(comp)){level="block";notes.push("not present in the selected historical series/class menu");}
  else notes.push("present in the selected historical series/class menu");
 }else{level="review";notes.push("series/class menu unresolved or manual");}
 if(comp==="soft"&&keys.includes("heavy")){if(level!=="block")level="caution";notes.push("heavy axle duty can overheat or shorten a sprint/qualifying tire");}
 else if(comp==="hard"&&keys.every(k=>k==="light")){if(level!=="block")level="caution";notes.push("light duty can leave an endurance/hard tire below its working window");}
 else if(comp==="medium")notes.push("race/control baseline; verify balance and stint temperature");
 else if(comp==="soft")notes.push("warm-up favorable at this static load proxy; verify peak temperature and wear");
 else if(comp==="hard")notes.push("load proxy is not an automatic compound recommendation");
 if(comp==="intermediate"||comp==="wet")notes.push("surface water and tread cooling dominate any weight-only recommendation");
 if(keys[0]!==keys[1]){if(level==="pass")level="review";notes.push("front/rear duty bands differ; inspect axle temperature balance");}
 const target=targetTempForCompound(comp);
 if(Number.isFinite(target))notes.push("generated target approximately "+target.toFixed(0)+" C");
 return {comp,level,notes,duties};
}
function loadCompoundChecklistLines(comps=selectedCompounds()){
 const ctx=activeHistoricalContext?(activeHistoricalContext.classId?activeHistoricalContext.classId+" - "+activeHistoricalContext.className:activeHistoricalContext.familyId+" - "+activeHistoricalContext.familyName):"unresolved/manual";
 const lines=[
  "ACLM LOAD / COMPOUND SUITABILITY CHECKLIST",
  "Generated by Tire Lab v"+ACLM_APP_VERSION,
  "",
  "[x] Car mass and static front weight entered: "+n("mass").toFixed(0)+" kg / "+n("frontWeight").toFixed(1)+"% front.",
  "[x] FZ0 and tread width evaluated by axle: "+loadDutySummary()+".",
  "[x] Historical series/class context: "+ctx+".",
  "[x] Selected compounds use the series menu when that context is resolved.",
  "[x] Thermal heat/cooling scaling is applied independently to front and rear.",
  "[ ] Confirm track energy, ambient and surface temperature, pressure, camber and stint length.",
  "[ ] Validate core/surface temperatures and wear with telemetry before certification.",
  "",
  "COMPOUND ASSESSMENTS"
 ];
 for(const comp of comps){
  const a=compoundDutyAssessment(comp);
  lines.push("- "+compoundDisplayName(comp)+" ["+a.level.toUpperCase()+"]: "+a.notes.join("; ")+".");
 }
 lines.push("","LIMITATION: car weight is only one load input. This checklist is a transparent simulation reconstruction aid, not proof of a supplier's historical compound prescription.");
 return lines;
}
function loadCompoundChecklistText(comps=selectedCompounds()){return loadCompoundChecklistLines(comps).join("\n")+"\n";}
function renderCompoundLoadChecklist(){
 const el=$("loadCompoundChecklist");if(!el)return;
 const comps=selectedCompounds();
 if(!comps.length){el.innerHTML="<b>Compound/load checklist:</b> select at least one compound.";return;}
 const rows=comps.map(comp=>{const a=compoundDutyAssessment(comp);return "<li><b>"+escapeHtml(compoundDisplayName(comp))+" — "+escapeHtml(a.level.toUpperCase())+":</b> "+escapeHtml(a.notes.join("; "))+"</li>";}).join("");
 el.innerHTML="<b>Compound/load checklist</b><ul>"+rows+"</ul><span class=\"muted\">Weight and FZ0/tread-width duty are screening inputs only. Final selection still requires track, ambient, setup, stint and telemetry validation.</span>";
}
function refreshLoadDutyStatus(){
 const el=$("loadDutyStatus");
 if(el)el.innerHTML="<b>Thermal load duty:</b> "+escapeHtml(loadDutySummary())+". Thresholds (&lt;9 light, 9-13 medium, &gt;13 heavy N/mm) are transparent simulation reconstruction priors; the tire-family knowledge values remain unchanged.";
 renderCompoundLoadChecklist();
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
 const physicalEstimate=window.ACLMThermalV2?.estimatePhysical({width,radius:rad,rimRadius:rim,construction:v("construction"),treaded:type!=="SLICK",treadDepth:comp==="wet"?.0075:comp==="intermediate"?.0035:undefined});
 const inertia=(cspV2Enabled()?(physicalEstimate?.angularInertia??width*rad*(isF?15.0:15.5)):width*rad*(isF?15.0:15.5)).toFixed(3);
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
 `PRESSURE_IDEAL=${idealPressure(axle).toFixed(1)}`,
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
function cspV2Enabled(){return v("physicsMode")==="csp-v2";}
function vanillaThermalSection(comp,axle,index){
 const d=compDefs[comp],prior=activeFamilyPrior();let t=axle==="front"?d.thF:d.thR;
 if(prior&&dryCompound(comp))t={surf:Number(prior.surfaceTransfer),patch:Number(prior.patchTransfer),core:Number(prior.coreTransfer),internal:Number(prior.internalCoreTransfer),fric:Number(prior.frictionK),roll:Number(prior.rollingK),cool:Number(prior.cool),sroll:Number(prior.rollingK)*5.8};
 t=applyLoadDutyThermal(t,axle);const sec="THERMAL_"+(axle==="front"?"FRONT":"REAR")+(index===0?"":"_"+index);
 return `; ACLM v0.8.2-compatible vanilla load-duty reconstruction: ${t.duty.key}; ${t.duty.intensity.toFixed(2)} N/mm\n[${sec}]\nSURFACE_TRANSFER=${t.surf.toFixed(6)}\nPATCH_TRANSFER=${t.patch.toFixed(6)}\nCORE_TRANSFER=${t.core.toFixed(6)}\nINTERNAL_CORE_TRANSFER=${t.internal.toFixed(6)}\nFRICTION_K=${t.fric.toFixed(5)}\nROLLING_K=${t.roll.toFixed(5)}\nPERFORMANCE_CURVE=aclm_${comp}_tcurve.lut\nGRAIN_GAMMA=1.000\nGRAIN_GAIN=${comp==="soft"?.50:.35}\nBLISTER_GAMMA=1.000\nBLISTER_GAIN=${comp==="soft"?.50:.35}\nCOOL_FACTOR=${t.cool.toFixed(3)}\nSURFACE_ROLLING_K=${t.sroll.toFixed(4)}\n`;
}
function expectedSpeedKph(){
 const text=(v("series")+" "+v("car")).toLowerCase(),year=n("year")||1985;
 if(/formula|grand prix|\bf1\b|group c|gt1|le mans|prototype/.test(text))return year<1970?205:year<1990?255:285;
 if(/touring|saloon|group a|dtm|btcc/.test(text))return year<1970?155:205;
 if(/rally/.test(text))return 125;
 return year<1960?145:year<1985?185:225;
}
function importedDutyContext(){
 let traction="unknown",frontDisc=NaN,rearDisc=NaN;
 const drive=fileByBase(importedPhysics||{},"drivetrain.ini");
 if(drive){const ini=parseIniText(drive.text);traction=String(ini.TRACTION?.TYPE||ini.DRIVETRAIN?.TRACTION_TYPE||ini.DRIVETRAIN?.TYPE||"unknown").toLowerCase();}
 const brakes=fileByBase(importedPhysics||{},"brakes.ini");
 if(brakes){const ini=parseIniText(brakes.text);frontDisc=numIni(ini.FRONT,"DISC_RADIUS");rearDisc=numIni(ini.REAR,"DISC_RADIUS");}
 const fw=clamp(n("frontWeight")/100,.2,.8),frontBrakeDefault=clamp(fw+.14,.52,.80);
 const discTotal=Number.isFinite(frontDisc)&&Number.isFinite(rearDisc)?frontDisc*frontDisc+rearDisc*rearDisc:NaN;
 const frontBrake=Number.isFinite(discTotal)&&discTotal>0?clamp(frontDisc*frontDisc/discTotal,.35,.85):frontBrakeDefault;
 return {traction,drivenFront:/fwd|awd|four/.test(traction)?1:/rwd/.test(traction)?0:.5,drivenRear:/rwd|awd|four/.test(traction)?1:/fwd/.test(traction)?0:.5,frontBrake,rearBrake:1-frontBrake,source:drive?drive.path:"class/neutral drivetrain prior"};
}
function thermalInput(comp,axle){
 const front=axle==="front",d=compDefs[comp],prior=activeFamilyPrior(),duty=importedDutyContext();
 const width=n(front?"fw":"rw"),radius=n(front?"fr":"rr"),rimRadius=n(front?"frr":"rrr"),rate=n(front?"rateF":"rateR");
 const expectedLoad=n("mass")*9.80665*(front?n("frontWeight")/100:1-n("frontWeight")/100)/2;
 const rr0=prior&&dryCompound(comp)&&Number.isFinite(Number(prior.rr0))?Number(prior.rr0):(comp==="wet"?14:12);
 const rr1=prior&&dryCompound(comp)&&Number.isFinite(Number(prior.rr1))?Number(prior.rr1):(front?.00074:.00080);
 const family=activeHistoricalContext?.familyName||"manual / unresolved",className=activeHistoricalContext?.className||v("series")||GENERAL_UNKNOWN;
 const carcassMaterial=/nylon/i.test(family)?"nylon":/rayon/i.test(family)?"rayon":/aramid|kevlar/i.test(family)?"aramid":/steel/i.test(family)?"steel":"unknown";
 return {familyId:activeHistoricalContext?.familyId||null,classCalibrationId:activeHistoricalContext?.classId||null,family,className,compound:comp,axle,
  width,radius,rimRadius,rate,sidewallStiffness:d.side,fz0:fz0(axle),expectedLoad,vehicleMass:n("mass"),frontWeight:n("frontWeight"),
  drivenDuty:front?duty.drivenFront:duty.drivenRear,brakeExposure:front?duty.frontBrake:duty.rearBrake,drivetrainSource:duty.source,
  speedKph:expectedSpeedKph(),speedRangeKph:[0,expectedSpeedKph()],rollingResistance0:rr0,rollingResistance1:rr1,construction:v("construction"),carcassMaterial,beltConstruction:v("construction")==="radial"?"radial belt reconstruction prior":"bias-ply reconstruction prior",
  treaded:compoundTypeHint(comp)!=="SLICK",treadDepth:comp==="wet"?.0075:comp==="intermediate"?.0035:undefined,
  pressurePsi:pressure(comp,axle),idealHotPressurePsi:idealPressure(axle),optimumTemperatureC:targetTempForCompound(comp),era:n("year")||null,
  supplier:v("supplier"),confidence:reportConfidenceScore()/100,evidenceConfidence:reportConfidenceScore(),
  evidenceBasis:prior?"historical family generator prior + physical reconstruction":"class/manual physical reconstruction prior"};
}
function thermalSections(comp,axle,index){
 if(!window.ACLMThermalV2)throw new Error("CSP Thermal V2 calculator is unavailable.");
 const result=window.ACLMThermalV2.calculate(thermalInput(comp,axle));
 lastThermalCalibrations.push({compound:comp,axle,index,...result});
 const curve=`aclm_${comp}_tcurve.lut`;
 return window.ACLMThermalV2.renderLegacy(result,comp,axle,index,curve)+(cspV2Enabled()?"\n"+window.ACLMThermalV2.renderV2(result,axle,index):"");
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
 if($("autoSolvePressure")?.checked) out.push(`Generated cold pressures use an explicit AC initial-core state (${solvedPressureModel("medium","front")?.referenceColdC?.toFixed(1)??"unresolved"} deg C, ${solvedPressureModel("medium","front")?.initialThermalState?.source||"unresolved"}); ambient ${n("pRefTemp").toFixed(1)} deg C is retained separately and is not silently equated with tire core.`);
 else {
   const model=solvedPressureModel("medium","front"),predF=window.ACLMPressure?.predictHotPsi(pressure("medium","front"),model?.predictedInternalCoreC,model?.referenceColdC,window.ACLMPressure.ATM_PSI,model?.volumeModel?.hotToColdVolumeRatio,model?.pressureResponseFactor);
   if(Number.isFinite(predF)&&Math.abs(predF-idealPressure("front"))>1) out.push(`Manual Medium pressure predicts approximately ${predF.toFixed(1)} psi at the reference-duty internal temperature versus ${idealPressure("front").toFixed(1)} psi ideal.`);
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
   "Unmarked values are user selections, defaults or Tire Lab reconstruction/calibration values.",
    "Thermal V2 coefficients are physical reconstruction priors derived from geometry, load, rate, rolling resistance, construction, pressure, drivetrain/brake duty and class evidence; they are not confidential supplier data.",
    "CSP parameter meanings and obsolete-key handling follow the official CSP Tyre Thermal Models V1/V2 documentation."
 ];
 const limitations=[
   "A generated AC tire can be structurally valid while exact supplier proprietary coefficients remain unavailable.",
   "Peak friction, exact stiffness, thermal constants and wear-to-grip curves should only be described as factory-exact when primary evidence exists.",
   "Lap time and Assetto Corsa behavior are validation evidence for the simulation implementation, not standalone proof of historical tire specifications.",
   "User-adjustable AC tire-wear multipliers can compress or extend race strategy without changing the historical baseline wear curve.",
    "Light/medium/heavy thermal load-duty thresholds require telemetry validation for each car, track, setup and ambient condition."
 ];
 return {
   title:"Historical Tire Accuracy & Evidence Report",
   car:v("car")||"Unknown car",
   generatedAt:new Date().toLocaleString(),
   build:"v"+ACLM_APP_VERSION,
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
     {label:"Thermal load duty",value:loadDutySummary()+"; transparent N/mm reconstruction thresholds"},
     {label:"Compound/load checklist",value:comps.map(c=>compoundDisplayName(c)+" ["+compoundDutyAssessment(c).level+"]").join(", ")},
     {label:"Ideal hot pressure",value:`${idealPressure("front").toFixed(1)} psi front / ${idealPressure("rear").toFixed(1)} psi rear`},
     {label:"Pressure generation",value:$("autoSolvePressure")?.checked?`Auto-solved using ${solvedPressureModel("medium","front")?.initialThermalState?.source||"unresolved"} initial core; ambient ${n("pRefTemp").toFixed(1)} deg C retained separately`:"Manual generated cold pressures"},
     {label:"Medium generated cold pressure",value:`${pressure("medium","front").toFixed(1)} psi front / ${pressure("medium","rear").toFixed(1)} psi rear`},
     {label:"Imported AC cold-pressure reference",value:importedPressureSummary()||"None / not imported"},
     {label:"Blanket temperature",value:`${n("blankets").toFixed(0)} deg C`},
     {label:"Thermal implementation",value:cspV2Enabled()?"CSP Thermal Model V2 + required Kunos thermal sections":"Vanilla AC Kunos thermal model"},
     {label:"Physics output",value:cspV2Enabled()?"CSP Extended Physics – Thermal V2":"Vanilla AC"},
     {label:"Car physics requirement",value:cspV2Enabled()?"car.ini [HEADER] VERSION=extended-2":"Standard car.ini"},
     {label:"Extended contact rays",value:cspV2Enabled()?"2 lateral / 4 longitudinal per side, 60 deg":"Disabled"},
     {label:"Knowledge release",value:`v${window.ACLMHistoricalCategories?.knowledgeInfo?.().version||"?"} / schema ${window.ACLMHistoricalCategories?.knowledgeInfo?.().schemaVersion||"?"}`},
     {label:"Historical family physics",value:activeFamilyPrior()?`${activeHistoricalContext?.familyId}: family-specific grip/load/transient/thermal priors active`:"No family Generator_Prior active"},
     {label:"Imported old tire reference",value:`RATE ${importedTireReference.rateF??"-"} F / ${importedTireReference.rateR??"-"} R N/m; ideal pressure ${importedTireReference.idealPressure??"-"} psi (reference only)`},
     ...lastThermalCalibrations.map(x=>({label:`${compoundDisplayName(x.compound)} ${x.axle} Thermal V2 reconstruction`,value:`mass ${x.estimates.estimatedMass.toFixed(2)} kg; volume ${(x.estimates.internalVolume*1000).toFixed(2)} L; FRICTION_K ${x.legacy.frictionK.toFixed(6)}; CARCASS_ROLLING_K ${x.v2.carcassRollingK.toFixed(6)}; SURFACE_TO_AMBIENT ${x.v2.surfaceToAmbient.toFixed(6)}; confidence ${x.inputs.evidenceConfidence}%`}))
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
     "Every pack exports ACLM_LOAD_COMPOUND_CHECKLIST.txt with series-menu and axle-duty assessments.",
     "The pack validator blocks export for missing referenced LUTs, malformed LUT rows, invalid geometry or other structural errors.",
     "This PDF is generated automatically and bundled with every Tire Lab ZIP export."
   ],
   provenance:provNotes,
   sources:sourcePages,
   limitations
 };
}

function lutIntegrityErrors(name,text){
 const errors=[];
 if(typeof text!=="string")return [name+": LUT is not text."];
 if(text.includes("\\n"))errors.push(name+": contains literal \\n text instead of real line breaks.");
 if(text.includes("/n"))errors.push(name+": contains invalid /n text.");
 if(text.includes("\\r"))errors.push(name+": contains literal \\r text.");
 if(text.includes("\r"))errors.push(name+": contains carriage-return characters; Tire Lab exports canonical LF rows.");
 const rows=text.split("\n").filter(line=>line.trim()&&!line.trim().startsWith(";"));
 const xs=[];
 for(const line of rows){
  const parts=line.split("|");
  if(parts.length!==2||!parts[0].trim()||!parts[1].trim()||!Number.isFinite(Number(parts[0]))||!Number.isFinite(Number(parts[1]))){
   errors.push(name+': malformed/non-numeric LUT row "'+line+'".');
  }else xs.push(Number(parts[0]));
 }
 if(xs.length<2)errors.push(name+": LUT has fewer than two numeric points.");
 for(let i=1;i<xs.length;i++)if(xs[i]<=xs[i-1])errors.push(name+": X axis is not strictly increasing.");
 return errors;
}
function collectLutIntegrityErrors(files){
 const errors=[];
 Object.entries(files).filter(([name])=>name.toLowerCase().endsWith(".lut")).forEach(([name,text])=>errors.push(...lutIntegrityErrors(name,text)));
 return errors;
}
function assertLutIntegrity(files){
 const errors=collectLutIntegrityErrors(files);
 if(errors.length)throw new Error("LUT integrity gate blocked export: "+errors.join(" "));
}

function familyConstructionAudit(){
 return {schema:"ACLM family construction audit 1.0",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,knowledge:window.ACLMHistoricalCategories?.knowledgeInfo?.()||null,rows:window.ACLMProfileState.auditKnowledge({families:runtimeFamilies(),classes:runtimeClasses()})};
}
function wearEvidenceManifest(compounds,files){
 const entries=[];
 for(const comp of compounds)for(const axle of ["front","rear"]){const name=`aclm_${comp}_${axle}_wear.lut`,life=historicalLifeEvidence(comp);entries.push({compound:comp,axle,historicalLife:life,acImplementation:{virtualKm:"not historical real km",useLoad:1,wearCurve:name,wearCurveSha256:window.ACLMIntegrity.sha256(files[name]||""),landmarks:window.ACLMWearModel.landmarks(files[name]||"")}});}
 return {schema:"ACLM historical life / AC wear separation 1.0",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,referenceDuty:window.ACLMWearModel.referenceDutyFramework(),entries};
}
function engineeringProvenanceManifest(compounds,pressureManifest){
 const rows=[
  {parameter:"construction",value:v("construction"),sourceType:constructionProvenance().provenance,sourceIds:constructionProvenance().sourceIds,formula:"historical context dependency resolution",constructionPrior:currentHistoricalCoherence().intended,telemetrySupport:activeHistoricalContext?.familyId==="FAM022"?"GT40 software regression; old thermal data excluded":null,confidence:constructionProvenance().confidence,status:currentHistoricalCoherence().pass?"COHERENT":"CONFLICT"},
  {parameter:"PRESSURE_IDEAL",value:`${idealPressure("front")} F / ${idealPressure("rear")} R psi`,sourceType:"KNOWLEDGE_GENERATOR_PRIOR_OR_USER_INPUT",sourceIds:[activeHistoricalContext?.familyId].filter(Boolean),formula:"grip optimum; separate from setup cold recommendation",constructionPrior:null,telemetrySupport:activeHistoricalContext?.familyId==="FAM023"?"Escort pressure-closure fixture":"unresolved",confidence:activeHistoricalContext?.familyId==="FAM023"?"operationally supported; historical target provisional":"provisional",status:"REVIEW"},
  {parameter:"recommended setup cold pressure",value:pressureManifest.entries.map(x=>`${x.compound}/${x.axle} ${x.recommendedSetupColdPressurePsi.toFixed(2)} psi`).join("; "),sourceType:"ENGINEERING_FORMULA",sourceIds:["M4-FORMULA-009",...pressureManifest.entries.flatMap(x=>x.provenance?.fixtureId?[x.provenance.fixtureId]:[])],formula:"P2_abs = P1_abs × (T2_air/T1_air) × (V1/V2)",constructionPrior:pressureManifest.entries.map(x=>x.constructionModel),telemetrySupport:pressureManifest.entries.map(x=>x.provenance).filter(Boolean),confidence:"reported per entry",status:"TELEMETRY_READY"},
  {parameter:"temperature optimum",value:compounds.map(x=>`${compoundDisplayName(x)} ${targetTempForCompound(x).toFixed(1)} C`).join("; "),sourceType:"PROVISIONAL_GENERATOR_PRIOR",sourceIds:[activeHistoricalContext?.familyId].filter(Boolean),formula:"PERFORMANCE_CURVE grip mapping only; not cavity-air temperature",constructionPrior:null,telemetrySupport:activeHistoricalContext?.familyId==="FAM023"?"Escort sensor observations; no direct period pyrometer target":"unresolved",confidence:"provisional historical reconstruction",status:"RESEARCH_GAP"}
 ];
 return {schema:"ACLM engineering provenance 1.0",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,fields:["VALUE","SOURCE TYPE","SOURCE IDS","FORMULA","CONSTRUCTION PRIOR","TELEMETRY SUPPORT","CONFIDENCE","STATUS"],rows};
}
function renderEngineeringProvenance(manifest){const el=$("engineeringProvenance");if(!el)return;el.innerHTML=`<table class="import-table"><thead><tr><th>Value</th><th>Source / formula</th><th>Confidence / status</th></tr></thead><tbody>${manifest.rows.map(r=>`<tr><td><b>${escapeHtml(r.parameter)}</b><br>${escapeHtml(String(r.value))}</td><td>${escapeHtml(r.sourceType)}<br>${escapeHtml(r.formula)}<br>${escapeHtml((r.sourceIds||[]).join(", ")||"no source ID")}</td><td>${escapeHtml(String(r.confidence))}<br>${escapeHtml(r.status)}</td></tr>`).join("")}</tbody></table>`;}
function focusedHistoricalResearchManifest(){
 if(activeHistoricalContext?.familyId!=="FAM022"||n("year")!==1966||!/gt40/i.test(v("car")))return null;
 return {schema:"ACLM focused historical research context 1.0",subject:"1966 Ford GT40 Mk II / FAM022 / CLS021",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,historicalEvidenceStatus:"PARTIALLY SOURCED",supplierDecision:{value:"General / unknown",reason:"Ford's Chris Amon account documents event- and car-specific Firestone/Goodyear use at 1966 Le Mans; it does not justify assigning one supplier to a generic 1966 Mk II fixture."},sources:[
  {id:"GT40-PRI-FIA-224",quality:"PRIMARY",publisher:"FIA Historic Database",title:"Ford GT 40 homologation form 224, Group 4",url:"https://historicdb.fia.com/sites/default/files/car_attachment/1601034301/homologation_form_number_224_group_4.pdf",supports:["1966 GT40 homologation context"],limitations:"Covers the homologated 4.736 L Group 4 GT40, not the 7.0 L Mk II prototype; it is a scope boundary, not exact Mk II tire calibration."},
  {id:"GT40-PRI-FORD-AMERICAN-CHALLENGE",quality:"PRIMARY",publisher:"Ford Division News Bureau",title:"Ford GT40 — The American Challenge",url:"https://media.ford.com/content/dam/fordmedia/history/products/fordgt-gt40/Ford-GT40-Press-release-The-American-Challenge.pdf",supports:["Mk II development","provision for 8-inch front and 9.5-inch rear magnesium wheels","1966 endurance context"],limitations:"Direct wheel-width evidence; does not provide exact tire dimensions, pressures, temperature or force curves."},
  {id:"GT40-PRI-FORD-AMON-1966",quality:"PRIMARY",publisher:"Ford Media Center / Chris Amon",title:"Remembering Le Mans 1966",url:"https://media.ford.com/content/fordmedia/feu/de/de/news/2016/06/10/ford-gt40-fahrer-chris-amon-erinnert-sich-an-seinen-grossen-le-m.html",supports:["Firestone intermediate use on the McLaren/Amon car","high-speed tread shedding","event-specific switch to Goodyear","other GT40s using Goodyear"],limitations:"Retrospective first-person event account; supports Le Mans supplier/failure context, not a generic Mk II supplier or numeric pressure/temperature target."},
  {id:"GT40-PRI-FORD-LEMANS-REPORT",quality:"PRIMARY",publisher:"Ford Motor Company",title:"Le Mans Progress Meeting No. 11 — 1966 race review",url:"https://media.ford.com/content/dam/fordmedia/history/products/fordgt-gt40/LeMans-Progress-Meeting-with-wrap-up-of-victory-10-06-1966.pdf",supports:["Mk II race pace strategy","1-2-3 completion","endurance operating context"],limitations:"No direct tire dimensions, pressures or temperatures."}
 ],findings:{hostSpecification:{status:"DIRECTLY SOURCED",value:"Installed WSC60 Ford GT40 Mk II metadata identifies 1966; imported AC physics mass is 1161 kg."},rimArchitecture:{status:"PARTIALLY SOURCED",value:"Ford documents 8-inch front and 9.5-inch rear wheel provision; imported host uses 15-inch rim diameter and 0.245/0.325 m tire widths."},construction:{status:"RECONSTRUCTED",value:"Bias/cross-ply is the internal FAM022 compatibility classification; the focused source set does not expose a direct carcass specification."},supplier:{status:"UNKNOWN",value:"General / unknown for this generic fixture; retain Firestone/Goodyear only as 1966 Le Mans event evidence."},compound:{status:"RECONSTRUCTED",value:"Dry endurance/race spec; exact period compound code unresolved."},pressure:{status:"PROVISIONAL",value:"No period Mk II hot/cold pressure guidance found in the focused primary set."},temperature:{status:"UNKNOWN",value:"No period tread, carcass or core temperature window found."},durability:{status:"PARTIALLY SOURCED",value:"Ford race records establish endurance completion context; Amon records high-speed intermediate tread shedding, but no numeric wear-life mapping."},wetIntermediate:{status:"DIRECTLY SOURCED",value:"Amon explicitly records Firestone intermediates in damp 1966 Le Mans conditions; exact construction and compound remain unknown."}},forbiddenInference:"Do not convert FIA dimensional-measurement pressure, modern historic eligibility, or event-specific supplier testimony into a universal historical pressure/supplier value."};
}

function build(){
  refreshLoadDutyStatus();
  const comps=selectedCompounds();
  if(!v("car")||/^car$/i.test(v("car")))throw new Error("Car name is required before generating a tire pack.");
  const coherence=currentHistoricalCoherence(comps[0]||null);renderHistoricalCoherence();if(!coherence.pass)throw new Error("PROFILE COHERENCE FAIL: "+coherence.issues.filter(x=>x.severity==="BLOCK").map(x=>x.message).join(" "));
 lockExportName();
 if(!comps.length) throw new Error("Select at least one compound.");
 // Keep Medium as default when available, otherwise first available.
 const defaultIdx=Math.max(0,comps.indexOf("medium"));
 lastThermalCalibrations=[];
 const thermalHeader=cspV2Enabled()?`[THERMAL_MODEL]
VERSION=2

[_EXTENSION]
LATERAL_RAYS=${window.ACLMThermalV2.RAYS.lateral}
LONGITUDINAL_RAYS=${window.ACLMThermalV2.RAYS.longitudinal}
MAX_RAY_ANGLE=${window.ACLMThermalV2.RAYS.maxAngle}
DISABLE_RAY_DOUBLING=${window.ACLMThermalV2.RAYS.disableDoubling}
SMOOTH_LOAD_SENS=${window.ACLMThermalV2.RAYS.smoothLoadSensitivity}

`:"";
 let ini=`; ================================================================
; ACLM PROJECT - HISTORICAL RACE TIRE MODEL
; Generated by ACLM Historical Tire Lab v${ACLM_APP_VERSION}
; ${n("year")} | ${v("series")} | ${v("car")} | ${v("supplier")}
; Historical tire category: ${activeHistoricalContext?`${activeHistoricalContext.familyId} - ${activeHistoricalContext.familyName}`:"manual / unresolved"}
; Class calibration: ${activeHistoricalContext?.classId?`${activeHistoricalContext.classId} - ${activeHistoricalContext.className}`:"none"}
; Complete AC v10 output: required legacy keys + v10 load curves + camber LUTs + thermal/wear LUTs.
; Physics output: ${cspV2Enabled()?"CSP Extended Physics - Thermal V2":"Vanilla AC"}
; Car physics requirement: ${cspV2Enabled()?"car.ini [HEADER] VERSION=extended-2":"standard car.ini"}
; Tyre thermal model: ${cspV2Enabled()?"[THERMAL_MODEL] VERSION=2":"Kunos legacy"}
; Historical values remain evidence-weighted reconstruction unless directly documented.
; ================================================================
[HEADER]
VERSION=10

${thermalHeader}[COMPOUND_DEFAULT]
INDEX=${defaultIdx}

[VIRTUALKM]
USE_LOAD=1

[EXPLOSION]
TEMPERATURE=400

[ADDITIONAL1]
BLANKETS_TEMP=${Math.round(n("blankets"))}
PRESSURE_TEMPERATURE_GAIN=${n("pTempGain").toFixed(3)}
CAMBER_TEMP_SPREAD_K=${cspV2Enabled()?window.ACLMThermalV2.RAYS.camberTemperatureSpread.toFixed(1):"1.4"}

`;
 const files={};
 files["camber_table_front.lut"]=camberLut("front",v("construction"));
 files["camber_table_rear.lut"]=camberLut("rear",v("construction"));
 comps.forEach((c,i)=>{
   ini+=tireSection(c,"front",i)+"\n"+tireSection(c,"rear",i)+"\n";
   ini+=(cspV2Enabled()?thermalSections(c,"front",i):vanillaThermalSection(c,"front",i))+"\n"+(cspV2Enabled()?thermalSections(c,"rear",i):vanillaThermalSection(c,"rear",i))+"\n";
   files[`aclm_${c}_front_wear.lut`]=wearText(c+"F");
   files[`aclm_${c}_rear_wear.lut`]=wearText(c+"R");
   files[`aclm_${c}_tcurve.lut`]=performanceCurveText(c);
 });
 files["tyres.ini"]=ini;
 const importedCar=fileByBase(importedPhysics||{},"car.ini");
 let carValidation={available:false,pass:false,version:null,action:"tire-only warning"};
 if(cspV2Enabled()&&importedCar){
   files["car.ini"]=window.ACLMThermalV2.updateCarIni(importedCar.text);
   carValidation={...window.ACLMThermalV2.validateCarIni(files["car.ini"]),action:"preserved imported car.ini; changed only [HEADER] VERSION"};
 }else if(cspV2Enabled()){
   files["CSP_THERMAL_V2_CAR_REQUIREMENT.txt"]="CSP Thermal V2 tire generated. Car must use [HEADER] VERSION=extended-2 in car.ini.\n";
 }
 files["ACLM_THERMAL_V2_CALIBRATION.json"]=JSON.stringify({schema:"ACLM CSP Thermal V2 calibration manifest 1.0",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,physicsMode:cspV2Enabled()?"CSP Extended Physics - Thermal V2":"Vanilla AC",car:v("car"),year:n("year")||null,series:v("series"),supplier:v("supplier"),supplierProvenance:supplierProvenance(),construction:v("construction"),constructionProvenance:constructionProvenance(),profileCoherent:coherence.profileCoherent,historicalEvidenceStatus:coherence.historicalEvidenceStatus,carIni:carValidation,rays:cspV2Enabled()?window.ACLMThermalV2.RAYS:null,cspDocumentation:["https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Thermal-Models","https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Tyre-Physics","https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Cars-%E2%80%93-Enabling-extended-physics"],globalThermalRetune:false,heatPathways:{flexHysteresis:"carcass/shoulder",slipYaw:"tread/surface"},calibrations:lastThermalCalibrations},null,2)+"\n";
 const pressureManifest=pressureClosureManifest(comps);
 files["ACLM_PRESSURE_CLOSURE_REPORT.json"]=JSON.stringify(pressureManifest,null,2)+"\n";
 files["ACLM_PROFILE_STATE.json"]=JSON.stringify({schema:"ACLM historical profile state 1.2",generatedBy:`ACLM Historical Tire Lab v${ACLM_APP_VERSION}`,state:historicalProfileState,context:activeHistoricalContext,coherence:currentHistoricalCoherence(),profileCoherent:coherence.profileCoherent,compatibilityOnly:true,historicalEvidenceStatus:coherence.historicalEvidenceStatus},null,2)+"\n";
 files["ACLM_HISTORICAL_EVIDENCE_STATUS.json"]=JSON.stringify(coherence.evidence,null,2)+"\n";
 const focusedResearch=focusedHistoricalResearchManifest();if(focusedResearch)files["ACLM_FOCUSED_HISTORICAL_RESEARCH.json"]=JSON.stringify(focusedResearch,null,2)+"\n";
 files["ACLM_FAMILY_CONSTRUCTION_AUDIT.json"]=JSON.stringify(familyConstructionAudit(),null,2)+"\n";
 files["ACLM_WEAR_EVIDENCE_AND_IMPLEMENTATION.json"]=JSON.stringify(wearEvidenceManifest(comps,files),null,2)+"\n";
 const provenanceManifest=engineeringProvenanceManifest(comps,pressureManifest);files["ACLM_ENGINEERING_PROVENANCE.json"]=JSON.stringify(provenanceManifest,null,2)+"\n";renderEngineeringProvenance(provenanceManifest);
 const requestedCondition={airTemperatureC:n("telemetryRequestedAir")||null,roadTemperatureC:n("telemetryRequestedRoad")||null,wearMultiplier:optionalNumber("telemetryWearMultiplier")??null,fuelRate:optionalNumber("telemetryRequestedFuelRate")??null,damageRate:optionalNumber("telemetryRequestedDamageRate")??null,startingFuelLiters:optionalNumber("telemetryStartingFuel")??null,sessionBlanketsEnabled:$("telemetrySessionBlankets")?.checked===true};
 const blanketCapabilityTemperatureC=n("blankets")||0,requestedSessionBlanketsEnabled=$("telemetrySessionBlankets")?.checked===true;
 files["ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"]=JSON.stringify({
  schema:"ACLM telemetry calibration manifest 1.1",appVersion:ACLM_APP_VERSION,knowledgeVersion:window.ACLMHistoricalCategories?.knowledgeInfo?.().version||null,loggerVersion:ACLM_APP_VERSION,loggerSchema:"ACLM native telemetry 1.2",
  car:v("car"),track:null,layout:null,year:n("year")||null,family:activeHistoricalContext?.familyId||null,class:activeHistoricalContext?.classId||v("series"),compound:comps,
  profileCoherent:coherence.profileCoherent,profileCompatibilityOnly:true,historicalEvidenceStatus:coherence.historicalEvidenceStatus,historicalEvidenceAudit:coherence.evidence,profileIssues:coherence.issues,profileState:{state:historicalProfileState,context:activeHistoricalContext,coherence},
  construction:v("construction"),constructionProvenance:constructionProvenance(),supplier:v("supplier"),supplierProvenance:supplierProvenance(),referenceDriver:v("pReferenceDriver"),
  requestedCondition,userRequestedCondition:requestedCondition,observedACCondition:{airTemperatureC:null,roadTemperatureC:null,initialCoreTemperatureC:null,initialPressurePsi:null,rawAidTireRate:null,aidTireRateInterpretation:"UNKNOWN",authority:"recorded Assetto Corsa physics shared memory"},
  requestedTyreWearMultiplier:optionalNumber("telemetryWearMultiplier")??null,requestedWearMultiplier:optionalNumber("telemetryWearMultiplier")??null,rawAidTireRate:null,aidTireRateInterpretation:"UNKNOWN",fuelRate:optionalNumber("telemetryRequestedFuelRate")??null,damageRate:optionalNumber("telemetryRequestedDamageRate")??null,
  tireBlanketCapabilityTemperatureC:blanketCapabilityTemperatureC,tireBlanketCapability:{definedTemperatureC:blanketCapabilityTemperatureC,source:"tyres.ini BLANKETS_TEMP; capability only"},historicalBlanketRecommendation:{status:activeHistoricalContext?.familyId==="FAM023"?"OFF":"UNRESOLVED",source:activeHistoricalContext?.familyId==="FAM023"?"Escort FAM023 validation protocol":"no family-specific recommendation resolved"},requestedSessionBlanketsEnabled,sessionBlanketStatus:{enabled:requestedSessionBlanketsEnabled,source:"user-requested session state; independent of BLANKETS_TEMP"},observedOrInferredStartingThermalState:pressureManifest.entries[0]?.initialThermalState||{status:"pending live telemetry"},observedStartingThermalState:{status:"pending live telemetry"},
  startingFuel:optionalNumber("telemetryStartingFuel")??null,pressureReference:{driver:v("pReferenceDriver"),ambientAirC:n("pRefTemp"),requestedRoadTemperatureC:n("telemetryRequestedRoad")||null,explicitInitialCoreC:optionalNumber("pInitialCore")??null,setupPressureControls:importedSetupPressureControls,axleReport:pressureManifest.entries},
  tireFileSha256:window.ACLMIntegrity.sha256(ini),wearLutSha256:Object.fromEntries(Object.entries(files).filter(([name])=>/_wear\.lut$/i.test(name)).map(([name,text])=>[name,window.ACLMIntegrity.sha256(text)])),temperatureLutSha256:Object.fromEntries(Object.entries(files).filter(([name])=>/_tcurve\.lut$/i.test(name)).map(([name,text])=>[name,window.ACLMIntegrity.sha256(text)])),carIniPhysicsVersion:carValidation.version,tyresIniThermalVersion:cspV2Enabled()?2:"Kunos legacy",thermalModelVersion:cspV2Enabled()?2:"Kunos legacy",distanceBases:["LOGGER_CUMULATIVE_DISTANCE","SESSION_DISTANCE","STINT_DISTANCE","CURRENT_TIRE_SET_DISTANCE"]
 },null,2)+"\n";
 files["ACLM_LOAD_COMPOUND_CHECKLIST.txt"]=loadCompoundChecklistText(comps);
 files["ACLM_TIREPACK_MANIFEST.txt"]=`ACLM Historical Tire Lab v${ACLM_APP_VERSION}
Car: ${v("car")}
Year/class: ${n("year")} / ${v("series")}
Supplier: ${v("supplier")}
Construction: ${v("construction")}
Historical category: ${activeHistoricalContext?`${activeHistoricalContext.familyId} - ${activeHistoricalContext.familyName}`:"manual / unresolved"}
Class calibration: ${activeHistoricalContext?.classId?`${activeHistoricalContext.classId} - ${activeHistoricalContext.className}`:"none"}
Compounds: ${comps.map(c=>compoundDisplayName(c)).join(", ")}
FZ0 front/rear: ${fz0("front")} / ${fz0("rear")} N
Load-duty thermal reconstruction: ${loadDutySummary()}
Load/compound checklist: ACLM_LOAD_COMPOUND_CHECKLIST.txt
AC tire format: VERSION=10
CSP: ${cspV2Enabled()?"car.ini must use VERSION=extended-2":"not required by this export"}
Thermal: ${cspV2Enabled()?"CSP Thermal Model V2 plus required Kunos THERMAL sections":"vanilla Kunos thermal model"}
Extended contact rays: ${cspV2Enabled()?"2 lateral / 4 longitudinal per side, 60 degrees":"disabled"}
Calibration manifest: ACLM_THERMAL_V2_CALIBRATION.json
Pressure closure report: ACLM_PRESSURE_CLOSURE_REPORT.json
Pressure generation: ${$("autoSolvePressure")?.checked?`auto-solved from explicit/predicted AC initial core (${solvedPressureModel("medium","front")?.referenceColdC?.toFixed(1)??"?"} C; ${solvedPressureModel("medium","front")?.initialThermalState?.source||"unresolved"}) to reference-duty contained-air temperature`:"manual cold pressures"}
Imported AC cold-pressure reference: ${importedPressureSummary() || "none"}
Medium generated cold pressure F/R: ${pressure("medium","front").toFixed(1)} / ${pressure("medium","rear").toFixed(1)} psi
Ideal hot pressure F/R: ${idealPressure("front").toFixed(1)} / ${idealPressure("rear").toFixed(1)} psi
Wear calibration: ${$("wearStatus")?.value || "provisional"}
Wear note: ${$("wearNote")?.value || ""}
Terminal failure: ${$("terminalFailure")?.checked ? `enabled; normal curve threshold ${n("terminalNormalGrip").toFixed(1)}% grip; failure ${n("terminalFailureGrip").toFixed(1)}% at +${n("terminalFailureGap").toFixed(2)} vKm` : "disabled"}
Output ZIP: ${currentExportZipName||outputZipName()}
NOTE: This pack is structurally complete and reference-validated. On-track grip, temperature and wear still require car-specific certification.
Historical PDF report: ${historicalReportFileName()}
`;
 assertLutIntegrity(files);
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
 const sectionHeaders=[...ini.matchAll(/^\[([^\]]+)\]/gm)].map(m=>m[1]);
 if(new Set(sectionHeaders).size!==sectionHeaders.length)errors.push("tyres.ini contains duplicate INI section names.");
 if(/(?:^|=)\s*(?:NaN|undefined|null)\s*$/im.test(ini))errors.push("tyres.ini contains a non-finite or missing INI value.");
 if(cspV2Enabled()){
   if(sec.THERMAL_MODEL?.VERSION!=="2")errors.push("CSP V2 output requires [THERMAL_MODEL] VERSION=2.");
   const ray=window.ACLMThermalV2.RAYS,ext=sec._EXTENSION||{};
   if(ext.LATERAL_RAYS!==String(ray.lateral)||ext.LONGITUDINAL_RAYS!==String(ray.longitudinal)||ext.MAX_RAY_ANGLE!==String(ray.maxAngle))errors.push("CSP V2 extended contact-ray settings are missing or invalid.");
 }else{
   if(sec.THERMAL_MODEL||Object.keys(sec).some(k=>/^THERMAL2_/.test(k)))errors.push("Vanilla AC output must not enable CSP Thermal Model V2.");
 }
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
   [tf,tr].forEach(t=>{
     if(!sec[t]) errors.push(`Missing [${t}].`);
     else {
       if(!(sec[t].PERFORMANCE_CURVE in files)) errors.push(`[${t}] references missing ${sec[t].PERFORMANCE_CURVE}.`);
       ["CORE_TRANSFER","INTERNAL_CORE_TRANSFER","ROLLING_K"].forEach(k=>{if(cspV2Enabled()&&Number(sec[t][k])!==0)errors.push(`[${t}] obsolete Thermal V1/V2 control ${k} must be zero.`);});
     }
   });
   if(cspV2Enabled()){
     const vf=i===0?"THERMAL2_FRONT":"THERMAL2_FRONT_"+i,vr=i===0?"THERMAL2_REAR":"THERMAL2_REAR_"+i;
     const v2Required=["CARCASS_ROLLING_K","BRAKE_TO_CORE","SURFACE_TO_AMBIENT","SURFACE_TO_CARCASS","CARCASS_TO_SURFACE","CARCASS_TO_CORE","CORE_TO_CARCASS","CORE_TO_AMBIENT"];
     [vf,vr].forEach(t=>{if(!sec[t])errors.push(`Missing [${t}].`);else v2Required.forEach(k=>{if(!(k in sec[t])||!Number.isFinite(Number(sec[t][k])))errors.push(`[${t}] missing/invalid ${k}.`);});});
   }
 });
 if(!files["ACLM_THERMAL_V2_CALIBRATION.json"])errors.push("Thermal calibration manifest is missing.");
 else {try{const m=JSON.parse(files["ACLM_THERMAL_V2_CALIBRATION.json"]);if(cspV2Enabled()&&(!Array.isArray(m.calibrations)||m.calibrations.length!==fronts.length*2))errors.push("Thermal calibration manifest does not cover every axle/compound.");}catch(e){errors.push("Thermal calibration manifest is malformed JSON.");}}
 if(cspV2Enabled()){
   if(files["car.ini"]){const cv=window.ACLMThermalV2.validateCarIni(files["car.ini"]);if(!cv.pass)errors.push("Imported car.ini was not safely updated to [HEADER] VERSION=extended-2.");else info.push("PASS: imported car.ini preserved and extended-2 requirement validated.");}
   else if(!files["CSP_THERMAL_V2_CAR_REQUIREMENT.txt"])errors.push("Tire-only CSP V2 export is missing its car.ini extended-2 warning.");
   else warnings.push("CSP Thermal V2 tire generated. Car must use [HEADER] VERSION=extended-2 in car.ini.");
 }
 if(!files["ACLM_LOAD_COMPOUND_CHECKLIST.txt"])errors.push("Load/compound suitability checklist is missing.");
 if(!files["ACLM_PRESSURE_CLOSURE_REPORT.json"])errors.push("Pressure closure report is missing.");
 else {try{const p=JSON.parse(files["ACLM_PRESSURE_CLOSURE_REPORT.json"]);if(!Array.isArray(p.entries)||p.entries.length!==fronts.length*2)errors.push("Pressure closure report does not cover every axle/compound.");}catch(e){errors.push("Pressure closure report is malformed JSON.");}}
 const coherence=currentHistoricalCoherence();if(!coherence.pass)errors.push("PROFILE COHERENCE FAIL blocks generation.");else for(const issue of coherence.issues)warnings.push(issue.code+": "+issue.message);
 for(const requiredManifest of ["ACLM_PROFILE_STATE.json","ACLM_FAMILY_CONSTRUCTION_AUDIT.json","ACLM_WEAR_EVIDENCE_AND_IMPLEMENTATION.json","ACLM_ENGINEERING_PROVENANCE.json","ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"])if(!files[requiredManifest])errors.push(requiredManifest+" is missing.");
 if(files["ACLM_PROFILE_STATE.json"]){try{const p=JSON.parse(files["ACLM_PROFILE_STATE.json"]);if(p.state?.construction?.value!==v("construction"))errors.push("Profile-state construction does not match generated tire construction.");if(p.state?.supplier?.value!==v("supplier"))errors.push("Profile-state supplier does not match generated supplier state.");if(p.profileCoherent===false)warnings.push("Generated profile uses a compatibility exception; review profile issues.");if(p.historicalEvidenceStatus!=="DIRECTLY SOURCED")warnings.push(`Historical evidence status is ${p.historicalEvidenceStatus||"UNKNOWN"}; profile coherence does not imply fully sourced physics.`);}catch(e){errors.push("Profile-state manifest is malformed JSON.");}}
 const generatedNames=fronts.map(s=>sec[s]?.NAME).filter(Boolean),generatedShorts=fronts.map(s=>sec[s]?.SHORT_NAME).filter(Boolean);
 if(new Set(generatedNames.map(x=>x.toLowerCase())).size!==generatedNames.length)errors.push("Compound full names must be unique.");
 if(new Set(generatedShorts.map(x=>x.toUpperCase())).size!==generatedShorts.length)errors.push("Compound short codes must be unique.");
 collectLutIntegrityErrors(files).forEach(error=>errors.push(error));
 if(!window.ACLMPressure) errors.push("Pressure solver module is unavailable.");
 else {
   selectedCompounds().forEach(comp=>{
     ["front","rear"].forEach(axle=>{
       const model=solvedPressureModel(comp,axle),target=model?.predictedInternalCoreC,cold=Number(pressure(comp,axle).toFixed(1));
       const predicted=window.ACLMPressure.predictHotPsi(cold,target,model?.referenceColdC,window.ACLMPressure.ATM_PSI,model?.volumeModel?.hotToColdVolumeRatio,model?.pressureResponseFactor);
       if(!Number.isFinite(cold)||cold<=0) errors.push(`${comp} ${axle}: invalid generated cold pressure.`);
       if(Number.isFinite(predicted)){
         const delta=Math.abs(predicted-idealPressure(axle));
         if($("autoSolvePressure")?.checked && delta>0.15) errors.push(`${comp} ${axle}: auto pressure solver misses ideal hot pressure by ${delta.toFixed(2)} psi.`);
         if(!$("autoSolvePressure")?.checked && delta>1.0) warnings.push(`${comp} ${axle}: manual cold pressure predicts ${predicted.toFixed(1)} psi at ${target.toFixed(1)} C, ${delta.toFixed(1)} psi away from ideal.`);
       }
     });
   });
   info.push(`Pressure model: ${$("autoSolvePressure")?.checked?"auto-solved":"manual"}; ambient/reference setup and predicted AC initial core are separate states.`);
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
 info.push("Thermal load duty: "+loadDutySummary()+".");
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
function setResearched(id,value,source,sourceIds=[]){
 if(value===undefined || value===null || String(value).trim()==="" || fieldIsDirect(id)) return false;
 const el=$(id); if(!el) return false;
 setMenuValue(id,String(value)); markResearched(id,source);
 if(id==="supplier"){const direct=/ACLM Knowledge/i.test(String(source||"")),citations=Array.isArray(sourceIds)?sourceIds.filter(Boolean):[];window.ACLMProfileState.setSupplier(historicalProfileState,String(value),direct?window.ACLMProfileState.PROVENANCE.DIRECT_HISTORICAL_EVIDENCE:window.ACLMProfileState.PROVENANCE.AUTO_CLASSIFICATION,{sourceIds:direct?(citations.length?citations:[String(source)]):[],confidence:direct?"curated knowledge profile":"public-source classification; review required",reason:"supplier researched/applied"});renderSupplierProvenance();}
 return true;
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
 if(cls){const ctx=window.ACLMHistoricalCategories.contextForClass(cls.id,profile.year||v("year"));applyHistoricalContext(ctx,`ACLM Knowledge ${profile.id}`);}
 if(profile.supplier&&!fieldIsDirect("supplier"))setResearched("supplier",profile.supplier,`ACLM Knowledge ${profile.id}`,profile.sourceIds||[]);
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
     setConstructionWithProvenance(constructions[0],window.ACLMProfileState.PROVENANCE.DIRECT_HISTORICAL_EVIDENCE,{sourceIds:[`Wikipedia: ${contextPages[0].title}`],confidence:"explicit construction wording in reviewed identity context",reason:"historical construction evidence"});
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
 clearImportedMarks(); clearResearchChoices(); importedPhysics=files; importedPressureReference={}; importedTireReference={}; importedSetupPressureControls={}; lastImportLabel=label; const rows=[]; const notes=[]; let populated=0;
 $('preset').value='auto'; activeHistoricalContext=null; historicalProfileState=window.ACLMProfileState.create($("construction").value,window.ACLMProfileState.PROVENANCE.UNKNOWN_FALLBACK,GENERAL_UNKNOWN);setMenuValue("supplier",GENERAL_UNKNOWN);renderConstructionProvenance();renderSupplierProvenance();updateHistoricalCompoundLabels(); renderHistoricalFamilySummary('Awaiting researched racing class.');
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
   const hv=c.HEADER?.VERSION; if(hv){$('physicsMode').value=String(hv).toLowerCase()==='extended-2'?'csp-v2':'vanilla'; rows.push(importedRow('car.ini physics version',hv,car.path));}
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
   const idealF=numIni(F,'PRESSURE_IDEAL'),idealR=numIni(R,'PRESSURE_IDEAL');if(idealF!==null||idealR!==null){const p=idealF!==null&&idealR!==null?(idealF+idealR)/2:(idealF??idealR);importedTireReference.idealPressure=p;importedTireReference.idealPressureFront=idealF;importedTireReference.idealPressureRear=idealR;if(idealF!==null&&idealR!==null&&Math.abs(idealF-idealR)>.01){$("axleIdealPressure").checked=true;$("pIdealF").value=idealF;$("pIdealR").value=idealR;}rows.push(importedRow('Existing AC ideal-pressure reference',`${idealF??"-"} F / ${idealR??"-"} R psi`,tyre.path));}
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
    if(/vintage|bias|cross/.test(type)){setConstructionWithProvenance('bias',window.ACLMProfileState.PROVENANCE.IMPORTED_EXISTING_PHYSICS,{sourceIds:[tyre.path],confidence:"explicit imported tire-type clue",reason:"existing physics import"});markImported('construction',tyre.path);}
    else if(/\bradial\b/.test(type)){setConstructionWithProvenance('radial',window.ACLMProfileState.PROVENANCE.IMPORTED_EXISTING_PHYSICS,{sourceIds:[tyre.path],confidence:"explicit imported tire-type clue",reason:"existing physics import"});markImported('construction',tyre.path);}
   if(!["cSoft","cMedium","cHard","cInter","cWet"].some(id=>$(id).checked)) $("cMedium").checked=true;
   updateHistoricalCompoundLabels();
 }
 const setup=fileByBase(files,'setup.ini'); if(setup){const s=parseIniText(setup.text); const pressureSecs=Object.keys(s).filter(k=>/^PRESSURE_(LF|RF|LR|RR)$/.test(k));if(pressureSecs.length){const control=sec=>({min:numIni(s[sec],'MIN'),max:numIni(s[sec],'MAX'),step:numIni(s[sec],'STEP'),default:numIni(s[sec],'DEFAULT'),source:setup.path,section:sec}),front=[control('PRESSURE_LF'),control('PRESSURE_RF')].filter(x=>x.step),rear=[control('PRESSURE_LR'),control('PRESSURE_RR')].filter(x=>x.step);if(front.length)importedSetupPressureControls.front=front[0];if(rear.length)importedSetupPressureControls.rear=rear[0];rows.push(importedRow('Setup pressure controls',pressureSecs.map(sec=>`${sec}: ${s[sec].MIN}-${s[sec].MAX} psi, step ${s[sec].STEP}${s[sec].DEFAULT!==undefined?`, default ${s[sec].DEFAULT}`:', no DEFAULT'}`).join('; '),setup.path));}}
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
$('clearImport').addEventListener('click',()=>{importedPhysics={};importedSetupPressureControls={};clearImportedMarks();clearResearchChoices();activeHistoricalContext=null;historicalProfileState=window.ACLMProfileState.create($("construction").value,window.ACLMProfileState.PROVENANCE.UNKNOWN_FALLBACK,GENERAL_UNKNOWN);setMenuValue("supplier",GENERAL_UNKNOWN);renderConstructionProvenance();renderSupplierProvenance();$('preset').value='auto';updateHistoricalCompoundLabels();renderHistoricalFamilySummary();renderHistoricalCoherence();$('importSummary').innerHTML='';$('importStatus').textContent='No car physics imported yet.';$('researchStatus').textContent='Class / supplier research has not run yet.';$('researchSources').innerHTML='';});

// Offline support only. Tire Lab uses one version-aware launcher and does not create additional browser-app shortcuts.
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
 renderConstructionProvenance();renderSupplierProvenance();
 applyPreset("auto");
try{
  generatedFiles=build();
  const vr=validate(generatedFiles);
  renderValidation(vr);
  renderFiles(generatedFiles);
}catch(e){}

$("car").addEventListener("input",()=>{currentExportZipName="";updateOutputName();});
["mass","frontWeight","fzFactor","fw","rw","fzF","fzR"].forEach(id=>{
 const el=$(id);if(el)el.addEventListener("input",()=>{
  refreshLoadDutyStatus();
  try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 });
});
refreshLoadDutyStatus();


["terminalFailure","terminalNormalGrip","terminalFailureGrip","terminalFailureGap"].forEach(id=>{
 const el=$(id); if(el) el.addEventListener("change",()=>{
   try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
 });
});
updateOutputName();


["pIdeal","pIdealF","pIdealR","pRefTemp","pInitialCore","pReferenceDuty"].forEach(id=>$(id).addEventListener("input",()=>{
 if(id==="pIdeal"&&!$("axleIdealPressure").checked){$("pIdealF").value=$("pIdeal").value;$("pIdealR").value=$("pIdeal").value;}
 refreshSolvedPressures();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
}));
$("pReferenceDriver")?.addEventListener("change",()=>{refreshSolvedPressures();try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}});
$("axleIdealPressure").addEventListener("change",()=>{
 if(!$("axleIdealPressure").checked){$("pIdealF").value=$("pIdeal").value;$("pIdealR").value=$("pIdeal").value;}
 refreshSolvedPressures();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
});
$("autoSolvePressure").addEventListener("change",()=>{
 refreshSolvedPressures();
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
});
$("physicsMode").addEventListener("change",()=>{
 const enabled=cspV2Enabled();
 $("physicsModeSummary").innerHTML=enabled?'<b>Car physics requirement:</b> car.ini VERSION=extended-2 · <b>Tyre thermal model:</b> THERMAL_MODEL VERSION=2 · <b>Extended contact rays:</b> enabled.':'<b>Physics:</b> Vanilla AC · <b>Tyre thermal model:</b> required Kunos THERMAL sections · <b>Extended contact rays:</b> disabled.';
 try{generatedFiles=build();const vr=validate(generatedFiles);renderValidation(vr);renderFiles(generatedFiles);}catch(e){}
});
refreshSolvedPressures();

$("graphCompound").addEventListener("change",renderTireGraphs);
["cSoft","cMedium","cHard","cInter","cWet","terminalFailure","terminalNormalGrip","terminalFailureGap"].forEach(id=>{const el=$(id);if(el)el.addEventListener("change",()=>{renderTireGraphs();refreshLoadDutyStatus();});});
window.addEventListener("resize",()=>{clearTimeout(window.__aclmGraphResize);window.__aclmGraphResize=setTimeout(renderTireGraphs,120);});
setTimeout(renderTireGraphs,50);

const ACLM_APP_VERSION="0.10.2";
// Application updates use a permanent GitHub hyperlink in index.html; no remote version check.
let onlineRequestActive=false;

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
   updateKnowledgeUi('<span class="ok"><b>Knowledge loaded:</b></span> v'+escapeHtml(data.release.releaseVersion||"?")+' from '+escapeHtml(data.source||"cache")+'.');
 }catch(e){updateKnowledgeUi('<span class="warning"><b>Using bundled knowledge.</b></span> Local cache unavailable: '+escapeHtml(e.message));}
}
function bytesFromBase64(text){
 const binary=atob(String(text||"")),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}
async function sha256Bytes(bytes){
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function validateKnowledgeRelease(release){
 const errors=[],families=Array.isArray(release?.families)?release.families:[],classes=Array.isArray(release?.classes)?release.classes:[],measurements=Array.isArray(release?.measurements)?release.measurements:[];
 const sources=release?.sources&&typeof release.sources==="object"?release.sources:{},priors=release?.generatorPriors&&typeof release.generatorPriors==="object"?release.generatorPriors:{};
 const unique=(items,label)=>{const ids=items.map(x=>x?.id);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)errors.push(label+" contain missing or duplicate IDs.");return new Set(ids.filter(Boolean));};
 if(!String(release?.schemaVersion||"").startsWith("1."))errors.push("Unsupported knowledge schema.");
 if(!release?.releaseVersion)errors.push("Knowledge release version is missing.");
 if(!release?.contentSha256)errors.push("Deterministic content hash is missing.");
 if(!families.length||!classes.length)errors.push("Families or classes are missing.");
 const famIds=unique(families,"Families"),classIds=unique(classes,"Classes");unique(measurements,"Measurements");
 if(classIds.size!==classes.length)errors.push("Class index is incomplete.");
 const sourceIds=new Set(Object.keys(sources)),priorIds=new Set(Object.keys(priors));
 if(priorIds.size!==famIds.size||[...famIds].some(id=>!priorIds.has(id)))errors.push("Generator-prior coverage does not match the family set.");
 const allowed=new Set(["soft","qualifying","race","control","dry","hard","endurance","intermediate","wet","wet_hard"]);
 for(const family of families)for(const id of family.sourceIds||[])if(!sourceIds.has(id))errors.push("Family "+family.id+" references missing source "+id+".");
 for(const cls of classes){
   if(!famIds.has(cls.familyId))errors.push("Class "+cls.id+" references missing family "+cls.familyId+".");
   if(!Array.isArray(cls.menu)||!cls.menu.length)errors.push("Class "+cls.id+" has no tire menu.");
   for(const item of cls.menu||[])if(!allowed.has(item.kind))errors.push("Class "+cls.id+" has unsupported menu kind "+item.kind+".");
   for(const id of cls.sourceIds||[])if(!sourceIds.has(id))errors.push("Class "+cls.id+" references missing source "+id+".");
 }
 for(const [id,prior] of Object.entries(priors))if(prior?.familyId!==id)errors.push("Generator prior key mismatch for "+id+".");
 return [...new Set(errors)];
}
async function importKnowledgePackage(){
 const input=$("knowledgeFile"),button=$("importKnowledge"),status=$("knowledgeStatus"),file=input?.files?.[0];
 if(!file){status.innerHTML='<span class="warning"><b>Select a downloaded ACLM knowledge package first.</b></span>';return;}
 button.disabled=true;
 status.textContent="Verifying the downloaded knowledge package locally…";
 try{
   const wrapper=JSON.parse(await file.text());
   if(wrapper.product!=="ACLM Tire Knowledge Import Package"||wrapper.package_schema!=="1.0.0"||wrapper.payload_encoding!=="base64")throw new Error("This is not a supported ACLM knowledge package.");
   const bytes=bytesFromBase64(wrapper.payload_base64),actual=await sha256Bytes(bytes);
   if(actual.toLowerCase()!==String(wrapper.sha256||"").toLowerCase())throw new Error("Knowledge-package SHA-256 verification failed.");
   const release=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
   if(String(wrapper.version)!==String(release.releaseVersion))throw new Error("Package and release versions do not match.");
   const errors=validateKnowledgeRelease(release);
   if(errors.length)throw new Error(errors.slice(0,5).join(" "));
   const r=await fetch("/api/knowledge-import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload_base64:wrapper.payload_base64,sha256:wrapper.sha256})});
   const data=await r.json();if(!r.ok||data.error)throw new Error(data.error||("HTTP "+r.status));
   window.ACLMHistoricalCategories.loadKnowledgeRelease(data.release,"verified manual import");
   updateKnowledgeUi('<span class="ok"><b>Knowledge imported and preserved:</b></span> v'+escapeHtml(data.release.releaseVersion)+' · SHA-256 '+escapeHtml(actual.slice(0,12))+'…');
   input.value="";
 }catch(e){
   status.innerHTML='<span class="warning"><b>Knowledge import rejected:</b></span> '+escapeHtml(e.message)+' Existing cached/bundled knowledge remains active.';
 }finally{button.disabled=!input?.files?.length;}
}
$("knowledgeFile").addEventListener("change",()=>{$("importKnowledge").disabled=!$("knowledgeFile").files.length;});
$("importKnowledge").addEventListener("click",importKnowledgePackage);
setTimeout(loadCurrentKnowledge,250);
window.ACLMCurrentTelemetryManifest=()=>{
 try{
  if(!generatedFiles["ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"]){generatedFiles=build();const result=validate(generatedFiles);if(result.errors?.length)throw new Error("Generate/validation must pass before telemetry starts: "+result.errors.join(" "));renderValidation(result);renderFiles(generatedFiles);}
  const manifest=JSON.parse(generatedFiles["ACLM_TELEMETRY_MANIFEST_TEMPLATE.json"]);if(!manifest?.appVersion)throw new Error("Generated telemetry manifest is incomplete.");return manifest;
 }catch(error){throw new Error("Telemetry manifest handoff failed: "+error.message);}
};
