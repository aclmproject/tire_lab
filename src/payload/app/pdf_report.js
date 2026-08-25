(function(root){
"use strict";
const TE = new TextEncoder();

function ascii(s){
  return String(s ?? "")
    .replace(/\u00b0/g," deg")
    .replace(/\u00b5/g,"u")
    .replace(/\u03bc/g,"mu")
    .replace(/\u2013|\u2014/g,"-")
    .replace(/\u2018|\u2019/g,"'")
    .replace(/\u201c|\u201d/g,'"')
    .replace(/\u2192/g,"->")
    .replace(/\u2265/g,">=")
    .replace(/\u2264/g,"<=")
    .replace(/\u00d7/g,"x")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g,"?");
}
function esc(s){return ascii(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
function wrap(text,maxChars){
  const src=ascii(text).trim();
  if(!src) return [""];
  const words=src.split(/\s+/), out=[]; let line="";
  for(const w of words){
    if(!line){line=w;continue;}
    if((line+" "+w).length<=maxChars){line+=" "+w;continue;}
    out.push(line); line=w;
  }
  if(line) out.push(line);
  return out;
}
function verdict(score){
  if(score>=85) return "High-confidence evidence-weighted historical reconstruction";
  if(score>=70) return "Good evidence-weighted historical reconstruction";
  if(score>=50) return "Provisional historical reconstruction";
  return "Generic / low-confidence historical context";
}
function buildLines(d){
  const L=[];
  const title=ascii(d.title||"Historical Tire Accuracy & Evidence Report");
  L.push({t:"ACLM PROJECT",s:"eyebrow"});
  L.push({t:title,s:"title"});
  L.push({t:ascii(d.car||"Unknown car"),s:"subtitle"});
  L.push({t:`Generated ${ascii(d.generatedAt||"")} | Tire Lab ${ascii(d.build||"")}`,s:"muted"});
  L.push({t:"",s:"space"});

  L.push({t:"OVERALL ASSESSMENT",s:"h1"});
  L.push({t:`Historical evidence confidence: ${Math.round(Number(d.confidenceScore)||0)} / 100`,s:"score"});
  L.push({t:`Verdict: ${ascii(d.verdict||verdict(Number(d.confidenceScore)||0))}`,s:"body"});
  L.push({t:"This score describes evidence completeness and confidence in the selected historical tire context. It is not a probability that proprietary factory coefficients are exact.",s:"note"});
  L.push({t:"",s:"space"});

  L.push({t:"1. Historical identity and context",s:"h1"});
  (d.identity||[]).forEach(r=>L.push({t:`${r.label}: ${r.value}  [${r.provenance}]`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"2. Current generated tire model",s:"h1"});
  (d.model||[]).forEach(r=>L.push({t:`${r.label}: ${r.value}`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"3. Historical-accuracy findings",s:"h1"});
  (d.findings||[]).forEach(x=>L.push({t:`- ${x}`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"4. Wear and degradation status",s:"h1"});
  (d.wear||[]).forEach(r=>L.push({t:`${r.label}: ${r.value}`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"5. Assetto Corsa implementation status",s:"h1"});
  (d.acImplementation||[]).forEach(x=>L.push({t:`- ${x}`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"6. Evidence provenance",s:"h1"});
  L.push({t:"Direct AC-package data describes what the imported mod currently contains; it is not automatically historical proof. Researched context is public historical evidence. Reconstructed values are Tire Lab engineering/calibration choices.",s:"note"});
  (d.provenance||[]).forEach(x=>L.push({t:`- ${x}`,s:"body"}));
  L.push({t:"",s:"space"});

  L.push({t:"7. Sources",s:"h1"});
  if((d.sources||[]).length){
    d.sources.forEach((x,i)=>{
      L.push({t:`[${i+1}] ${x.title||"Source"}`,s:"source"});
      if(x.url) L.push({t:ascii(x.url),s:"url"});
    });
  }else{
    L.push({t:"No public historical source pages were attached to this export. Run Historical Research in Tire Lab before export if you want researched class/supplier sources embedded in the report.",s:"note"});
  }
  L.push({t:"",s:"space"});

  L.push({t:"8. Known limitations / next validation",s:"h1"});
  (d.limitations||[]).forEach(x=>L.push({t:`- ${x}`,s:"body"}));

  return L;
}
function layout(lines){
  const PAGE_W=612,PAGE_H=792,LEFT=54,RIGHT=54,TOP=58,BOTTOM=54;
  const width=PAGE_W-LEFT-RIGHT;
  const pages=[]; let cur=[], y=PAGE_H-TOP;
  const styles={
    eyebrow:{font:"F2",size:9,lead:13,max:92},
    title:{font:"F2",size:21,lead:26,max:42},
    subtitle:{font:"F2",size:14,lead:19,max:62},
    muted:{font:"F1",size:9,lead:13,max:94},
    h1:{font:"F2",size:13,lead:18,max:70,before:5},
    score:{font:"F2",size:16,lead:22,max:55},
    body:{font:"F1",size:10,lead:14,max:92},
    note:{font:"F1",size:9,lead:13,max:100},
    source:{font:"F2",size:9,lead:13,max:96},
    url:{font:"F1",size:7.5,lead:10,max:120},
    space:{font:"F1",size:6,lead:8,max:100}
  };
  function newPage(){
    if(cur.length) pages.push(cur);
    cur=[]; y=PAGE_H-TOP;
  }
  for(const item of lines){
    const st=styles[item.s]||styles.body;
    if(st.before) y-=st.before;
    const wrapped=item.s==="space"?[""]:wrap(item.t,st.max);
    const needed=Math.max(1,wrapped.length)*st.lead;
    if(y-needed<BOTTOM+24) newPage();
    for(const w of wrapped){
      cur.push({text:w,x:LEFT,y,font:st.font,size:st.size,style:item.s});
      y-=st.lead;
    }
  }
  if(cur.length) pages.push(cur);
  return pages;
}
function contentForPage(items,pageNo,total){
  const cmds=[];
  // Header rule.
  cmds.push("0.75 w 0.82 G 54 744 m 558 744 l S");
  for(const it of items){
    if(!it.text) continue;
    let gray="0 g";
    if(it.style==="muted"||it.style==="note"||it.style==="url") gray="0.35 g";
    cmds.push(`${gray} BT /${it.font} ${it.size} Tf 1 0 0 1 ${it.x} ${it.y} Tm (${esc(it.text)}) Tj ET`);
  }
  cmds.push("0.75 w 0.85 G 54 38 m 558 38 l S");
  cmds.push(`0.4 g BT /F1 7.5 Tf 1 0 0 1 54 24 Tm (ACLM Historical Tire Lab | Historical Tire Accuracy & Evidence Report) Tj ET`);
  cmds.push(`0.4 g BT /F1 7.5 Tf 1 0 0 1 520 24 Tm (Page ${pageNo}/${total}) Tj ET`);
  return cmds.join("\n")+"\n";
}
function create(report){
  const pages=layout(buildLines(report));
  const objs={};
  objs[1]="<< /Type /Catalog /Pages 2 0 R >>";
  const kids=[];
  for(let i=0;i<pages.length;i++) kids.push(`${5+i*2} 0 R`);
  objs[2]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  objs[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  for(let i=0;i<pages.length;i++){
    const pObj=5+i*2,cObj=6+i*2;
    const stream=contentForPage(pages[i],i+1,pages.length);
    const streamBytes=TE.encode(stream);
    objs[pObj]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cObj} 0 R >>`;
    objs[cObj]=`<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream`;
  }

  const maxObj=Math.max(...Object.keys(objs).map(Number));
  const chunks=[]; let offset=0; const offsets=[0];
  function add(s){const b=TE.encode(s);chunks.push(b);offset+=b.length;}
  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  for(let i=1;i<=maxObj;i++){
    offsets[i]=offset;
    add(`${i} 0 obj\n${objs[i]}\nendobj\n`);
  }
  const xref=offset;
  add(`xref\n0 ${maxObj+1}\n`);
  add("0000000000 65535 f \n");
  for(let i=1;i<=maxObj;i++) add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
  add(`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const total=chunks.reduce((n,b)=>n+b.length,0), out=new Uint8Array(total);
  let pos=0; for(const b of chunks){out.set(b,pos);pos+=b.length;}
  return out;
}

const api={create,verdict};
if(typeof module!=="undefined"&&module.exports) module.exports=api;
root.ACLMPdf=api;
})(typeof window!=="undefined"?window:globalThis);
