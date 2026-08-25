(function(root){
"use strict";
const TYRE_SUPPLIERS=[
"Dunlop","Michelin","Goodyear","Pirelli","Bridgestone","Yokohama","Firestone","Avon",
"BFGoodrich","B.F. Goodrich","Continental","Toyo","Falken","Hoosier","Hankook","Kumho",
"Englebert","Englebert-Colombes","Uniroyal","Cooper","Maxxis","Nitto","General Tire","CEAT","Vredestein"
];

function cleanWikiValue(value){
 let s=String(value||"");
 s=s.replace(/<!--[\s\S]*?-->/g," ");
 s=s.replace(/<ref[\s\S]*?<\/ref>/gi," ").replace(/<ref[^>]*\/>/gi," ");
 s=s.replace(/<br\s*\/?>/gi,"; ");
 s=s.replace(/\{\{convert\|([^|}]+)\|([^|}]+)[^}]*\}\}/gi,"$1 $2");
 s=s.replace(/\{\{(?:nowrap|small)\|([^{}]*)\}\}/gi,"$1");
 s=s.replace(/\{\{[^{}]*\}\}/g," ");
 s=s.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,"$2");
 s=s.replace(/\[\[([^\]]+)\]\]/g,"$1");
 s=s.replace(/''+/g,"").replace(/&nbsp;/gi," ").replace(/<[^>]+>/g," ");
 return s.replace(/\s+/g," ").replace(/^[;,\s]+|[;,\s]+$/g,"").trim();
}
function parseInfoboxFields(wikitext){
 const lines=String(wikitext||"").split(/\r?\n/),fields={}; let key=null,buf=[];
 const flush=()=>{if(!key)return;const val=buf.join(" ").trim();if(val)fields[key.toLowerCase().replace(/\s+/g,"_")]=val;key=null;buf=[];};
 for(const line of lines){
   const m=line.match(/^\|\s*([^=|]+?)\s*=\s*(.*)$/);
   if(m){flush();key=m[1].trim();buf=[m[2]];}
   else if(key&&!/^\s*\}\}/.test(line))buf.push(line);
   else if(key)flush();
 }
 flush(); return fields;
}
function splitCandidateValue(value){
 return cleanWikiValue(value).split(/\s*(?:;|\u2022|\n)\s*/).map(x=>x.trim())
  .filter(x=>x&&x.length<=100&&!/^(n\/a|none|unknown|various)$/i.test(x));
}
function canonicalRaceCategory(value){
 const s=cleanWikiValue(value); if(!s)return ""; const x=s.toLowerCase();
 const p=[
 [/\b(le mans hypercar|lmh)\b/,"Le Mans Hypercar (LMH)"],[/\blmdh\b/,"LMDh"],[/\blmp1\b/,"LMP1"],[/\blmp2\b/,"LMP2"],[/\blmp3\b/,"LMP3"],
 [/\bgroup c1\b/,"FIA Group C1"],[/\bgroup c2\b/,"FIA Group C2"],[/\bgroup c\b/,"FIA Group C"],
 [/\bgroup 7\b/,"Group 7"],[/\bgroup 6\b/,"FIA Group 6"],[/\bgroup 5\b/,"FIA Group 5"],[/\bgroup 4\b/,"FIA Group 4"],
 [/\bgroup b\b/,"FIA Group B"],[/\bgroup a\b/,"FIA Group A"],[/\bgroup n\b/,"FIA Group N"],
 [/\bimsa gtp\b|\bgtp\b/,"IMSA GTP"],[/\bworld sportscar\b|\bwsc\b/,"World Sports Car / WSC"],
 [/\bgt500\b/,"JGTC / Super GT GT500"],[/\bgt300\b/,"JGTC / Super GT GT300"],
 [/\bgt1\b/,"GT1"],[/\bgt2\b/,"GT2"],[/\bgt3\b/,"GT3"],[/\bgt4\b/,"GT4"],
 [/\bgrand touring\b|\bgrand tourer\b|\bgt class\b/,"Grand Touring (GT)"],
 [/\bsuper touring\b/,"Super Touring"],[/\bdtm\b/,"DTM"],[/\btouring car\b/,"Touring Car"],
 [/\bworld rally car\b|\bwrc\b/,"World Rally Car / WRC"],[/\brally\b/,"Rally"],
 [/\bformula one\b|\bformula 1\b|\bf1\b/,"Formula One"],[/\bformula two\b|\bformula 2\b|\bf2\b/,"Formula Two"],
 [/\bformula three\b|\bformula 3\b|\bf3\b/,"Formula Three"],[/\bformula ford\b/,"Formula Ford"],
 [/\bindycar\b/,"IndyCar"],[/\bcart\b|\bchamp car\b/,"CART / Champ Car"],
 [/\bnascar\b.*\bcup\b|\bcup series\b/,"NASCAR Cup"],[/\bnascar\b/,"NASCAR"],
 [/\bcan-am\b|\bcanadian-american challenge\b/,"Can-Am"],[/\btrans-am\b/,"Trans-Am"],
 [/\bsports prototype\b|\bsportscar prototype\b|\bprototype sports car\b/,"Sports Prototype"],[/\bstock car\b/,"Stock Car"]
 ];
 for(const [rx,label] of p)if(rx.test(x))return label;
 if(s.length>=2&&s.length<=80&&!/\b(engine|chassis|body|layout|designer|constructor|manufacturer|wheelbase|weight)\b/i.test(s))return s;
 return "";
}
function yearCandidatesFromText(text){
 const now=(new Date()).getFullYear();
 return [...new Set([...String(text||"").matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m=>Number(m[1])).filter(y=>y>=1900&&y<=now))];
}
function infoboxCategoryCandidates(wikitext){
 const f=parseInfoboxFields(wikitext),out=[];
 for(const k of ["class","classes","category","categories","competition","series","championship","car_class","vehicle_class","racing_class","regulations","formula"]){
   if(!f[k])continue;
   for(const raw of splitCandidateValue(f[k])){const c=canonicalRaceCategory(raw);if(c&&!out.includes(c))out.push(c);}
 }
 return out;
}
function classCandidatesFromText(text){
 const s=String(text||""),out=[...infoboxCategoryCandidates(s)],add=x=>{if(x&&!out.includes(x))out.push(x);};
 const p=[
 [/\bLe Mans Hypercar\b|\bLMH\b/i,"Le Mans Hypercar (LMH)"],[/\bLMDh\b/i,"LMDh"],[/\bLMP1\b/i,"LMP1"],[/\bLMP2\b/i,"LMP2"],[/\bLMP3\b/i,"LMP3"],
 [/\bGroup C1\b/i,"FIA Group C1"],[/\bGroup C2\b/i,"FIA Group C2"],[/\bGroup C\b/i,"FIA Group C"],
 [/\bGroup 6\b/i,"FIA Group 6"],[/\bGroup 5\b/i,"FIA Group 5"],[/\bGroup 4\b/i,"FIA Group 4"],
 [/\bGroup B\b/i,"FIA Group B"],[/\bGroup A\b/i,"FIA Group A"],[/\bGroup N\b/i,"FIA Group N"],
 [/\bIMSA GTP\b/i,"IMSA GTP"],[/\bWorld Sports Car\b|\bWSC\b/i,"World Sports Car / WSC"],
 [/\bGT500\b/i,"JGTC / Super GT GT500"],[/\bGT300\b/i,"JGTC / Super GT GT300"],
 [/\bgrand tourer\b|\bgrand touring[- ]style racing\b|\bGT regulations\b|\bGT class\b/i,"Grand Touring (GT)"],
 [/\bSuper Touring\b/i,"Super Touring"],[/\bDTM\b/i,"DTM"],[/\bTouring Car\b/i,"Touring Car"],
 [/\bWorld Rally Car\b|\bWRC\b/i,"World Rally Car / WRC"],[/\bFormula One\b|\bFormula 1\b/i,"Formula One"],
 [/\bFormula Two\b|\bFormula 2\b/i,"Formula Two"],[/\bFormula Three\b|\bFormula 3\b/i,"Formula Three"],
 [/\bIndyCar\b/i,"IndyCar"],[/\bCART\b|\bChamp Car\b/i,"CART / Champ Car"],[/\bNASCAR\b/i,"NASCAR"],
 [/\bCan-Am\b/i,"Can-Am"],[/\bTrans-Am\b/i,"Trans-Am"],[/\bSports Prototype\b|\bprototype sports car\b/i,"Sports Prototype"]
 ];
 for(const [rx,label] of p)if(rx.test(s))add(label);
 if(/\bGT1\b/i.test(s)&&!out.some(x=>/GT1$/.test(x)))add("GT1");
 if(/\bGT2\b/i.test(s)&&!out.some(x=>/GT2$/.test(x)))add("GT2");
 if(/\bGT3\b/i.test(s)&&!out.some(x=>/GT3$/.test(x)))add("GT3");
 if(/\bGT4\b/i.test(s)&&!out.some(x=>/GT4$/.test(x)))add("GT4");
 return out;
}
function infoboxYearCandidates(wikitext){
 const f=parseInfoboxFields(wikitext),scored=[];
 for(const [key,score] of [["debut",10],["first_race",10],["first",9],["introduced",8],["production",8],["years",7],["model_years",7],["built",7],["year",6],["seasons",5]]){
   if(!f[key])continue;
   for(const y of yearCandidatesFromText(cleanWikiValue(f[key])))scored.push({y,score,key});
 }
 scored.sort((a,b)=>b.score-a.score||a.y-b.y); return scored;
}
function chooseRaceYear(text){
 const raw=String(text||""),inf=infoboxYearCandidates(raw); if(inf.length&&inf[0].score>=7)return inf[0].y;
 for(const rx of [/\bbuilt\s+in\s+(19\d{2}|20\d{2})\b/i,/\bdebut(?:ed)?\b[^.]{0,90}\b(19\d{2}|20\d{2})\b/i]){
   const m=raw.match(rx);if(m)return Number(m[1]);
 }
 const scored=[];
 for(const sentence of raw.split(/(?<=[.!?])\s+/)){
   const ys=yearCandidatesFromText(sentence);if(!ys.length)continue;let score=0;
   if(/debut|first raced|first race|season/i.test(sentence))score+=8;
   if(/built|produced|production|developed|introduced/i.test(sentence)&&/race|racing|prototype|competition|formula|touring|rally|gt|group|nascar|indy/i.test(sentence))score+=6;
   if(/competed|entered|raced|championship|class|category/i.test(sentence))score+=3;
   if(/road car|road-going|mass production/i.test(sentence))score-=5;
   ys.forEach(y=>scored.push({y,score}));
 }
 scored.sort((a,b)=>b.score-a.score||a.y-b.y); return scored.length&&scored[0].score>=5?scored[0].y:null;
}
function detectSuppliers(text){
 const s=String(text||""),out=[];
 for(const supplier of TYRE_SUPPLIERS){
   const esc=supplier.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
   if(new RegExp("\\b"+esc+"\\b","i").test(s))out.push(supplier==="B.F. Goodrich"?"BFGoodrich":supplier);
 }
 return [...new Set(out)];
}
function infoboxSupplierCandidates(wikitext){
 const f=parseInfoboxFields(wikitext),out=[];
 for(const k of ["tyres","tires","tyre","tire","rubber"]){
   if(!f[k])continue;detectSuppliers(cleanWikiValue(f[k])).forEach(x=>{if(!out.includes(x))out.push(x);});
 }
 return out;
}
function constructionCandidatesFromText(text){
 const s=String(text||""),out=[],add=x=>{if(!out.includes(x))out.push(x);};
 if(/\bcross[- ]?ply\b|\bbias[- ]?ply\b/i.test(s))add("bias");
 if(/\bDunlop\b[\s\S]{0,140}\bR[56]\b|\bR[56]\b[\s\S]{0,140}\bDunlop\b/i.test(s))add("bias");
 if(/\bradial tyres?\b|\bradial tires?\b|\bradial construction\b/i.test(s))add("radial");
 return out;
}
function infoboxConstructionCandidates(wikitext){
 const f=parseInfoboxFields(wikitext);
 return constructionCandidatesFromText(["tyres","tires","tyre","tire"].map(k=>f[k]||"").join(" "));
}
function researchBaseName(s){
 let name=String(s||"").replace(/[_\-]+/g," ").replace(/\b(ACLM|Kunos|RSS|VRC|F302)\b/ig," ").replace(/\s+/g," ").trim();
 name=name.replace(/\b(Le Mans|LM|GT[- ]?LM|GTE|GT1|GT2|GT3|race|racing)\b/ig," ");
 return name.replace(/\s+/g," ").trim()||String(s||"").trim();
}
function identityTokens(s){return researchBaseName(s).toLowerCase().split(/\s+/).filter(x=>x.length>1);}
function pageIdentityScore(page,carName){
 const toks=identityTokens(carName),title=String(page.title||"").toLowerCase(),extract=String(page.extract||"").toLowerCase();let score=0;
 toks.forEach(t=>{if(title.includes(t))score+=4;else if(extract.includes(t))score+=1;});
 const base=researchBaseName(carName).toLowerCase();if(title===base)score+=12;if(title.includes(base)||base.includes(title))score+=6;
 if(/list of|season|championship|team|driver/i.test(page.title||""))score-=3;return score;
}
const api={TYRE_SUPPLIERS,cleanWikiValue,parseInfoboxFields,splitCandidateValue,canonicalRaceCategory,yearCandidatesFromText,
infoboxCategoryCandidates,classCandidatesFromText,infoboxYearCandidates,chooseRaceYear,detectSuppliers,infoboxSupplierCandidates,
constructionCandidatesFromText,infoboxConstructionCandidates,researchBaseName,identityTokens,pageIdentityScore};
if(typeof module!=="undefined"&&module.exports)module.exports=api;root.ACLMResearch=api;
})(typeof window!=="undefined"?window:globalThis);
