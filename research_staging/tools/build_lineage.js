"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..","..");
const stage=path.resolve(__dirname,"..");
const handoff=path.join(stage,"handoff");
const out=path.join(stage,"checkpoint_000_first_5000");
fs.mkdirSync(out,{recursive:true});
function readJsonl(file){return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map((line,index)=>{try{return JSON.parse(line);}catch(error){throw new Error(file+":"+(index+1)+" "+error.message);}});}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n");}
function writeJsonl(file,rows){fs.writeFileSync(file,rows.map(x=>JSON.stringify(x)).join("\n")+"\n");}
function norm(value){return String(value||"").normalize("NFKD").toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function normUrl(value){try{const u=new URL(String(value||""));u.hash="";u.search="";return (u.hostname.replace(/^www\./,"")+u.pathname).replace(/\/+$/,"").toLowerCase();}catch{return norm(value);}}
function sha(value){return crypto.createHash("sha256").update(value).digest("hex");}
function identityFor(matched,title,url,year,fallback){
 const key=matched?"existing:"+matched.id:normUrl(url)?"url:"+normUrl(url):title?"title-year:"+norm(title)+"|"+norm(year):"task:"+fallback;
 return sha(key).slice(0,24);
}
function field(block,name){const m=block.match(new RegExp("^"+name+":\\s*(.+)$","mi"));return m?m[1].trim():"";}
function countBy(rows,key){const out={};for(const row of rows){const k=typeof key==="function"?key(row):row[key];out[k||"UNSPECIFIED"]=(out[k||"UNSPECIFIED"]||0)+1;}return out;}
const knowledge=JSON.parse(fs.readFileSync(path.join(root,"src","payload","app","knowledge_fallback.json"),"utf8"));
const existingSources=Object.entries(knowledge.sources||{}).map(([id,s])=>({id,...s,normTitle:norm(s.title),normUrl:normUrl(s.url)}));
const existingByTitle=new Map(existingSources.map(x=>[x.normTitle,x]));
const existingByUrl=new Map(existingSources.filter(x=>x.normUrl).map(x=>[x.normUrl,x]));
const aText=fs.readFileSync(path.join(handoff,"ACLM_Tire_Lab_50_New_Sources_Desktop_Ingestion_Prompt.txt"),"utf8");
const headings=[...aText.matchAll(/^\[(C\d+|NEW-\d+)\]\s+(.+)$/gm)];
const layerA=headings.map((m,index)=>{
 const end=index+1<headings.length?headings[index+1].index:aText.indexOf("============================================================\nINGESTION / PROMOTION",m.index);
 const block=aText.slice(m.index,end),taskId="A-"+m[1],title=m[2].trim(),url=field(block,"URL"),identifier=field(block,"Identifier"),year=field(block,"Year"),publisher=field(block,"Author/Publisher");
 const matched=existingByUrl.get(normUrl(url))||existingByTitle.get(norm(title))||null;
 const identity=identityFor(matched,title,url,year,taskId);
 return {contentId:taskId,layer:"A",parentTaskId:null,sourceCandidateId:m[1],bibliographicIdentity:identity,existingTireKnowledgeSourceId:matched?.id||null,title,url,identifier,year,publisher,taskType:"curated_source_seed",priority:field(block,"Priority")||"P0/P1 carry-forward",domain:field(block,"Classification"),affectedFamilyClass:null,currentStatus:"DEFERRED_UNTIL_SOURCE_REVIEW",sourceReviewStatus:"METADATA_ONLY",evidenceRecordsProduced:[],constraint:field(block,"Constraint"),researchTarget:field(block,"Research target")};
});
const layerAByCandidate=new Map(layerA.map(x=>[x.sourceCandidateId,x]));
const layerAByTitle=new Map(layerA.map(x=>[norm(x.title),x]));
const layerBInput=readJsonl(path.join(handoff,"ACLM_Tire_Lab_500_Content_Corpus.jsonl"));
const layerB=layerBInput.map(row=>{
 const aParent=layerAByCandidate.get(row.source_id)||layerAByTitle.get(norm(row.title))||null;
 const matched=existingByUrl.get(normUrl(row.url))||existingByTitle.get(norm(row.title))||null;
 const identity=identityFor(matched,row.title,row.url,row.year,row.content_id);
 return {contentId:row.content_id,layer:"B",parentTaskId:aParent?.contentId||null,sourceCandidateId:row.source_id,bibliographicIdentity:identity,existingTireKnowledgeSourceId:/^SRC\d+$/.test(row.source_id||"")?row.source_id:(matched?.id||null),title:row.title||"",url:row.url||"",identifier:"",year:row.year||"",publisher:row.publisher||"",taskType:row.content_kind,priority:row.priority,domain:row.domains||[],affectedFamilyClass:null,currentStatus:"DEFERRED_UNTIL_SOURCE_REVIEW",sourceReviewStatus:"METADATA_ONLY",evidenceRecordsProduced:[],sourceGroup:row.source_group,researchQuestion:row.research_question,limitations:row.known_limitations||"",doNotInfer:row.do_not_infer||""};
});
const layerBById=new Map(layerB.map(x=>[x.contentId,x]));
const pilotInput=readJsonl(path.join(handoff,"P0_P1_FIRST_5000.jsonl"));
const layerC=pilotInput.map(row=>{
 const parent=layerBById.get(row.parent_content_id)||null;
 return {contentId:row.content_id,layer:"C",parentTaskId:row.parent_content_id||null,sourceCandidateId:row.parent_source_id||null,bibliographicIdentity:parent?.bibliographicIdentity||sha([norm(row.title),normUrl(row.url),norm(row.year)].join("|")).slice(0,24),existingTireKnowledgeSourceId:parent?.existingTireKnowledgeSourceId||null,title:row.title||"",url:row.url||"",identifier:"",year:row.year||"",publisher:"",taskType:row.record_group,priority:row.parent_priority||"P0/P1",domain:row.domain||"",affectedFamilyClass:null,currentStatus:parent?"DEFERRED_WAITING_FOR_PARENT_EVIDENCE":"DEFERRED_UNTIL_SOURCE_REVIEW",sourceReviewStatus:"METADATA_ONLY",evidenceRecordsProduced:[],lens:row.lens||"",task:row.task||"",relevanceGate:row.relevance_gate||"",promotionRule:row.promotion_rule||""};
});
const all=[...layerA,...layerB,...layerC];
const duplicateIds=all.map(x=>x.contentId).filter((id,i,a)=>a.indexOf(id)!==i);
const knownIds=new Set(all.map(x=>x.contentId));
const orphanParents=all.filter(x=>x.parentTaskId&&!knownIds.has(x.parentTaskId)).map(x=>x.contentId);
const identityGroups=new Map();
for(const row of [...layerA,...layerB]){if(!identityGroups.has(row.bibliographicIdentity))identityGroups.set(row.bibliographicIdentity,[]);identityGroups.get(row.bibliographicIdentity).push(row);}
const sourceIndex=[...identityGroups.entries()].map(([identity,rows])=>{const existingIds=[...new Set(rows.map(x=>x.existingTireKnowledgeSourceId).filter(Boolean))];return {bibliographicIdentity:identity,canonicalTitle:rows.find(x=>x.title)?.title||"",canonicalUrl:rows.find(x=>x.url)?.url||"",existingTireKnowledgeSourceId:existingIds[0]||null,existingTireKnowledgeSourceIds:existingIds,isResearchMission:rows.every(x=>!x.url&&x.sourceCandidateId==="MULTI_SOURCE"),layerATasks:rows.filter(x=>x.layer==="A").map(x=>x.contentId),layerBTasks:rows.filter(x=>x.layer==="B").map(x=>x.contentId),sourceReviewStatus:"METADATA_ONLY",disposition:existingIds.length?"MATCHED_EXISTING_SOURCE":rows.every(x=>!x.url&&x.sourceCandidateId==="MULTI_SOURCE")?"RESEARCH_MISSION_NOT_A_SOURCE":"CANDIDATE_NOT_YET_REVIEWED"};});
writeJsonl(path.join(out,"lineage_registry.jsonl"),all);
writeJson(path.join(out,"source_identity_index.json"),sourceIndex);
writeJsonl(path.join(out,"ingestion_ledger.jsonl"),all.map(x=>({contentId:x.contentId,layer:x.layer,status:x.currentStatus,sourceReviewStatus:x.sourceReviewStatus,evidenceIds:[],note:x.layer==="C"?"No child promotion before parent-source review.":"Registered; source review pending."})));
const full50k=readJsonl(path.join(handoff,"ACLM_Tire_Lab_50000_Content_Corpus.jsonl"));
const summary={
 checkpoint:"registration + first-priority 5,000 lineage",
 knowledgeInput:{releaseVersion:knowledge.releaseVersion,schemaVersion:knowledge.schemaVersion,existingSourceCount:existingSources.length,existingMeasurementCount:Object.keys(knowledge.measurements||{}).length,existingScalingRuleCount:Object.keys(knowledge.scalingRules||{}).length},
 corpusAccounting:{layerATasks:layerA.length,layerBTasks:layerB.length,layerCRegisteredPilot:layerC.length,layerCFullCorpusVerified:full50k.length,totalRegisteredAtCheckpoint:all.length},
 layerBGroups:countBy(layerB,"sourceGroup"),layerCGroups:countBy(layerC,"taskType"),layerCDomains:countBy(layerC,"domain"),statuses:countBy(all,"currentStatus"),
 sourceIdentityAccounting:{uniqueBibliographicCandidates:sourceIndex.filter(x=>!x.isResearchMission).length,researchMissionsNotSources:sourceIndex.filter(x=>x.isResearchMission).length,matchedExistingIdentities:sourceIndex.filter(x=>x.existingTireKnowledgeSourceId).length,existingIdsRepresented:[...new Set(sourceIndex.flatMap(x=>x.existingTireKnowledgeSourceIds))].length,existingBibliographicDuplicateGroups:sourceIndex.filter(x=>x.existingTireKnowledgeSourceIds.length>1).map(x=>({title:x.canonicalTitle,sourceIds:x.existingTireKnowledgeSourceIds})),candidatesNotYetReviewed:sourceIndex.filter(x=>!x.existingTireKnowledgeSourceId&&!x.isResearchMission).length,note:"Identity count is not a reviewed-source count."},
 integrity:{uniqueTaskIds:duplicateIds.length===0,duplicateTaskIds:duplicateIds,orphanParentCount:orphanParents.length,orphanParentIds:orphanParents,layerAExpected55:layerA.length===55,layerBExpected500:layerB.length===500,layerCPilotExpected5000:layerC.length===5000,layerCFullExpected50000:full50k.length===50000,noEvidencePromotedBeforeReview:all.every(x=>x.evidenceRecordsProduced.length===0)},
 inputHashes:{layerA:sha(fs.readFileSync(path.join(handoff,"ACLM_Tire_Lab_50_New_Sources_Desktop_Ingestion_Prompt.txt"))),layerB:sha(fs.readFileSync(path.join(handoff,"ACLM_Tire_Lab_500_Content_Corpus.jsonl"))),layerCPilot:sha(fs.readFileSync(path.join(handoff,"P0_P1_FIRST_5000.jsonl"))),layerCFull:sha(fs.readFileSync(path.join(handoff,"ACLM_Tire_Lab_50000_Content_Corpus.jsonl"))),qualityGates:sha(fs.readFileSync(path.join(handoff,"QUALITY_GATES.md")))},
 promotion:{canonicalKnowledgeChanged:false,applicationChanged:false,numericalGeneratorChanges:[],reason:"Registration is not source review or evidence promotion."}
};
summary.integrity.pass=Object.entries(summary.integrity).filter(([k])=>!["duplicateTaskIds","orphanParentIds","orphanParentCount"].includes(k)).every(([,v])=>v===true)&&summary.integrity.orphanParentCount===0;
writeJson(path.join(out,"checkpoint_summary.json"),summary);
if(!summary.integrity.pass){console.error(JSON.stringify(summary.integrity,null,2));process.exit(1);}
console.log(JSON.stringify(summary,null,2));
