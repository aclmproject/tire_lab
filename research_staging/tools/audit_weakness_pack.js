const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const stagingRoot = path.resolve(__dirname, '..');
const packRoot = path.join(stagingRoot, 'weakness_10000_handoff', 'ACLM_Tire_Lab_10000_Weakness_Document_Corpus_Pack');
const outputRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_000_audit');
fs.mkdirSync(outputRoot, { recursive: true });

const readJsonl = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const countBy = (rows, key) => rows.reduce((acc, row) => { const value = row[key] ?? 'UNSPECIFIED'; acc[value] = (acc[value] || 0) + 1; return acc; }, {});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((r) => r.some((v) => v !== '')).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

function canonicalUrl(value) {
  if (!value) return '';
  try {
    const u = new URL(value.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

const manifestFile = path.join(packRoot, 'DOCUMENT_ACQUISITION_MANIFEST.jsonl');
const p0File = path.join(packRoot, 'P0_FIRST_1000.jsonl');
const stats = JSON.parse(fs.readFileSync(path.join(packRoot, 'PACK_STATS.json'), 'utf8'));
const manifest = readJsonl(manifestFile);
const p0 = readJsonl(p0File);
const seeds = parseCsv(fs.readFileSync(path.join(packRoot, 'VERIFIED_FRESH_SEED_SOURCES.csv'), 'utf8'));
const shardIndex = parseCsv(fs.readFileSync(path.join(packRoot, 'SHARD_INDEX.csv'), 'utf8'));
const priorIdentityIndex = JSON.parse(fs.readFileSync(path.join(stagingRoot, 'checkpoint_001_milestone1', 'source_identity_index.json'), 'utf8'));
const priorUrls = new Map(priorIdentityIndex.filter((row) => !row.isResearchMission && row.canonicalUrl).map((row) => [canonicalUrl(row.canonicalUrl), row]));

const intervalRules = {
  'BPR GT1': [1994, 1996],
  'Le Mans GT1': [1994, 1999],
  'GT40/1960s endurance': [1964, 1971],
  'Group C/IMSA GTP': [1981, 1993],
  'GT2/GTS': [1994, 2005],
  'Group A/DTM touring': [1982, 1996],
  'Japanese JGTC/GT500': [1993, 2010],
  'Group 2/ETCC touring': [1963, 1981],
  'IMSA GTS/GT': [1971, 1998],
  '1950s-60s sports racing': [1950, 1971],
  'Can-Am/Group 7': [1966, 1974],
};

function temporalAudit(row) {
  const rule = intervalRules[row.series_class];
  if (!rule) return { scopeAudit: 'NO_OBVIOUS_TEMPORAL_CONFLICT', reason: null };
  const [validStart, validEnd] = rule;
  const start = Number(row.year_start);
  const end = Number(row.year_end);
  if (end < validStart || start > validEnd) {
    return {
      scopeAudit: 'TEMPORAL_LABEL_CONFLICT',
      reason: `${row.series_class} is scoped here to approximately ${validStart}-${validEnd}, but the generated target requests ${start}-${end}.`,
    };
  }
  if (start < validStart || end > validEnd) {
    return {
      scopeAudit: 'PARTIAL_TEMPORAL_OVERLAP',
      reason: `${row.series_class} overlaps only part of the generated ${start}-${end} interval; constrain acquisition to approximately ${Math.max(start, validStart)}-${Math.min(end, validEnd)}.`,
    };
  }
  return { scopeAudit: 'TEMPORALLY_PLAUSIBLE', reason: null };
}

const temporalFlags = p0.map((row) => ({ documentTargetId: row.document_target_id, seriesClass: row.series_class, era: row.era, ...temporalAudit(row) })).filter((row) => row.scopeAudit !== 'NO_OBVIOUS_TEMPORAL_CONFLICT' && row.scopeAudit !== 'TEMPORALLY_PLAUSIBLE');
const temporalById = new Map(temporalFlags.map((row) => [row.documentTargetId, row]));

const ledger = p0.map((row) => {
  const flag = temporalById.get(row.document_target_id);
  return {
    documentTargetId: row.document_target_id,
    weaknessId: row.weakness_id,
    priority: row.priority,
    era: row.era,
    seriesClass: row.series_class,
    supplier: row.supplier,
    evidenceSubtopic: row.evidence_subtopic,
    repositoryTarget: row.repository_target,
    searchQuery: row.search_query,
    acquisitionStatus: flag?.scopeAudit === 'TEMPORAL_LABEL_CONFLICT' ? 'OUT_OF_SCOPE_PENDING_TARGET_CORRECTION' : 'PENDING_DOCUMENT_ACQUISITION',
    scopeAudit: flag?.scopeAudit || temporalAudit(row).scopeAudit,
    scopeNote: flag?.reason || null,
    resolvedDocumentId: null,
    reviewStatus: null,
    evidenceCandidateIds: [],
    noCountClaim: true,
  };
});

const seedRegistry = seeds.map((seed) => {
  const normalized = canonicalUrl(seed.url);
  const prior = priorUrls.get(normalized);
  return {
    seedId: seed.seed_id,
    title: seed.title,
    year: seed.year,
    publisher: seed.publisher,
    canonicalUrl: normalized,
    focus: seed.focus,
    suppliedVerificationStatus: seed.verification_status,
    currentReviewStatus: 'NOT_YET_REVIEWED_IN_THIS_CHECKPOINT',
    duplicateOfPriorCandidate: prior ? { bibliographicIdentity: prior.bibliographicIdentity, title: prior.canonicalTitle, existingTireKnowledgeSourceIds: prior.existingTireKnowledgeSourceIds } : null,
    resolvedDocumentId: null,
  };
});

const manifestIds = manifest.map((row) => row.document_target_id);
const p0Ids = new Set(p0.map((row) => row.document_target_id));
const manifestP0Ids = new Set(manifest.filter((row) => row.priority === 'P0').map((row) => row.document_target_id));
const shardFiles = shardIndex.map((row) => path.join(packRoot, row.filename));
const shardRows = shardFiles.flatMap(readJsonl);
const shardIds = shardRows.map((row) => row.document_target_id);
const exactTuple = (row) => [row.weakness_id, row.era, row.series_class, row.supplier, row.evidence_subtopic, row.repository_target, row.target_document_type].join('|');
const tupleCounts = new Map();
for (const row of p0) tupleCounts.set(exactTuple(row), (tupleCounts.get(exactTuple(row)) || 0) + 1);

writeJsonl(path.join(outputRoot, 'p0_acquisition_ledger.jsonl'), ledger);
writeJsonl(path.join(outputRoot, 'temporal_scope_flags.jsonl'), temporalFlags);
writeJsonl(path.join(outputRoot, 'verified_seed_registry.jsonl'), seedRegistry);

const summary = {
  checkpoint: 'Weakness corpus package audit before document acquisition',
  input: {
    zipSha256: 'aa52ee6597c6653aab273cb7fc75190615cd28c8c25170c19bfe2ccd13542df8',
    manifestSha256Computed: sha256(manifestFile),
    manifestSha256Declared: stats.manifest_sha256,
  },
  corpus: {
    manifestTargets: manifest.length,
    p0Targets: p0.length,
    shardCount: shardIndex.length,
    shardRows: shardRows.length,
    seedRows: seeds.length,
    uniqueManifestIds: new Set(manifestIds).size,
    uniqueP0Ids: p0Ids.size,
    uniqueShardIds: new Set(shardIds).size,
    p0WeaknessCounts: countBy(p0, 'weakness_id'),
    p0RepositoryCounts: countBy(p0, 'repository_target'),
  },
  scopeAudit: {
    statusCounts: countBy(ledger, 'scopeAudit'),
    temporalConflictCount: temporalFlags.filter((row) => row.scopeAudit === 'TEMPORAL_LABEL_CONFLICT').length,
    partialOverlapCount: temporalFlags.filter((row) => row.scopeAudit === 'PARTIAL_TEMPORAL_OVERLAP').length,
    exactDuplicateQueryCount: p0.length - new Set(p0.map((row) => row.search_query)).size,
    duplicateTargetTupleCount: [...tupleCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0),
    note: 'Temporal flags are target-quality findings, not claims that a searched document does or does not exist.',
  },
  seedDedup: {
    suppliedSeedCount: seedRegistry.length,
    exactCanonicalUrlMatchesToPriorCandidateMap: seedRegistry.filter((row) => row.duplicateOfPriorCandidate).length,
    actuallyReviewedThisCheckpoint: 0,
    resolvedUniqueDocumentsThisCheckpoint: 0,
  },
  integrity: {
    manifestHashMatches: sha256(manifestFile) === stats.manifest_sha256,
    manifestHas10000Rows: manifest.length === 10000,
    p0Has1000Rows: p0.length === 1000,
    manifestIdsUnique: new Set(manifestIds).size === manifest.length,
    p0IdsUnique: p0Ids.size === p0.length,
    p0ExactlyMatchesManifestP0: p0Ids.size === manifestP0Ids.size && [...p0Ids].every((id) => manifestP0Ids.has(id)),
    shardsHave10000Rows: shardRows.length === 10000,
    shardIdsUnique: new Set(shardIds).size === shardRows.length,
    shardsCoverManifestExactly: new Set(shardIds).size === new Set(manifestIds).size && shardIds.every((id) => new Set(manifestIds).has(id)),
    everyLedgerRowHasNoCountClaim: ledger.every((row) => row.noCountClaim === true && row.resolvedDocumentId === null),
  },
  disposition: {
    canonicalKnowledgeChanged: false,
    applicationChanged: false,
    numericalGeneratorChanges: [],
    acquisitionCanStart: true,
    caution: 'Correct or constrain temporal-label conflicts before spending searches on those targets.',
  },
};
summary.integrity.pass = Object.values(summary.integrity).every(Boolean);
fs.writeFileSync(path.join(outputRoot, 'pack_audit.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
