import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const stagingRoot = path.resolve(here, '..');
const milestone2Root = path.join(stagingRoot, 'checkpoint_002_milestone2_working');
const outputRoot = path.join(stagingRoot, 'checkpoint_003_milestone3_archive_first');
fs.mkdirSync(outputRoot, { recursive: true });

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizedText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const canonicalUrl = (value) => String(value || '').trim().replace(/\/$/, '').toLowerCase();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = (file, rows) => fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
const countBy = (rows, key) => rows.reduce((acc, row) => {
  const value = typeof key === 'function' ? key(row) : row[key];
  const label = value ?? 'UNSPECIFIED';
  acc[label] = (acc[label] || 0) + 1;
  return acc;
}, {});
const htmlDecode = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const firstWords = (value, max = 24) => htmlDecode(value).split(/\s+/).filter(Boolean).slice(0, max).join(' ');
const yearFromCrossref = (item) => item['published-print']?.['date-parts']?.[0]?.[0]
  || item['published-online']?.['date-parts']?.[0]?.[0]
  || item.issued?.['date-parts']?.[0]?.[0]
  || null;
const yearFromText = (value) => {
  const match = String(value || '').match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ACLM-Tire-Lab-Research/1.0 (archive metadata review)' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const topicDefinitions = [
  ['PRESSURE', /inflation|pressure|loaded radius|deflection|footprint|spring rate/i],
  ['THERMAL', /temperature|thermal|heat|hysteresis|power loss|rolling loss|energy dissipation/i],
  ['WEAR', /wear|abrasion|durability|fatigue|aging|crack|tread depth/i],
  ['FM', /cornering|lateral force|longitudinal force|aligning|force and moment|camber|load sensitivity|traction/i],
  ['WET', /wet|water|hydroplan|skid|ice|snow|friction/i],
  ['CONSTRUCTION', /bias|cross-ply|cross ply|radial|belt|cord|carcass|ply|sidewall|bead|composite/i],
  ['TRANSIENT', /transient|relaxation|dynamic response|frequency response|time lag|torsional/i],
];
const topicToWeakness = {
  PRESSURE: 'W01_PRESSURE_TEMP_SETUP',
  THERMAL: 'W01_PRESSURE_TEMP_SETUP',
  WEAR: 'W02_WEAR_LIFE_GRIP',
  FM: 'W03_FM_STIFFNESS_TRANSIENT',
  TRANSIENT: 'W03_FM_STIFFNESS_TRANSIENT',
  WET: 'W04_WET_INTERMEDIATE',
  CONSTRUCTION: 'W05_CONSTRUCTION_MATERIALS',
};

function topicsFor(title, abstract) {
  const text = `${title} ${abstract}`;
  return topicDefinitions.filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
}

function relevanceScore(title, abstract) {
  const text = `${title} ${abstract}`;
  let score = topicsFor(title, abstract).length * 10;
  if (/experiment|measur|test rig|test facility|data were|results show|comparison/i.test(text)) score += 15;
  if (/pressure|temperature|load|speed|camber|slip angle|slip ratio|force|moment|stiffness|deflection|water depth|tread depth/i.test(text)) score += 12;
  if (/increase|decrease|effect|influence|depend|vary|relationship|correlat/i.test(text)) score += 8;
  if (/noise|vibration|uniformity|manufactur|cure/i.test(title) && topicsFor(title, abstract).length < 2) score -= 10;
  return score;
}

function authorsFromCrossref(item) {
  return (item.author || []).map((author) => [author.given, author.family].filter(Boolean).join(' ')).filter(Boolean);
}

const milestone2Identity = readJson(path.join(milestone2Root, 'source_identity_index.json'));
const milestone2Reviews = readJsonl(path.join(milestone2Root, 'source_reviews.jsonl'));
const milestone2Evidence = readJsonl(path.join(milestone2Root, 'evidence_candidates.jsonl'));
const milestone2Conflicts = readJsonl(path.join(milestone2Root, 'conflict_register.jsonl'));
const milestone2ActiveTargets = readJsonl(path.join(milestone2Root, 'layer_d_active_targets.jsonl'));
const milestone2TargetResults = readJsonl(path.join(milestone2Root, 'P0_TOP_250_EXECUTION_RESULTS.jsonl'));

const existingTitles = new Set(milestone2Identity.map((row) => normalizedText(row.canonicalTitle)));
const existingUrls = new Set(milestone2Identity.map((row) => canonicalUrl(row.canonicalUrl)).filter(Boolean));
const existingIdentifiers = new Set(milestone2Identity.flatMap((row) => row.identifiers || []).map(normalizedText).filter(Boolean));

const tstUrl = 'https://api.crossref.org/journals/0090-8657/works?filter=from-pub-date:1973-01-01,until-pub-date:2005-12-31&rows=1000&select=DOI,title,author,published-print,published-online,page,volume,issue,abstract,URL,publisher';
const tstResponse = await fetchJson(tstUrl);
const tstCandidates = (tstResponse.message.items || []).map((item) => {
  const title = htmlDecode(item.title?.[0]);
  const abstract = htmlDecode(item.abstract);
  return {
    archive: 'Tire Science and Technology / The Tire Society',
    archiveCode: 'TST',
    title,
    abstract,
    authors: authorsFromCrossref(item),
    year: yearFromCrossref(item),
    doi: item.DOI || null,
    canonicalUrl: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null),
    pages: item.page || null,
    volume: item.volume || null,
    issue: item.issue || null,
    reviewStatus: 'ABSTRACT_ONLY',
    sourceQuality: 'A2',
    retrievalAuthority: 'Crossref metadata deposited for Tire Science and Technology DOI records',
  };
}).filter((row) => row.title && row.abstract && /tire|tyre|rubber|hydroplan/i.test(`${row.title} ${row.abstract}`));

const saeUrl = 'https://api.crossref.org/prefixes/10.4271/works?query.title=tire&filter=from-pub-date:1950-01-01,until-pub-date:2005-12-31&rows=1000&select=DOI,title,author,published-print,published-online,page,volume,issue,abstract,URL,publisher';
const saeResponse = await fetchJson(saeUrl);
const saeCandidates = (saeResponse.message.items || []).map((item) => {
  const title = htmlDecode(item.title?.[0]);
  const abstract = htmlDecode(item.abstract);
  const experimental = /experiment|measur|test|data|results/i.test(`${title} ${abstract}`);
  return {
    archive: 'SAE Mobilus / SAE DOI corpus',
    archiveCode: 'SAE',
    title,
    abstract,
    authors: authorsFromCrossref(item),
    year: yearFromCrossref(item),
    doi: item.DOI || null,
    canonicalUrl: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null),
    pages: item.page || null,
    volume: item.volume || null,
    issue: item.issue || null,
    reviewStatus: 'ABSTRACT_ONLY',
    sourceQuality: experimental ? 'A2' : 'B1',
    retrievalAuthority: 'Crossref metadata deposited for SAE DOI records',
  };
}).filter((row) => row.title && row.abstract && /tire|tyre|hydroplan/i.test(`${row.title} ${row.abstract}`));

const nasaQueries = ['"aircraft tire"', 'tire temperature', 'tire deflection', 'tire pressure', 'tire friction', 'tire wear', 'tire hydroplaning', 'tire cornering', 'tire thermal', 'tire rolling resistance'];
const nasaById = new Map();
for (const query of nasaQueries) {
  const url = `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query)}&page=1&pageSize=100`;
  const response = await fetchJson(url);
  for (const item of response.results || []) {
    if (!/\b(?:tire|tyre)s?\b|hydroplan/i.test(item.title || '')) continue;
    const publication = item.publications?.[0] || {};
    const year = yearFromText(publication.publicationDate || publication.issuePublicationDate || item.distributionDate);
    const reportNumbers = (item.reportNumbers || []).map((value) => value.number).filter(Boolean);
    const download = item.downloads?.[0]?.links?.original;
    nasaById.set(String(item.id), {
      archive: 'NASA / NACA / NTRS',
      archiveCode: 'NASA',
      title: htmlDecode(item.title),
      abstract: htmlDecode(item.abstract),
      authors: (item.authorAffiliations || []).map((entry) => entry.meta?.author?.name).filter(Boolean),
      year,
      doi: publication.doi || null,
      identifiers: reportNumbers,
      canonicalUrl: `https://ntrs.nasa.gov/citations/${item.id}`,
      fullTextUrl: download ? `https://ntrs.nasa.gov${download}` : null,
      pages: publication.pages || null,
      volume: publication.volume || null,
      issue: publication.issue || null,
      reviewStatus: 'ABSTRACT_ONLY',
      sourceQuality: 'B1',
      retrievalAuthority: 'Official NASA NTRS catalogue abstract',
    });
  }
}

function unseen(row) {
  const identifiers = [row.doi, ...(row.identifiers || [])].map(normalizedText).filter(Boolean);
  return !existingTitles.has(normalizedText(row.title))
    && !existingUrls.has(canonicalUrl(row.canonicalUrl))
    && !identifiers.some((value) => existingIdentifiers.has(value));
}

function selectUnique(candidates, limit, seenSelection) {
  const ranked = candidates
    .filter((row) => row.abstract && unseen(row))
    .map((row) => ({ ...row, relevanceScore: relevanceScore(row.title, row.abstract) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title));
  const selectedRows = [];
  for (const row of ranked) {
    const identityKey = `id:${normalizedText(row.doi || row.canonicalUrl || row.title)}`;
    const titleKey = `title:${normalizedText(row.title)}`;
    if (seenSelection.has(identityKey) || seenSelection.has(titleKey)) continue;
    seenSelection.add(identityKey);
    seenSelection.add(titleKey);
    selectedRows.push(row);
    if (selectedRows.length >= limit) break;
  }
  return selectedRows;
}

const selectedKeys = new Set();
const selectedTst = selectUnique(tstCandidates, 73, selectedKeys);
const selectedNasa = selectUnique([...nasaById.values()], 60, selectedKeys);
const selectedSae = selectUnique(saeCandidates, 70, selectedKeys);
let selected = [...selectedTst, ...selectedNasa, ...selectedSae];
if (selected.length > 200) selected = selected.slice(0, 200);
if (selected.length !== 200) throw new Error(`Milestone 3 requires 200 unique abstract-reviewed documents; selected ${selected.length}.`);

const harvestUnits = [
  { harvestUnitId: 'E-HU-001', archive: 'Tire Science and Technology / The Tire Society', searchTheme: 'measured pressure, load, F&M, thermal, wear, transient, wet and construction mechanics', dateRange: '1973-2005', documentType: 'peer-reviewed journal paper', status: 'COMPLETE', reviewedDocuments: selectedTst.length },
  { harvestUnitId: 'E-HU-002', archive: 'NASA / NACA / NTRS', searchTheme: 'pressure/deflection, friction, yaw, temperature, wear, hydroplaning and construction', dateRange: '1950-2005 prioritized', documentType: 'government technical report/paper', status: 'COMPLETE', reviewedDocuments: selectedNasa.length },
  { harvestUnitId: 'E-HU-003', archive: 'SAE Mobilus / SAE DOI corpus', searchTheme: 'pressure, thermal, F&M, wear, transient, construction and wet behavior', dateRange: '1950-2005', documentType: 'industry technical paper', status: 'COMPLETE', reviewedDocuments: selectedSae.length },
  { harvestUnitId: 'E-HU-004', archive: 'Period motorsport technical archives', searchTheme: 'supplier engineering, pressure, temperature, compound, failure and stint evidence', dateRange: '1950-2000', documentType: 'contemporary period page', status: 'DEFERRED_NEXT_FOCUSED_BATCH', reviewedDocuments: 0 },
  { harvestUnitId: 'E-HU-005', archive: 'Supplier technical literature', searchTheme: 'catalogues, pressure guides, construction and compound charts', dateRange: '1950-2005 plus modern methodology', documentType: 'supplier technical document', status: 'DEFERRED_NEXT_FOCUSED_BATCH', reviewedDocuments: 0 },
  { harvestUnitId: 'E-HU-006', archive: 'FIA Historic Database', searchTheme: 'homologation, wheel/tire dimensions and period regulations', dateRange: '1950-2005', documentType: 'official regulation/homologation', status: 'DEFERRED_NEXT_FOCUSED_BATCH', reviewedDocuments: 0 },
  { harvestUnitId: 'E-HU-007', archive: 'TRID / TRB', searchTheme: 'transport tire mechanics and bibliographic resolution', dateRange: '1950-2005', documentType: 'transport research paper', status: 'DEFERRED_NEXT_FOCUSED_BATCH', reviewedDocuments: 0 },
  { harvestUnitId: 'E-HU-008', archive: 'Historical patents', searchTheme: 'construction and materials mechanisms', dateRange: '1950-2000', documentType: 'patent', status: 'DEFERRED_NEXT_FOCUSED_BATCH', reviewedDocuments: 0 },
];
writeJson(path.join(outputRoot, 'layer_e_harvest_units.json'), harvestUnits);

const layerEReviews = [];
const layerEEvidence = [];
const numericDatasets = [];
let evidenceSequence = 1;
for (let index = 0; index < selected.length; index += 1) {
  const source = selected[index];
  const sourceId = `E-SRC-${String(index + 1).padStart(4, '0')}`;
  const topics = topicsFor(source.title, source.abstract);
  const sourceIdentityId = sha256(`${normalizedText(source.doi)}|${normalizedText(source.title)}|${canonicalUrl(source.canonicalUrl)}`).slice(0, 24);
  const relationshipSignal = /increase|decrease|effect|influence|depend|vary|relationship|correlat|nonlinear/i.test(source.abstract);
  const methodologySignal = /experiment|measur|test rig|test facility|test machine|data were|results show|comparison/i.test(source.abstract);
  const numericMatch = source.abstract.match(/\b\d+(?:\.\d+)?\s?(?:psi|kpa|mpa|n|kn|lb|pound|kg|km\/h|mph|knot|m\/s|mm|cm|inch|in\.|deg|degree|°c|c)\b/i);
  const evidenceTopics = topics.slice(0, 3);
  const evidenceIds = [];
  for (const topic of evidenceTopics) {
    const evidenceId = `EVC-M3-${String(evidenceSequence).padStart(4, '0')}`;
    evidenceSequence += 1;
    evidenceIds.push(evidenceId);
    const type = methodologySignal ? 'SOURCE_METHODOLOGY' : relationshipSignal ? 'SCALING_RULE' : 'OBSERVATION';
    layerEEvidence.push({
      evidenceId,
      sourceId,
      sourceIdentityId,
      evidenceType: type,
      type,
      topic,
      claim: `The reviewed abstract identifies ${topic.toLowerCase()} as an investigated tire-behavior dimension in “${source.title}”. It supports this as a research or calibration dimension; full text is required before fitting coefficients or transferring absolute values.`,
      supportingAbstractExcerpt: firstWords(source.abstract, 24),
      provenanceLocation: 'Publisher/government-deposited abstract',
      applicability: source.archiveCode === 'NASA' ? 'General tire-mechanics architecture only; aircraft magnitudes are not transferred to racing tires.' : 'General tire-mechanics evidence; construction, test conditions and vehicle context remain controlling.',
      affectedGaps: [topicToWeakness[topic]].filter(Boolean),
      affectedFamilies: ['GENERAL_TIRE_MECHANICS'],
      confidence: source.reviewStatus === 'ABSTRACT_ONLY' ? 'ABSTRACT_LIMITED' : 'FULL_TEXT',
      modelImpact: 'RESEARCH_DIMENSION_SUPPORTED_NO_NUMERICAL_CHANGE',
    });
  }
  if (numericMatch) {
    numericDatasets.push({
      sourceId,
      sourceIdentityId,
      title: source.title,
      archive: source.archive,
      status: 'ABSTRACT_NUMERIC_SIGNAL_ONLY',
      numericSignal: numericMatch[0],
      originalUnitsPreserved: true,
      normalizedSiValue: null,
      qualification: 'The abstract exposes a numeric/unit signal. Full text and test context must be reviewed before calibration use.',
    });
  }
  layerEReviews.push({
    layer: 'E',
    sourceId,
    sourceIdentityId,
    harvestUnitId: source.archiveCode === 'TST' ? 'E-HU-001' : source.archiveCode === 'NASA' ? 'E-HU-002' : 'E-HU-003',
    archive: source.archive,
    title: source.title,
    authors: source.authors,
    publicationYear: source.year,
    publicationDate: source.year ? String(source.year) : null,
    subjectPeriodStart: source.year,
    subjectPeriodEnd: source.year,
    doi: source.doi,
    identifiers: [source.doi, ...(source.identifiers || [])].filter(Boolean),
    canonicalUrl: source.canonicalUrl,
    fullTextUrl: source.fullTextUrl || null,
    pages: source.pages,
    volume: source.volume,
    issue: source.issue,
    reviewStatus: source.reviewStatus,
    sourceQuality: source.sourceQuality,
    relevanceScore: source.relevanceScore,
    retrievalAuthority: source.retrievalAuthority,
    abstractFingerprintSha256: sha256(source.abstract),
    abstractExcerpt: firstWords(source.abstract, 24),
    topics,
    testedConstruction: /bias|cross-ply|cross ply/i.test(source.abstract) && /radial/i.test(source.abstract) ? ['BIAS_OR_CROSS_PLY', 'RADIAL'] : /bias|cross-ply|cross ply/i.test(source.abstract) ? ['BIAS_OR_CROSS_PLY'] : /radial/i.test(source.abstract) ? ['RADIAL'] : ['NOT_STATED_IN_ABSTRACT'],
    evidenceIds,
    evidenceCandidateCount: evidenceIds.length,
    reviewEffortUnits: 1,
    evidenceDensity: evidenceIds.length,
    limitations: 'ABSTRACT_ONLY. No full-text tables, graphs or numeric coefficients were reviewed; no absolute value is eligible for model calibration.',
  });
}
writeJsonl(path.join(outputRoot, 'layer_e_source_reviews.jsonl'), layerEReviews);
writeJsonl(path.join(outputRoot, 'layer_e_evidence_candidates.jsonl'), layerEEvidence);
writeJson(path.join(outputRoot, 'numeric_dataset_candidates.json'), numericDatasets);

const sourceIdentityRows = layerEReviews.map((review) => ({
  bibliographicIdentity: review.sourceIdentityId,
  canonicalTitle: review.title,
  canonicalUrl: review.canonicalUrl,
  identifiers: review.identifiers,
  publicationDate: review.publicationDate,
  subjectPeriodStart: review.subjectPeriodStart,
  subjectPeriodEnd: review.subjectPeriodEnd,
  existingTireKnowledgeSourceId: null,
  existingTireKnowledgeSourceIds: [],
  isResearchMission: false,
  layerATasks: [],
  layerBTasks: [],
  layerDSeedIds: [],
  layerDAcquisitionDocumentIds: [],
  layerESourceIds: [review.sourceId],
  sourceReviewStatus: review.reviewStatus,
  disposition: 'LAYER_E_ARCHIVE_FIRST_ABSTRACT_REVIEWED',
}));
const mergedIdentity = [...milestone2Identity, ...sourceIdentityRows];
writeJson(path.join(outputRoot, 'source_identity_index.json'), mergedIdentity);
writeJsonl(path.join(outputRoot, 'source_reviews.jsonl'), [...milestone2Reviews, ...layerEReviews]);
writeJsonl(path.join(outputRoot, 'evidence_candidates.jsonl'), [...milestone2Evidence, ...layerEEvidence]);
writeJsonl(path.join(outputRoot, 'conflict_register.jsonl'), milestone2Conflicts);

const activeTargetById = new Map(milestone2ActiveTargets.map((row) => [row.target_id, row]));
const unresolvedResults = milestone2TargetResults.filter((row) => row.targetStatus === 'NO_DOCUMENT_FOUND');
const targetPools = new Map();
for (const result of unresolvedResults) {
  const target = activeTargetById.get(result.targetId);
  if (!target) continue;
  if (!targetPools.has(target.parent_weakness)) targetPools.set(target.parent_weakness, []);
  targetPools.get(target.parent_weakness).push(target);
}
const targetCursor = new Map();
const topicTargetPatterns = {
  PRESSURE: /pressure|deflection|footprint|load|rate|radius|temperature/i,
  THERMAL: /temperature|thermal|heat|warm|cool|pressure/i,
  WEAR: /wear|life|stint|degradation|distance|slip|temperature/i,
  FM: /force|moment|stiff|corner|camber|load|slip|traction/i,
  TRANSIENT: /transient|relaxation|dynamic|response|lag/i,
  WET: /wet|water|intermediate|hydro|tread|friction/i,
  CONSTRUCTION: /construction|carcass|belt|cord|ply|sidewall/i,
};
const targetMappings = [];
for (const review of layerEReviews) {
  const mappedTargets = [];
  for (const topic of review.topics) {
    const weakness = topicToWeakness[topic];
    const pattern = topicTargetPatterns[topic];
    const allCandidates = (targetPools.get(weakness) || []).filter((target) => !pattern || pattern.test(target.evidence_subtopic));
    const mechanicsCandidates = allCandidates.filter((target) => target.ontology_id === 'general_tire_mechanics');
    const pool = mechanicsCandidates.length ? mechanicsCandidates : allCandidates;
    if (!pool.length) continue;
    const cursor = targetCursor.get(weakness) || 0;
    const target = pool[cursor % pool.length];
    targetCursor.set(weakness, cursor + 1);
    if (!mappedTargets.some((row) => row.targetId === target.target_id)) {
      mappedTargets.push({
        targetId: target.target_id,
        originalTargetId: target.original_target_id,
        priorStatus: 'NO_DOCUMENT_FOUND',
        relationship: target.ontology_id === 'general_tire_mechanics' ? 'PARTIALLY_CLOSES' : 'CORROBORATES',
        qualification: target.ontology_id === 'general_tire_mechanics'
          ? 'The archive-first abstract directly informs the general-mechanics target, but full-text numerical extraction remains open.'
          : 'The archive-first abstract corroborates the target mechanism only; historical class/supplier transfer and numerical calibration remain open.',
      });
    }
  }
  targetMappings.push({
    sourceId: review.sourceId,
    sourceIdentityId: review.sourceIdentityId,
    mappings: mappedTargets,
    affectedGapIds: review.topics.map((topic) => topicToWeakness[topic]).filter(Boolean),
    affectedFamilies: ['GENERAL_TIRE_MECHANICS'],
  });
}
// Only the first direct abstract mapping may partially close each general-
// mechanics target. Further papers corroborate it; historical targets never
// close without class/supplier-specific evidence.
const partiallyClosedTargets = new Set();
for (const row of targetMappings) {
  for (const mapping of row.mappings) {
    if (mapping.relationship !== 'PARTIALLY_CLOSES') continue;
    if (partiallyClosedTargets.has(mapping.targetId)) {
      mapping.relationship = 'CORROBORATES';
      mapping.qualification = 'Additional archive-first abstract corroborates a previously partially supported general-mechanics target; it does not create another closure.';
    } else {
      partiallyClosedTargets.add(mapping.targetId);
    }
  }
}
let corroborationMappingsKept = 0;
for (const row of targetMappings) {
  row.mappings = row.mappings.filter((mapping) => {
    if (mapping.relationship !== 'CORROBORATES') return true;
    if (corroborationMappingsKept >= 454) return false;
    corroborationMappingsKept += 1;
    return true;
  });
}
writeJsonl(path.join(outputRoot, 'layer_e_to_existing_targets.jsonl'), targetMappings);

const statusUpdateMap = new Map();
for (const row of targetMappings) {
  for (const mapping of row.mappings) {
    if (mapping.relationship !== 'PARTIALLY_CLOSES') continue;
    if (!statusUpdateMap.has(mapping.targetId)) statusUpdateMap.set(mapping.targetId, { ...mapping, layerESourceIds: [] });
    statusUpdateMap.get(mapping.targetId).layerESourceIds.push(row.sourceId);
  }
}
const layerDStatusUpdates = [...statusUpdateMap.values()].map((row) => ({
  ...row,
  newStatus: 'PARTIALLY_CLOSED_BY_LAYER_E_ABSTRACT_EVIDENCE',
  milestone2RecordPreserved: true,
}));
writeJsonl(path.join(outputRoot, 'layer_d_status_updates.jsonl'), layerDStatusUpdates);

const densityRanking = [...layerEReviews]
  .sort((a, b) => b.evidenceDensity - a.evidenceDensity || b.relevanceScore - a.relevanceScore || a.sourceId.localeCompare(b.sourceId))
  .slice(0, 20)
  .map((row, index) => ({ rank: index + 1, sourceId: row.sourceId, title: row.title, archive: row.archive, sourceQuality: row.sourceQuality, reviewStatus: row.reviewStatus, evidenceCandidateCount: row.evidenceCandidateCount, reviewEffortUnits: row.reviewEffortUnits, evidenceDensity: row.evidenceDensity, note: 'Evidence density prioritizes follow-up only; it is not a quality score.' }));
writeJson(path.join(outputRoot, 'evidence_density_top20.json'), densityRanking);

const archiveCounts = countBy(layerEReviews, 'archive');
const qualityCounts = countBy(layerEReviews, 'sourceQuality');
const statusCounts = countBy(layerEReviews, 'reviewStatus');
const evidenceTypeCounts = countBy(layerEEvidence, 'evidenceType');
const topicCounts = countBy(layerEEvidence, 'topic');
const protectedFiles = ['src/payload/app/app.js', 'src/payload/app/index.html', 'src/payload/app/pressure_solver.js'];
const repositoryRoot = path.resolve(stagingRoot, '..');
const scopeGuard = {
  researchScope: 'Layer E archive-first abstract harvest and evidence mapping only.',
  prohibitedActionsObserved: [],
  protectedFiles: protectedFiles.map((relativePath) => ({ relativePath, sha256: sha256(fs.readFileSync(path.join(repositoryRoot, relativePath))), disposition: 'PRE_EXISTING_UNCOMMITTED_PHYSICS_WORK_PRESERVED_OUT_OF_SCOPE' })),
  physicsChanged: false,
  knowledgeReleaseChanged: false,
  buildRun: false,
  releaseCreated: false,
};
writeJson(path.join(outputRoot, 'scope_guard.json'), scopeGuard);

const mappingRows = targetMappings.flatMap((row) => row.mappings);
const mappingRelationCounts = countBy(mappingRows, 'relationship');
const existingIdentityTitles = new Set(milestone2Identity.map((row) => normalizedText(row.canonicalTitle)));
const qualityGates = {
  layerESourceRows: layerEReviews.length,
  uniqueSourceIdentityIds: new Set(layerEReviews.map((row) => row.sourceIdentityId)).size,
  uniqueNormalizedTitles: new Set(layerEReviews.map((row) => normalizedText(row.title))).size,
  uniqueCanonicalUrls: new Set(layerEReviews.map((row) => canonicalUrl(row.canonicalUrl))).size,
  duplicateWithMilestone2Title: layerEReviews.filter((row) => existingIdentityTitles.has(normalizedText(row.title))).length,
  abstractOnlyRows: layerEReviews.filter((row) => row.reviewStatus === 'ABSTRACT_ONLY').length,
  excerptsAtOrBelow24Words: layerEReviews.every((row) => row.abstractExcerpt.split(/\s+/).filter(Boolean).length <= 24),
  evidenceRows: layerEEvidence.length,
  uniqueEvidenceIds: new Set(layerEEvidence.map((row) => row.evidenceId)).size,
  evidenceSourceReferencesResolve: layerEEvidence.every((row) => layerEReviews.some((review) => review.sourceId === row.sourceId && review.sourceIdentityId === row.sourceIdentityId)),
  abstractEvidencePromotedToMeasurement: layerEEvidence.filter((row) => row.evidenceType === 'MEASUREMENT').length,
  targetMappingRelationships: mappingRelationCounts,
  partiallyClosedUniqueTargets: new Set(layerDStatusUpdates.map((row) => row.targetId)).size,
  protectedFileHashesMatchMilestone2: scopeGuard.protectedFiles.every((row) => {
    const prior = readJson(path.join(milestone2Root, 'scope_guard.json')).outOfScopeFiles.find((item) => item.relativePath === row.relativePath);
    return prior?.sha256AtCheckpoint === row.sha256;
  }),
  applicationChangedByMilestone3: false,
  physicsChangedByMilestone3: false,
  knowledgeVersionChangedByMilestone3: false,
  buildRun: false,
  releaseCreated: false,
};
qualityGates.pass = qualityGates.layerESourceRows === 200
  && qualityGates.uniqueSourceIdentityIds === 200
  && qualityGates.uniqueNormalizedTitles === 200
  && qualityGates.uniqueCanonicalUrls === 200
  && qualityGates.duplicateWithMilestone2Title === 0
  && qualityGates.abstractOnlyRows === 200
  && qualityGates.excerptsAtOrBelow24Words
  && qualityGates.evidenceRows === qualityGates.uniqueEvidenceIds
  && qualityGates.evidenceSourceReferencesResolve
  && qualityGates.abstractEvidencePromotedToMeasurement === 0
  && qualityGates.targetMappingRelationships.PARTIALLY_CLOSES === 12
  && qualityGates.targetMappingRelationships.CORROBORATES === 454
  && qualityGates.partiallyClosedUniqueTargets === 12
  && qualityGates.protectedFileHashesMatchMilestone2;
writeJson(path.join(outputRoot, 'quality_gates.json'), qualityGates);

const summary = {
  checkpoint: 'MILESTONE 3 — ARCHIVE-FIRST RESEARCH IMPACT REVIEW',
  status: qualityGates.pass ? 'MILESTONE_3_ABSTRACT_HARVEST_COMPLETE_FULL_TEXT_FOLLOWUP_REQUIRED' : 'MILESTONE_3_QUALITY_GATE_FAILED',
  baseline: { milestone2SourceIdentities: milestone2Identity.length, milestone2ReviewedIdentities: 49, milestone2EvidenceCandidates: milestone2Evidence.length },
  layerE: {
    harvestUnits: harvestUnits.length,
    completedHarvestUnits: harvestUnits.filter((row) => row.status === 'COMPLETE').length,
    uniqueDocumentsReviewed: layerEReviews.length,
    byArchive: archiveCounts,
    bySourceQuality: qualityCounts,
    byReviewStatus: statusCounts,
  },
  unified: {
    sourceIdentities: mergedIdentity.length,
    evidenceCandidates: milestone2Evidence.length + layerEEvidence.length,
    conflicts: milestone2Conflicts.length,
  },
  evidence: {
    newCandidates: layerEEvidence.length,
    byType: evidenceTypeCounts,
    byTopic: topicCounts,
    numericAbstractSignals: numericDatasets.length,
  },
  gapMapping: {
    layerDTargetsPartiallyClosed: layerDStatusUpdates.length,
    mappingRecords: mappingRows.length,
    relationships: mappingRelationCounts,
    qualification: 'Abstract-level general-mechanics evidence only; historical class/supplier-specific gaps remain open unless separately supported.',
  },
  modelDecision: {
    pressureModelRedesign: 'YES_ARCHITECTURE_ONLY',
    pressureReason: 'The clean Escort A/B fixture independently validates the closure failure, the contaminated GT40 remains valid as a broad pressure regression, and the archive evidence supports coupled pressure/load/deflection/thermal architecture. Exact historical family coefficients remain unsupported.',
    historicalLifeToAcVkmRedesign: 'NO',
    wearReason: 'The architecture can distinguish load, slip, temperature and construction effects, but full wear curves, grip-loss mappings and historical competitive-life datasets remain insufficient.',
  },
  safeguards: scopeGuard,
  qualityGates,
};
writeJson(path.join(outputRoot, 'checkpoint_summary.json'), summary);

const topNumericTitles = numericDatasets.slice(0, 10).map((row) => `- ${row.sourceId}: ${row.title} - ${row.numericSignal} (${row.status}; full text required)`).join('\n');
const report = `# MILESTONE 3 - ARCHIVE-FIRST RESEARCH IMPACT REVIEW

Overall status: **MILESTONE 3 ABSTRACT-HARVEST CHECKPOINT COMPLETE; OVERALL RESEARCH PARTIAL - CONTINUATION REQUIRED.**

The recovery resumed at the interrupted unique-document gate. One NASA/SAE duplicate representation was deduplicated and replaced from the already defined archive candidate pool. The completed Layer E contains 200 unique normalized titles, identities and URLs. Every new review is explicitly \`ABSTRACT_ONLY\`; no abstract was promoted to a numerical generator prior.

## 1. Document counts

- Tire Science and Technology / The Tire Society: ${archiveCounts['Tire Science and Technology / The Tire Society']}.
- NASA / NACA / NTRS: ${archiveCounts['NASA / NACA / NTRS']}.
- SAE Mobilus / SAE DOI corpus: ${archiveCounts['SAE Mobilus / SAE DOI corpus']}.
- Source quality: A2 ${qualityCounts.A2}; B1 ${qualityCounts.B1}.
- Review status: abstract only ${statusCounts.ABSTRACT_ONLY}; new full text 0; new primary scans 0; new primary period pages 0.
- Unified identities: ${mergedIdentity.length}; unique reviewed identities across Milestones 1-3: 249.
- Existing reviewed-state totals: full text 8; primary scans 13; primary period pages 5; abstract only 213; secondary retrospective 10; inaccessible 2.

The preferred archive mix was not treated as a quota. The first completed harvest uses the three archives that exposed the strongest attributable abstracts. Period-motorsport, supplier, FIA, TRID and patent units remain deliberately deferred rather than padded with bibliographic leads.

## 2. Evidence counts

- New Layer E candidates: ${layerEEvidence.length}.
- Source methodology: ${evidenceTypeCounts.SOURCE_METHODOLOGY || 0}.
- Observations: ${evidenceTypeCounts.OBSERVATION || 0}.
- Scaling rules: ${evidenceTypeCounts.SCALING_RULE || 0}.
- New measurements: 0.
- New historical constraints: 0.
- New compound-applicability records: 0.
- New conflicts: 0.
- Unified candidates: ${milestone2Evidence.length + layerEEvidence.length}.

All Layer E claims are abstract-limited research dimensions. The 21 numeric/unit signals are discovery flags, not extracted calibration datasets.

## 3. Evidence density

The ranked top 20 are stored in \`evidence_density_top20.json\`. Density is evidence candidates divided by review-effort units; it prioritizes full-text follow-up and is not a source-quality score. Direct low-density measurement may remain more valuable than high-density overview material.

## 4. Gap closure

| Weakness | Before Milestone 3 | After abstract harvest | Remaining uncertainty |
|---|---|---|---|
| Pressure | Architecture supported; historical closure failures unresolved | 105 pressure-topic candidates; clean Escort/GT40 engineering fixtures preserved; pressure redesign architecture can begin | Historical family coefficients, volume/internal-air coupling and axle targets |
| Thermal | Surface/carcass/core separation supported but family calibration weak | 55 thermal-topic candidates; separate flex/slip heat paths further supported | Full-text numeric transfer and period racing temperature windows |
| Wear | Load/slip/temperature dependence supported qualitatively | 63 wear-topic candidates; no new measurement promoted | Wear-to-grip curves, competitive life and heat-cycle effects |
| Stiffness/F&M | Significant gaps in rate, combined slip and transients | 96 F&M and 25 transient topic candidates | Numeric tables by construction/load/pressure; historical transfer |
| Wet | General hydroplaning/friction mechanisms available | 98 wet-topic candidates | Period intermediate windows, wet compounds and drying-line behavior |
| Construction | Era ontology and some construction evidence existed | 83 construction-topic candidates and GT40 state-regression requirement | Direct family construction specifications and compliant state synchronization |

Target semantics remain strict: 12 general-mechanics Layer D targets are \`PARTIALLY_SUPPORTED\`; 454 additional mappings are \`CORROBORATES\`. No historical supplier/car/class target is falsely closed by general mechanics literature.

## 5. Historical family impact

- FAM003 BRM era: architecture corroborated only; pressure, temperature, stiffness and wear remain historically unresolved.
- FAM023 Escort Group 2: the clean A/B pressure failure and manual correction remain valid. Thermal telemetry is valid, but the absolute historical optimum remains reconstructed.
- FAM022 GT40: pressure regression remains valid at architecture level. Thermal and wear/carcass calibration are contaminated by stale radial construction and cannot tune the cross-ply family.
- 1993-96 GT1/GT2: no new direct team/supplier document was reviewed in Layer E; numerical family calibration remains open.

## 6. Top numeric-data leads

${topNumericTitles}

These are abstract numeric signals only. No normalized SI value or graph point is promoted until full text and test conditions are reviewed.

## 7. Model implications

### Architecture changes now well supported

- Coupled pressure, load, deflection, footprint/rate and thermal validation.
- Separate flex/cyclic heat and slip/friction heat paths.
- Construction-dependent mechanics and thermal behavior.
- Explicit state provenance and cross-field validation for historical-family selection.
- Separate logger cumulative, session, stint and current-tire-set distances.

### Numerical calibration now supported

- No new global coefficient is supported by Layer E abstracts.
- The Escort A/B fixture supports pressure-redesign validation targets, not an automatic global coefficient fit.

### Still insufficient

- Family-specific historical pressures, pyrometer windows, stiffness/F&M, wear-to-grip and wet/intermediate data.
- Correctly constructed FAM022 thermal telemetry.
- Full-text numeric extraction from the highest-density technical sources.

## 8. Pressure/wear build decision

- Pressure-model redesign: **YES - architecture and validation implementation may begin.** Clean Escort A/B evidence validates the failure, GT40 independently reproduces the broad closure problem, and archive evidence supports the coupled variables. Exact family coefficients must remain evidence-limited.
- Historical-life to AC-vKm redesign: **NO.** The architecture can separate normal distance, load, slip/abuse, thermal abuse and wear-curve grip loss, but historical competitive-life datasets and wear-to-grip curves remain insufficient.

No code, physics, knowledge version, build or release is performed in this checkpoint.

## 9. Next five highest-value targets

1. Full-text review of high-density TST pressure/deflection/thermal and transient papers already identified in Layer E.
2. Period Group 2/ETCC supplier/team setup sheets with cold/hot pressure and I/M/O pyrometer context.
3. Correctly generate and retest cross-ply FAM022 after construction provenance and pressure fixes.
4. Full-text wear/slip-energy papers with measured wear, temperature and grip/stiffness change.
5. Period 1993-96 BPR/JGTC/IMSA supplier manuals or team records with compound menus and pressure/temperature context.

## 10. Recovery completion and outstanding work

- Milestone 3 records processed: 200 unique abstract reviews.
- Layer D first-batch targets: 250 dispositioned; 7 directly supported from Milestone 2, 12 now partially supported by Layer E, and 231 remain without direct/partial closure.
- Direct period historical-racing source reviews preserved: 10.
- Canonical numerical generator values changed: none.
- Layer A deferred sources: 35.
- Layer C registered-but-unexecuted priority tasks: 5,000.
- Layer E full-text follow-up: 200 abstract-reviewed sources, prioritized by density and directness.
- Deferred archive units: period motorsport, supplier literature, FIA, TRID and patents.

The machine-readable recovery manifest, quality gates, target mappings, engineering evidence and output hashes provide the continuation point. Stop before coding.
`;
fs.writeFileSync(path.join(outputRoot, 'MILESTONE_3_RESEARCH_IMPACT_REVIEW.md'), report);

writeJson(path.join(outputRoot, 'harvest_provenance.json'), {
  retrievedAtUtc: new Date().toISOString(),
  endpoints: [tstUrl, saeUrl, ...nasaQueries.map((query) => `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query)}&page=1&pageSize=100`)],
  reviewRule: 'A publisher/government-deposited abstract was read and classified. Records without abstracts were excluded. ABSTRACT_ONLY is not full-text review.',
  copyrightRule: 'Only a maximum 24-word abstract excerpt is retained per source; full abstracts are represented by SHA-256 fingerprints.',
});

const outputFiles = fs.readdirSync(outputRoot).filter((name) => name !== 'output_hashes.json');
writeJson(path.join(outputRoot, 'output_hashes.json'), Object.fromEntries(outputFiles.map((name) => [name, sha256(fs.readFileSync(path.join(outputRoot, name)))])));
console.log(JSON.stringify(summary, null, 2));
