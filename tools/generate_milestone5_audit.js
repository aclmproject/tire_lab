"use strict";
const fs=require("node:fs"),path=require("node:path"),profile=require("../src/payload/app/profile_state.js");
const root=path.join(__dirname,".."),knowledge=require("../knowledge/releases/ACLM_Tire_Knowledge_v1.7.0.json");
const rows=profile.auditKnowledge(knowledge),summary={families:rows.length,bias:rows.filter(x=>x.generatedConstruction==="bias").length,radial:rows.filter(x=>x.generatedConstruction==="radial").length,unresolved:rows.filter(x=>!x.generatedConstruction).length,applicationOverrides:rows.filter(x=>x.source==="ENG-EV-GT40-0001").length};
const output={schema:"ACLM family construction audit 1.0",applicationVersion:"0.10.0",knowledgeVersion:knowledge.releaseVersion,knowledgeSha256:"9a74deaec72b09b92ec08b79abcf1f9f7db139402e13e6d80feddfae117f9200",scope:"All production knowledge families audited. Application-state corrections do not rewrite production knowledge.",summary,rows};
const target=path.join(root,"docs","FAMILY_CONSTRUCTION_AUDIT_v0100.json");fs.writeFileSync(target,JSON.stringify(output,null,2)+"\n");console.log(JSON.stringify(summary));
