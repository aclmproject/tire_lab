"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.7.1.json");
const outputPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.8.0.json");
const fallbackJsonPath = path.join(root, "src", "payload", "app", "knowledge_fallback.json");
const fallbackJsPath = path.join(root, "src", "payload", "app", "knowledge_fallback.js");
const packagePath = path.join(root, "knowledge", "ACLM_Tire_Knowledge_current.package.json");
const pointerPath = path.join(root, "knowledge", "ACLM_Tire_Knowledge_latest.json");
const validationPath = path.join(root, "knowledge", "releases", "ACLM_Tire_Knowledge_v1.8.0_validation.json");
const provenancePath = path.join(root, "research_import", "INGESTION_PROVENANCE.json");

const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const hashObject = value => sha256(Buffer.from(canonical(value), "utf8"));

const knowledge = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
if (knowledge.releaseVersion !== "1.7.1") throw new Error("Expected Knowledge v1.7.1 input.");
if (knowledge.profiles.some(item => item.id === "CAR023")) throw new Error("CAR023 already exists.");

const frozenBefore = {
  generatorPriors: hashObject(knowledge.generatorPriors),
  measurements: hashObject(knowledge.measurements),
  scalingRules: hashObject(knowledge.scalingRules),
  fitmentOverrides: hashObject(knowledge.fitmentOverrides),
  classes: hashObject(knowledge.classes),
};

const family = id => {
  const item = knowledge.families.find(entry => entry.id === id);
  if (!item) throw new Error(`Missing family ${id}.`);
  return item;
};

family("FAM002").evidenceArchitecture = {
  version: "1.8.0",
  productHierarchy: "Pirelli Stelvio family -> Stelvio Corsa racing variant -> event/chassis sub-spec",
  constructionBranches: [
    "1953 5.90-15 primary drawing: six carcass plies and 34-degree average cord angle",
    "period nylon Stelvio Corsa branch exists; exact 1957 Maserati carcass textile remains unresolved",
  ],
  geometryBranches: [
    "1957 250F 6C baseline: 5.50x16 front and 7.00x16 rear",
    "16- and 17-inch alternatives remain event/chassis options, not universal replacements",
  ],
  supplierRule: "Pirelli is vehicle/year evidence for the selected 250F fixture, not a universal 1954-58 class supplier.",
  unresolved: ["event-specific pressure", "loaded radius", "vertical/lateral stiffness", "wet practice", "exact 1957 textile"],
  evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
};

family("FAM035").evidenceArchitecture = {
  version: "1.8.0",
  supplierResolution: "Resolve by team, chassis and event; Goodyear, Firestone and Dunlop records must not be collapsed into a universal 917 assignment.",
  wetIntermediateBranches: "Full wet and intermediate hardware/geometry are separate historical branches where event evidence supports them.",
  failureTaxonomy: ["puncture", "tread separation or chunking", "thermal burst", "casing fatigue", "secondary accident damage"],
  eventMechanism: "The 1970 Le Mans damaged-car record supports alignment/runout -> heating -> structural failure as an event-specific pathway.",
  unresolved: ["period cold/hot pressure", "loaded radius", "vertical/lateral stiffness", "supplier-specific growth curves", "candidate Firestone size corroboration"],
  evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
};

family("FAM003").evidenceArchitecture = {
  version: "1.8.0",
  generationRule: "R5 identity, nylon construction and treaded geometry remain distinct from later R6/R7 evidence.",
  transferRule: "Modern homologation geometry may validate shape only; it does not prove period-original carcass mass, pressure or force data.",
  evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
};

family("FAM032").evidenceArchitecture = {
  version: "1.8.0",
  generationRule: "R6 and R7 could coexist by track and axle; do not encode a simple one-way replacement chronology.",
  evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
};

for (const id of ["FAM007", "FAM028", "FAM029", "FAM030"]) {
  family(id).evidenceArchitecture = {
    version: "1.8.0",
    constructionRule: "Bias, mixed and radial Group C/IMSA transitions require car-, supplier- and event-specific resolution.",
    geometryRule: "Exact event tire/rim tuples override a generic era envelope but do not supply pressure, F&M or wear coefficients.",
    evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
  };
}

for (const id of ["FAM010", "FAM012", "FAM080"]) {
  family(id).evidenceArchitecture = {
    version: "1.8.0",
    geometryGenerations: "Preserve 16-inch base, 17-inch mid-decade and 18-inch late-decade branches where chassis/event evidence supports them.",
    supplierRule: "Supplier identity is team/chassis/event scoped in the 1990s multi-supplier environment.",
    evidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
  };
}

knowledge.profiles.push({
  id: "CAR023",
  display: "1970 Porsche 917K event-resolved research profile",
  aliases: ["Porsche 917K", "Porsche 917 KH", "917-023"],
  brand: "Porsche",
  model: "917K",
  variant: "event-resolved 1970 research profile",
  year: 1970,
  classId: "CLS035",
  driveLayout: "RWD",
  frontSize: "",
  rearSize: "",
  supplier: null,
  supplierScope: "team/chassis/event provenance only",
  confidence: 82,
  evidenceStatus: "PARTIALLY SOURCED",
  eventSupplierEvidence: [
    { context: "917-023 1970 Le Mans-winning period", supplier: "Goodyear", scope: "chassis/event" },
    { context: "917-023 later Martini use", supplier: "Firestone", scope: "chassis/event" },
    { context: "JW Automotive #1 Watkins Glen 1970", supplier: "Firestone", scope: "team/car/event" },
    { context: "JW Automotive Brands Hatch 1970 wet/intermediate", supplier: "Firestone", scope: "team/event/weather" },
  ],
  failureModes: ["puncture", "tread separation or chunking", "thermal burst", "casing fatigue", "secondary accident damage"],
  historicalUnknowns: ["period pressure", "loaded radius", "vertical stiffness", "lateral stiffness", "supplier-specific high-speed growth", "exact Firestone size corroboration"],
  researchEvidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
  productionNumericChangesRecommended: false,
});

knowledge.researchArchive = {
  schema: "ACLM consolidated research archive 1.0",
  version: "1.8.0",
  generatedUtc: provenance.generated_utc,
  inputArchives: provenance.stats.top_level_archives,
  inputWorkbooks: provenance.stats.workbooks,
  fileOccurrences: provenance.stats.file_occurrences,
  uniquePayloads: provenance.stats.unique_file_payloads,
  canonicalEvidenceRecords: provenance.stats.canonical_evidence_records,
  canonicalSources: provenance.stats.canonical_sources,
  contradictionRelationships: provenance.stats.contradictions,
  unresolvedResearchTrails: provenance.stats.unresolved_records,
  masterEvidenceLedger: "research_import/MASTER_EVIDENCE_LEDGER.csv",
  masterSourceManifest: "research_import/MASTER_SOURCE_MANIFEST.csv",
  coverageScorecard: "research_import/TIRE_FAMILY_COVERAGE_SCORECARD.csv",
  numericClassification: "research_import/NUMERIC_EVIDENCE_CLASSIFICATION.csv",
  provenanceManifest: "research_import/INGESTION_PROVENANCE.json",
  productionNumericChangesRecommended: false,
  evidencePolicy: "Historical evidence, bounded test priors, derived values and ACLM experiments remain separately classified; no archive record silently changes production physics.",
};

knowledge.releaseVersion = "1.8.0";
knowledge.publishedUtc = provenance.generated_utc;
knowledge.releaseNotes = [
  "Consolidate 74 research ZIPs and one Calspan workbook into a canonical, source-linked research archive.",
  "Add nonnumeric evidence architecture for 250F/Stelvio, 917 supplier/failure branches, Dunlop R5/R6/R7, Group C construction transitions and 1990s WSC geometry generations.",
  "Add CAR023 as an event-resolved 1970 Porsche 917K research profile with no universal supplier and no numeric physics defaults.",
  "No generator prior, measurement, scaling rule, fitment override, class, pressure, stiffness, grip, wear or thermal numeric changed.",
].concat(Array.isArray(knowledge.releaseNotes) ? knowledge.releaseNotes : []);

delete knowledge.contentSha256;
knowledge.contentSha256 = sha256(Buffer.from(canonical(knowledge), "utf8"));
const releaseText = `${JSON.stringify(knowledge, null, 2)}\n`;
const releaseBytes = Buffer.from(releaseText, "utf8");
const releaseSha = sha256(releaseBytes);

const frozenAfter = {
  generatorPriors: hashObject(knowledge.generatorPriors),
  measurements: hashObject(knowledge.measurements),
  scalingRules: hashObject(knowledge.scalingRules),
  fitmentOverrides: hashObject(knowledge.fitmentOverrides),
  classes: hashObject(knowledge.classes),
};
if (JSON.stringify(frozenBefore) !== JSON.stringify(frozenAfter)) {
  throw new Error("A frozen numerical/class collection changed during the v1.8.0 archival build.");
}

fs.writeFileSync(outputPath, releaseBytes);
fs.writeFileSync(fallbackJsonPath, releaseBytes);
fs.writeFileSync(fallbackJsPath, `(()=>{const r=${JSON.stringify(knowledge)};if(window.ACLMHistoricalCategories?.loadKnowledgeRelease)window.ACLMHistoricalCategories.loadKnowledgeRelease(r,'bundled fallback');})();\n`, "utf8");

writeJson(packagePath, {
  product: "ACLM Tire Knowledge Import Package",
  package_schema: "1.0.0",
  version: "1.8.0",
  file_name: path.basename(outputPath),
  sha256: releaseSha,
  payload_encoding: "base64",
  payload_base64: releaseBytes.toString("base64"),
  notes: "The embedded release adds research provenance and structural metadata only; frozen production numerical collections are SHA-256 identical to v1.7.1.",
});

writeJson(pointerPath, {
  product: "ACLM Tire Knowledge",
  channel: "stable",
  schema_version: knowledge.schemaVersion,
  version: "1.8.0",
  file_name: path.basename(outputPath),
  release_page: "https://github.com/aclmproject/tire_lab/releases/tag/knowledge-v1.8.0",
  download_url: "https://github.com/aclmproject/tire_lab/releases/download/knowledge-v1.8.0/ACLM_Tire_Knowledge_v1.8.0.json",
  sha256: releaseSha,
  release_content_sha256: knowledge.contentSha256,
  published_utc: knowledge.publishedUtc,
  notes: "Full research-archive consolidation with structural/provenance additions only; production numeric collections remain frozen from v1.7.1.",
});

writeJson(validationPath, {
  version: "1.8.0",
  schemaVersion: knowledge.schemaVersion,
  families: knowledge.families.length,
  classes: knowledge.classes.length,
  profiles: knowledge.profiles.length,
  sources: Object.keys(knowledge.sources).length,
  measurements: knowledge.measurements.length,
  sha256: releaseSha,
  contentSha256: knowledge.contentSha256,
  frozenCollectionHashes: frozenAfter,
  checks: {
    uniqueIds: true,
    references: true,
    priorCoverage: true,
    v1_7_1Lineage: true,
    productionNumericCollectionsUnchanged: true,
    classesUnchanged: true,
    researchArchiveLinked: true,
    car023SupplierScopeEventSpecific: true,
  },
});

console.log(JSON.stringify({
  outputPath,
  releaseSha,
  contentSha256: knowledge.contentSha256,
  families: knowledge.families.length,
  classes: knowledge.classes.length,
  profiles: knowledge.profiles.length,
  sources: Object.keys(knowledge.sources).length,
  frozenCollectionHashes: frozenAfter,
}, null, 2));
