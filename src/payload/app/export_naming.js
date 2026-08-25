(function(root){
"use strict";
function safeOutputStem(name){
 let s=(name||"Car").normalize?(name||"Car").normalize("NFKD"):(name||"Car");
 s=s.replace(/[\u0300-\u036f]/g,"").replace(/[<>:"\/\\|?*\x00-\x1F]/g," ");
 s=s.trim().replace(/\s+/g,"_").replace(/[. ]+$/g,"");if(!s)s="Car";return s.slice(0,100);
}
function makeOutputZipName(carName){return `ACLM_${safeOutputStem(carName)}_TirePack.zip`;}
function makeReportName(carName){return `ACLM_${safeOutputStem(carName)}_Historical_Tire_Accuracy_Report.pdf`;}
const api={safeOutputStem,makeOutputZipName,makeReportName};
if(typeof module!=="undefined"&&module.exports)module.exports=api;root.ACLMExportNaming=api;
})(typeof window!=="undefined"?window:globalThis);
