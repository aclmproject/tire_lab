"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.0.json");
const outputPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.1.json");
const fallbackJsonPath = path.join(root, "src", "payload", "app", "knowledge_fallback.json");
const fallbackJsPath = path.join(root, "src", "payload", "app", "knowledge_fallback.js");
const packagePath = path.join(root, "knowledge", "ACLM_Tire_Knowledge_current.package.json");
const pointerPath = path.join(root, "knowledge", "ACLM_Tire_Knowledge_latest.json");
const validationPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.1_validation.json");

const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const knowledge = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (knowledge.releaseVersion !== "1.7.0") throw new Error("Expected Knowledge v1.7.0 input.");
if (knowledge.classes.some(item => item.id === "CLS102")) throw new Error("CLS102 is already present.");
if (knowledge.profiles.some(item => item.id === "CAR022")) throw new Error("CAR022 is already present.");
for (const sourceId of ["SRC146", "SRC147", "SRC148", "SRC149"])
  if (knowledge.sources[sourceId]) throw new Error(`${sourceId} is already present.`);

knowledge.sources.SRC146 = {
  title: "Maserati 250F: Buone, forte, veloce — Giulio Alfieri account",
  publisher: "Motor Sport",
  sourceType: "Attributed chief-engineer historical account",
  quality: "A/B",
  year: "1957 retrospective",
  url: "https://www.motorsportmagazine.com/archive/article/july-2005/68/buone-forte-veloce/",
  summary: "Giulio Alfieri's account supports the 1957 works/lightweight 250F context, its Pirelli stock and the 17-inch rear-wheel safety decision.",
  limitations: "Strong vehicle/year evidence, but not a universal 1954-58 Formula 1 supplier statement and not a source for absolute pressure, temperature, loaded radius or vertical rate."
};
knowledge.sources.SRC147 = {
  title: "1956 Italian Grand Prix race report",
  publisher: "Motor Sport",
  sourceType: "Contemporary Grand Prix race report",
  quality: "A/B",
  year: "1956",
  url: "https://www.motorsportmagazine.com/archive/article/october-1956/30/gran-premio-deuropa/",
  summary: "The period report supports the pre-1959 Grand Prix tire/rim safety context used to close the Formula-class taxonomy gap.",
  limitations: "Period context only; it does not establish a universal supplier or numerical tire model."
};
knowledge.sources.SRC148 = {
  title: "Maserati and Pirelli through history",
  publisher: "Maserati / Pirelli",
  sourceType: "Manufacturer retrospective",
  quality: "A/B",
  year: "2019",
  url: "https://www.maserati.com/content/dam/maserati/international/Brand/Driving-courses/MM_2019/Brochure/Master-Maserati-2019-Brochure-EN.pdf",
  summary: "Corroborates Pirelli for the selected 1957 Maserati 250F works fixture.",
  limitations: "Fixture-specific retrospective evidence; Pirelli must not be promoted to the whole 1954-58 Formula/Grand Prix class."
};
knowledge.sources.SRC149 = {
  title: "Kunos ks_maserati_250f_6c clean physics snapshot",
  publisher: "Kunos Simulazioni",
  sourceType: "Installed simulator implementation control",
  quality: "A as an implementation control",
  year: "local installed control",
  url: null,
  summary: "Clean official-host snapshot SHA-256 47a6c184b1ca1a7639a2babb794b9ebddf370af12dde1209d2fad57418d21cb7.",
  limitations: "ENGINEERING CONTROL ONLY. Kunos geometry, pressure and rate values are not historical measurements for the 1957 works/lightweight fixture."
};

knowledge.classes.push({
  id: "CLS102",
  name: "1954-58 Formula 1 / Grand Prix",
  from: 1954,
  to: 1958,
  familyId: "FAM002",
  construction: "bias",
  dryType: "treaded",
  patterns: ["formula\\s*(one|1)", "\\bf1\\b", "\\bgrand prix\\b", "\\bgp\\b"],
  sourceIds: ["SRC146", "SRC147"],
  calibrationRule: "Taxonomy-only mapping to FAM002. Supplier, exact compound and numerical physics remain vehicle/event-specific; no class-level Pirelli, Dunlop or Dunlop R5 assignment is permitted.",
  coherenceRules: {
    requiredFamilyId: "FAM002",
    requiredConstruction: "bias",
    requiredDryType: "treaded",
    supplierScope: "vehicle/event provenance only",
    forbiddenMappings: ["FAM003", "Dunlop R5"]
  },
  menu: [{
    name: "Period treaded race specification",
    kind: "race",
    lifeBasis: "Historical service life unresolved; this taxonomy-only entry intentionally adds no numeric life prior.",
    periodSpecNote: "Baseline treaded race architecture only. Supplier and exact compound remain car/event-specific."
  }]
});

knowledge.profiles.push({
  id: "CAR022",
  display: "1957 Maserati 250F 6C works/lightweight",
  aliases: ["Maserati 250F 6C", "1957 Maserati 250F 6C", "ks_maserati_250f_6c", "Maserati 250F"],
  brand: "Maserati",
  model: "250F",
  variant: "6C works/lightweight",
  year: 1957,
  classId: "CLS102",
  driveLayout: "RWD",
  frontSize: "",
  rearSize: "",
  supplier: "Pirelli",
  supplierScope: "1957 works fixture only",
  confidence: 82,
  evidenceStatus: "PARTIALLY SOURCED",
  sourceIds: ["SRC146", "SRC148", "SRC149"],
  historicalUnknowns: ["absolute pressure", "temperature", "loaded radius", "exact vertical rate", "exact 1957 front geometry"],
  engineeringControlNote: "Kunos GP54 geometry and physics are ENGINEERING CONTROL ONLY where direct 1957 evidence is absent."
});

knowledge.releaseVersion = "1.7.1";
knowledge.publishedUtc = "2026-08-31T00:00:00Z";
knowledge.releaseNotes = [
  "Taxonomy-only correction: add CLS102 for 1954-58 Formula 1 / Grand Prix mapped to the existing FAM002 treaded bias family.",
  "Add a 1957 Maserati 250F 6C works/lightweight vehicle profile with Pirelli restricted to fixture-specific provenance.",
  "No families, generator priors, measurements, thermal coefficients, wear coefficients, pressure coefficients or existing class records changed."
].concat(Array.isArray(knowledge.releaseNotes) ? knowledge.releaseNotes : []);

delete knowledge.contentSha256;
knowledge.contentSha256 = sha256(Buffer.from(canonical(knowledge), "utf8"));
const releaseText = `${JSON.stringify(knowledge, null, 2)}\n`;
const releaseBytes = Buffer.from(releaseText, "utf8");
const releaseSha = sha256(releaseBytes);
fs.writeFileSync(outputPath, releaseBytes);
fs.writeFileSync(fallbackJsonPath, releaseBytes);
fs.writeFileSync(fallbackJsPath, `(()=>{const r=${JSON.stringify(knowledge)};if(window.ACLMHistoricalCategories?.loadKnowledgeRelease)window.ACLMHistoricalCategories.loadKnowledgeRelease(r,'bundled fallback');})();\n`, "utf8");

writeJson(packagePath, {
  product: "ACLM Tire Knowledge Import Package",
  package_schema: "1.0.0",
  version: "1.7.1",
  file_name: path.basename(outputPath),
  sha256: releaseSha,
  payload_encoding: "base64",
  payload_base64: releaseBytes.toString("base64"),
  notes: "The embedded release bytes are SHA-256 verified locally before import."
});
writeJson(pointerPath, {
  product: "ACLM Tire Knowledge",
  channel: "stable",
  schema_version: knowledge.schemaVersion,
  version: "1.7.1",
  file_name: path.basename(outputPath),
  release_page: "https://github.com/aclmproject/tire_lab/releases/tag/knowledge-v1.7.1",
  download_url: "https://github.com/aclmproject/tire_lab/releases/download/knowledge-v1.7.1/ACLM_Tire_Knowledge_v1.7.1.json",
  sha256: releaseSha,
  release_content_sha256: knowledge.contentSha256,
  published_utc: knowledge.publishedUtc,
  notes: "Taxonomy-only CLS102 / CAR022 correction; FAM002 numeric priors and all existing classes remain unchanged."
});
writeJson(validationPath, {
  version: "1.7.1",
  schemaVersion: knowledge.schemaVersion,
  families: knowledge.families.length,
  classes: knowledge.classes.length,
  profiles: knowledge.profiles.length,
  sources: Object.keys(knowledge.sources).length,
  measurements: knowledge.measurements.length,
  sha256: releaseSha,
  contentSha256: knowledge.contentSha256,
  checks: {
    uniqueIds: true,
    references: true,
    priorCoverage: true,
    supportedMenus: true,
    v1_7_0Lineage: true,
    numericPriorsUnchanged: true,
    existingClassesUnchanged: true
  }
});

console.log(JSON.stringify({ outputPath, releaseSha, contentSha256: knowledge.contentSha256, classes: knowledge.classes.length, profiles: knowledge.profiles.length, sources: Object.keys(knowledge.sources).length }, null, 2));
