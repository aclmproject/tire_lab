const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const stagingRoot = path.resolve(__dirname, '..');
const auditRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_000_audit');
const outputRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_001_seed_review');
fs.mkdirSync(outputRoot, { recursive: true });

const readJsonl = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const countBy = (rows, key) => rows.reduce((acc, row) => { const value = row[key] ?? 'UNSPECIFIED'; acc[value] = (acc[value] || 0) + 1; return acc; }, {});

const seedRegistry = readJsonl(path.join(auditRoot, 'verified_seed_registry.jsonl'));
const audit = JSON.parse(fs.readFileSync(path.join(auditRoot, 'pack_audit.json'), 'utf8'));

const reviewMap = {
  'MS-BRM-THERMAL': { documentId: 'WDOC-0001', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'SECONDARY_HISTORICAL_QUOTING_PRIMARY_REPORT', issueDate: '2011-03', evidenceIds: ['WEVC-0001', 'WEVC-0002', 'WEVC-0003'], note: 'Full article subsection reviewed; it quotes a 1953 Dunlop test report that was not independently obtained.' },
  'MS-1969-WG': { documentId: 'WDOC-0003', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'DIRECT_PERIOD_RACING', issueDate: '1969-08', evidenceIds: ['WEVC-0005', 'WEVC-0006'], note: null },
  'MS-1978-CC': { documentId: 'WDOC-0004', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'DIRECT_PERIOD_RACING', issueDate: '1978-09', evidenceIds: ['WEVC-0007', 'WEVC-0008'], note: null },
  'MS-1979-USGP-E': { documentId: 'WDOC-0005', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'DIRECT_PERIOD_RACING', issueDate: '1979-11', evidenceIds: ['WEVC-0009', 'WEVC-0010'], note: null },
  'MS-1972-ELAN': { documentId: 'WDOC-0006', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'DIRECT_PERIOD_RACING', issueDate: '1972-01', evidenceIds: ['WEVC-0011'], note: null },
  'MS-1973-GARDNER': { documentId: 'WDOC-0007', reviewStatus: 'FULL_TEXT_REVIEWED', provenance: 'DIRECT_PERIOD_RACING', issueDate: '1973-01', evidenceIds: ['WEVC-0012', 'WEVC-0013', 'WEVC-0014'], note: null },
  'NASA-TP-1569': { documentId: 'WDOC-0008', reviewStatus: 'INACCESSIBLE', provenance: 'GOVERNMENT_ACADEMIC_FOUNDATIONAL', issueDate: '1979', evidenceIds: [], note: 'Stable NASA citation identity supplied, but the NTRS page returned HTTP 403 in this review environment; no report claim was extracted.' },
};

const reviews = seedRegistry.map((seed) => {
  const key = seed.seedId;
  const review = reviewMap[key];
  return {
    ...seed,
    normalizedSeedId: key,
    resolvedDocumentId: review?.documentId || null,
    currentReviewStatus: review?.reviewStatus || 'NOT_YET_REVIEWED_IN_THIS_CHECKPOINT',
    provenance: review?.provenance || null,
    issueDate: review?.issueDate || null,
    evidenceCandidateIds: review?.evidenceIds || [],
    reviewNote: review?.note || null,
    p0TargetSatisfied: false,
    p0TargetNote: review ? 'Document was reviewed as a high-value seed, but no generated P0 target was marked satisfied without an exact scope match.' : null,
  };
});

const evidence = [
  { evidenceId: 'WEVC-0001', documentId: 'WDOC-0001', weaknessId: 'W01_PRESSURE_TEMP_SETUP', type: 'MEASUREMENT', claim: 'A quoted 1953 Dunlop BRM test used 4-6 mm tread tires at 42 psi, averaged 90-95 mph for nine minutes, and measured about 65 C tread temperature.', provenanceLocation: 'Motor Sport Doug Nye article, lines 186-189 in reviewed rendering; underlying Dunlop report not independently reviewed', units: ['mm', 'psi', 'mph', 'minute', 'degC'], observable: 'tread temperature', applicability: 'BRM V16/Dunlop test only; secondary quotation of a primary report; not BRM P48.', modelImpact: 'NO_NUMERICAL_CHANGE' },
  { evidenceId: 'WEVC-0002', documentId: 'WDOC-0001', weaknessId: 'W10_RR_HYSTERESIS_THERMAL', type: 'MEASUREMENT', claim: 'The quoted testing found rear-tire airstream temperature roughly 10-60 C above ambient depending on exhaust arrangement; rerouting reduced the local excess.', provenanceLocation: 'Same article, lines 186-193', units: ['degC above ambient'], observable: 'air stream adjacent to rear tire', applicability: 'External exhaust heating, not carcass/core or cavity temperature.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'WEVC-0003', documentId: 'WDOC-0001', weaknessId: 'W09_HEAT_CYCLE_AGING_DAMAGE', type: 'HISTORICAL_OBSERVATION', claim: 'The article links the 1953 Albi investigation to repeated rear-tire tread stripping and reports changes between 17- and 18-inch rear wheels and unusually high inflation choices.', provenanceLocation: 'Same article, lines 178-188', observable: 'failure/fitment/inflation', applicability: 'Secondary historical account with OCR ambiguity; preserve exact car/event context.', modelImpact: 'NO_NUMERICAL_CHANGE' },
  { evidenceId: 'WEVC-0005', documentId: 'WDOC-0003', weaknessId: 'W04_WET_INTERMEDIATE', type: 'EVENT_SUPPLIER_EVIDENCE', claim: 'At Watkins Glen in 1969, lightweight Porsche 908s could use Dunlop 970 intermediates with CR.82 tread in mixed weather, while heavier Matras risked overheating those tires if the track stayed dry and chose Dunlop 184 dry tires.', provenanceLocation: 'Motor Sport Watkins Glen 6 Hours, lines 200-205', applicability: 'Direct event-specific evidence; not a universal weight threshold.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'WEVC-0006', documentId: 'WDOC-0003', weaknessId: 'W04_WET_INTERMEDIATE', type: 'SCALING_RULE', claim: 'Vehicle mass/load can change whether an intermediate construction remains viable as conditions dry, creating a class/car-specific compound menu rather than a universal menu.', provenanceLocation: 'Interpretation trace from WEVC-0005', applicability: 'Causal interpretation grounded in the period observation; no numeric threshold.', modelImpact: 'ARCHITECTURE_PROPOSAL' },
  { evidenceId: 'WEVC-0007', documentId: 'WDOC-0004', weaknessId: 'W09_HEAT_CYCLE_AGING_DAMAGE', type: 'HISTORICAL_OBSERVATION', claim: 'CC Racing reported Goodyear G57 tires failing rapidly during Spa practice, substituting Dunlops for grid qualification, then racing on suitably modified G57s.', provenanceLocation: 'Motor Sport CC Racing Developments, lines 207-211', applicability: '1978 Group 1 Capri/team/event context; failure cause and modification details not given.', modelImpact: 'KNOWLEDGE_CANDIDATE_ONLY' },
  { evidenceId: 'WEVC-0008', documentId: 'WDOC-0004', weaknessId: 'W04_WET_INTERMEDIATE', type: 'EVENT_SUPPLIER_EVIDENCE', claim: 'The same team used Michelin intermediates at Donington because they judged them especially effective in damp rather than fully wet conditions.', provenanceLocation: 'Same article, lines 209-211', applicability: 'Team/event judgment; supports a distinct damp/intermediate state.', modelImpact: 'FAMILY_MENU_CANDIDATE' },
  { evidenceId: 'WEVC-0009', documentId: 'WDOC-0005', weaknessId: 'W01_PRESSURE_TEMP_SETUP', type: 'HISTORICAL_OBSERVATION', claim: 'Very cold conditions at the 1979 US GP East kept tires and brakes below effective temperature, and a driver on special qualifying Goodyears lost control before recognizing their optimum state.', provenanceLocation: 'Motor Sport 1979 US GP East, lines 228-234', observable: 'operational warm-up state; no numeric tire temperature', applicability: 'Direct event observation; no optimum temperature value supplied.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'WEVC-0010', documentId: 'WDOC-0005', weaknessId: 'W04_WET_INTERMEDIATE', type: 'EVENT_SUPPLIER_EVIDENCE', claim: 'In heavy rain at the same event, period reporting judged Michelin wet-weather performance superior to the available Goodyears; later drying required a wet-to-dry transition.', provenanceLocation: 'Same article, lines 203-220 and 248-272', applicability: '1979 F1 event-specific supplier comparison.', modelImpact: 'FAMILY_MENU_CANDIDATE' },
  { evidenceId: 'WEVC-0011', documentId: 'WDOC-0006', weaknessId: 'W06_SUPPLIER_COMPOUNDS', type: 'MEASUREMENT', claim: 'A 1972 Elan track test records Dunlop 350 Intermediate tires in 200/550-13 size, with an 8.5-inch regulatory rim-width limit; the regular driver considered the tire undersized.', provenanceLocation: 'Motor Sport Elan Development, lines 185-190', units: ['tire size 200/550-13', 'inch rim width'], applicability: 'Specific club-racing Elan fitment and period regulation context.', modelImpact: 'FITMENT_DATABASE_CANDIDATE' },
  { evidenceId: 'WEVC-0012', documentId: 'WDOC-0007', weaknessId: 'W05_CONSTRUCTION_MATERIALS', type: 'SCALING_RULE', claim: 'A 1973 Group 2 Camaro account states that high vehicle weight made tires exceptionally critical and required advanced construction development even when using a compound related to prior Formula One use.', provenanceLocation: 'Motor Sport Frank Gardner Keeps Trucking, lines 194 and 207-213', units: ['28 cwt unladen', '30 cwt with driver/fuel'], applicability: 'Direct team/car account; compound lineage does not imply identical construction or operating targets.', modelImpact: 'ARCHITECTURE_PROPOSAL' },
  { evidenceId: 'WEVC-0013', documentId: 'WDOC-0007', weaknessId: 'W04_WET_INTERMEDIATE', type: 'HISTORICAL_OBSERVATION', claim: 'The heavy Camaro required two or three intermediate tire types for damp-condition sensitivity, while lighter saloons could rely on one.', provenanceLocation: 'Same article, lines 210-213', applicability: 'Direct period evidence for car/load-specific compound menus; no universal mass threshold.', modelImpact: 'FAMILY_MENU_CANDIDATE' },
  { evidenceId: 'WEVC-0014', documentId: 'WDOC-0007', weaknessId: 'W07_FITMENT_GEOMETRY_REGS', type: 'MEASUREMENT', claim: 'The Camaro used 10x15-inch front and 14x15-inch rear wheels, with reported rubber widths on the road of about 10 and 13 inches respectively.', provenanceLocation: 'Same article, lines 212-214', units: ['inch'], applicability: '1973 SCA Group 2 Camaro fitment.', modelImpact: 'FITMENT_DATABASE_CANDIDATE' },
];

writeJsonl(path.join(outputRoot, 'seed_source_reviews.jsonl'), reviews);
writeJsonl(path.join(outputRoot, 'seed_evidence_candidates.jsonl'), evidence);

const reviewed = reviews.filter((row) => row.resolvedDocumentId);
const reviewedDocumentIds = new Set(reviewed.map((row) => row.resolvedDocumentId));
const orphanEvidenceDocumentIds = [...new Set(evidence.filter((row) => !reviewedDocumentIds.has(row.documentId)).map((row) => row.documentId))];
const summary = {
  checkpoint: 'Weakness corpus high-value seed review; P0 milestone not complete',
  packageAudit: {
    manifestTargets: audit.corpus.manifestTargets,
    p0Targets: audit.corpus.p0Targets,
    temporalConflicts: audit.scopeAudit.temporalConflictCount,
    partialTemporalOverlaps: audit.scopeAudit.partialOverlapCount,
  },
  sourceResolution: {
    uniqueRealDocumentsBibliographicallyResolved: new Set(reviewed.map((row) => row.resolvedDocumentId)).size,
    fullTextReviewed: reviewed.filter((row) => row.currentReviewStatus === 'FULL_TEXT_REVIEWED').length,
    inaccessible: reviewed.filter((row) => row.currentReviewStatus === 'INACCESSIBLE').length,
    p0TargetsSatisfied: 0,
    remainingSeedRows: reviews.filter((row) => !row.resolvedDocumentId).length,
    remainingP0Targets: audit.corpus.p0Targets,
  },
  evidence: {
    candidateCount: evidence.length,
    byType: countBy(evidence, 'type'),
    byWeakness: countBy(evidence, 'weaknessId'),
  },
  mostImportantImpact: [
    'Direct period evidence supports car/load-specific intermediate menus: a light Porsche 908 and heavier Matra could not safely use the same mixed-weather choice as conditions dried.',
    'A heavy Group 2 Camaro reportedly needed two or three intermediate types where lighter saloons could use one, reinforcing vehicle-load-specific menus.',
    'The new seeds do not yet close the Escort/FAM023 pressure or temperature gap; the previously reviewed 1971 Escort fitment report remains non-numeric.',
    'The 1953 BRM measurements are useful external-heat and failure evidence but are a secondary quotation, apply to the V16 rather than the P48, and do not justify changing FAM021/FAM023 physics.',
  ],
  numericalGeneratorChanges: [],
  integrity: {
    uniqueDocumentIds: reviewedDocumentIds.size === reviewed.length,
    uniqueEvidenceIds: new Set(evidence.map((row) => row.evidenceId)).size === evidence.length,
    orphanEvidenceDocumentIds,
    pass: reviewedDocumentIds.size === reviewed.length && new Set(evidence.map((row) => row.evidenceId)).size === evidence.length && orphanEvidenceDocumentIds.length === 0,
  },
  disposition: {
    canonicalKnowledgeChanged: false,
    applicationChanged: false,
    p0ImpactReportAuthorized: false,
    reason: 'The requested P0 milestone requires resolving the first 1,000 targets. This checkpoint exposed target-quality defects and reviewed only high-value seeds.',
  },
};

const reviewsFile = path.join(outputRoot, 'seed_source_reviews.jsonl');
const evidenceFile = path.join(outputRoot, 'seed_evidence_candidates.jsonl');
summary.outputHashes = { sourceReviews: sha256(reviewsFile), evidenceCandidates: sha256(evidenceFile) };
fs.writeFileSync(path.join(outputRoot, 'checkpoint_summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
