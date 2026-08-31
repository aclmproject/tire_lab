const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const inputDir = path.join(root, 'checkpoint_000_first_5000');
const outputDir = path.join(root, 'checkpoint_001_milestone1');
fs.mkdirSync(outputDir, { recursive: true });

const readJsonl = (file) => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const lineage = readJsonl(path.join(inputDir, 'lineage_registry.jsonl'));
const ledger = readJsonl(path.join(inputDir, 'ingestion_ledger.jsonl'));
const identityIndex = JSON.parse(fs.readFileSync(path.join(inputDir, 'source_identity_index.json'), 'utf8'));
const registrationSummary = JSON.parse(fs.readFileSync(path.join(inputDir, 'checkpoint_summary.json'), 'utf8'));

const reviewMap = {
  'A-C1': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'PERIOD_GENERAL_TIRE_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-C1-001'] },
  'A-C2': { reviewStatus: 'FULL_TEXT_REVIEWED', taskStatus: 'FULL_TEXT_EVIDENCE_PROMOTED', provenance: 'GOVERNMENT_ACADEMIC_FOUNDATIONAL', access: 'Official EPA full text', evidence: ['EVC-M1-C2-001', 'EVC-M1-C2-002', 'EVC-M1-C2-003'] },
  'A-C3': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-C3-001', 'EVC-M1-C3-002', 'EVC-M1-C3-003'] },
  'A-C5': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'SECONDARY_HISTORICAL', access: 'Official ACO retrospective interview', evidence: ['EVC-M1-C5-001'] },
  'A-NEW-01': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'MODERN_MOTORSPORT_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-N01-001'] },
  'A-NEW-02': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'MODERN_MOTORSPORT_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-N02-001'] },
  'A-NEW-03': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'MODERN_MOTORSPORT_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-N03-001'] },
  'A-NEW-04': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'MODERN_MOTORSPORT_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-N04-001'] },
  'A-NEW-11': { reviewStatus: 'INACCESSIBLE', taskStatus: 'INACCESSIBLE', provenance: 'PERIOD_GENERAL_TIRE_TECHNICAL', access: 'Official page timed out on repeated attempts', evidence: [] },
  'A-NEW-18': { reviewStatus: 'ABSTRACT_ONLY', taskStatus: 'ABSTRACT_ONLY_LIMITED_EVIDENCE', provenance: 'PERIOD_GENERAL_TIRE_TECHNICAL', access: 'Official SAE abstract', evidence: ['EVC-M1-N18-001'] },
  'A-NEW-40': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-N40-001', 'EVC-M1-N40-002'] },
  'A-NEW-41': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-N41-001'] },
  'A-NEW-42': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-N42-001', 'EVC-M1-N42-002'] },
  'A-NEW-43': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-N43-001', 'EVC-M1-N43-002', 'EVC-M1-N43-003'] },
  'A-NEW-44': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Motor Sport archive page', evidence: ['EVC-M1-N44-001'] },
  'A-NEW-45': { reviewStatus: 'PRIMARY_SCAN_REVIEWED', taskStatus: 'PRIMARY_SCAN_EVIDENCE_PROMOTED', provenance: 'DIRECT_PERIOD_RACING', access: 'Period Japanese regulation-summary page citing JAF Motorsport', evidence: ['EVC-M1-N45-001', 'EVC-M1-N45-002'] },
  'A-NEW-49': { reviewStatus: 'FULL_TEXT_REVIEWED', taskStatus: 'FULL_TEXT_EVIDENCE_PROMOTED', provenance: 'MODERN_MOTORSPORT_SUPPLIER', access: 'Official Goodyear/Dunlop newsroom full page', evidence: ['EVC-M1-N49-001', 'EVC-M1-N49-002'] },
};

const evidence = [
  { evidenceId: 'EVC-M1-C1-001', sourceTaskId: 'A-C1', type: 'OBSERVATION', reviewStatus: 'ABSTRACT_ONLY', claim: 'Infrared line scanning was used to study running-tire surface temperature as a function of speed, inflation, load, radial position, and bias/belted/radial construction.', location: 'Official abstract', measurementLocation: 'tread surface', applicability: 'Mechanism and validation-method evidence only; no racing optimum or numerical coefficient.', modelImpact: 'NO_MODEL_CHANGE' },
  { evidenceId: 'EVC-M1-C2-001', sourceTaskId: 'A-C2', type: 'OBSERVATION', reviewStatus: 'FULL_TEXT_REVIEWED', claim: 'Cold-tire warm-up raises contained-air pressure while reducing deflection and rubber hysteresis; pressure and thermal transients are coupled.', location: 'EPA text, discussion around lines 160-179 and 207-216 in reviewed rendering', measurementLocation: 'cavity pressure plus whole-tire energy dissipation', applicability: 'Passenger/light-duty mechanism; constrain architecture, not racing absolute values.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-C2-002', sourceTaskId: 'A-C2', type: 'MEASUREMENT', reviewStatus: 'FULL_TEXT_REVIEWED', claim: 'The report describes light-duty tires reaching approximate thermal equilibrium in about 30 minutes and equilibrium dissipation about 20 percent below the average over the first 20 minutes.', location: 'EPA text, discussion around lines 195-206 in reviewed rendering', units: ['minute', 'percent'], measurementLocation: 'whole-tire energy dissipation', applicability: 'Test-method transient for light-duty tires; not a racing tire warm-up target.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-C2-003', sourceTaskId: 'A-C2', type: 'SCALING_RULE', reviewStatus: 'FULL_TEXT_REVIEWED', claim: 'Tractive force adds energy dissipation, while construction can alter the response; speed raises heat-generation power even where dissipation force is nearly speed-independent.', location: 'EPA text, discussion around lines 222-277 in reviewed rendering', measurementLocation: 'whole-tire energy dissipation', applicability: 'Qualitative mechanism and test-design constraint only.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-C3-001', sourceTaskId: 'A-C3', type: 'OBSERVATION', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'At the 1968 South African Grand Prix, Clark\'s new Dunlops showed a cooler tread center than edges, prompting a pressure/profile adjustment.', location: 'Motor Sport archive, race-report passage around lines 230-231 in reviewed rendering', measurementLocation: 'tread surface profile', applicability: 'Event-, car-, and tire-specific.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-C3-002', sourceTaskId: 'A-C3', type: 'MEASUREMENT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The front-tire inflation was increased by about 6 psi to change the running profile.', location: 'Same race-report passage', units: ['psi increment'], measurementLocation: 'inflation pressure', applicability: 'Adjustment magnitude, not an absolute cold or hot pressure.', modelImpact: 'HISTORICAL_PRIOR_PROPOSAL' },
  { evidenceId: 'EVC-M1-C3-003', sourceTaskId: 'A-C3', type: 'MEASUREMENT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The inner-left tread was reported up to about 120 C, and the soft compounds were intended to run hot.', location: 'Same race-report passage', units: ['degC'], measurementLocation: 'local tread surface, inner-left', applicability: 'Local event-specific observation; explicitly not a universal optimum or core temperature.', modelImpact: 'HISTORICAL_CONSTRAINT' },
  { evidenceId: 'EVC-M1-C5-001', sourceTaskId: 'A-C5', type: 'EVENT_SUPPLIER_EVIDENCE', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'A retrospective ACO interview reports the McLaren/Amon GT40 starting damp Le Mans 1966 on intermediate Firestones, suffering tread shedding at very high Mulsanne speed, then switching to Goodyears used by other GT40s.', location: 'ACO interview passage around lines 49-55 in reviewed rendering', applicability: 'Official retrospective participant account; event-specific, not a universal GT40 fitment rule.', modelImpact: 'FITMENT_DATABASE_CANDIDATE' },
  { evidenceId: 'EVC-M1-N01-001', sourceTaskId: 'A-NEW-01', type: 'OBSERVATION', reviewStatus: 'ABSTRACT_ONLY', claim: 'The abstract presents a pressure-supported toroid/contact-patch heat hypothesis linking trends with slip, pressure, load, camber, and tread thickness.', location: 'Official abstract', applicability: 'Author model/hypothesis only until full text is reviewed.', modelImpact: 'INSUFFICIENT_EVIDENCE_NO_MODEL_CHANGE' },
  { evidenceId: 'EVC-M1-N02-001', sourceTaskId: 'A-NEW-02', type: 'OBSERVATION', reviewStatus: 'ABSTRACT_ONLY', claim: 'The NASCAR-specific abstract identifies slip loss as a large heat source and short-track limiter, and treats one-psi setup changes as meaningful.', location: 'Official abstract', applicability: 'NASCAR oval author claims; no cross-class constants.', modelImpact: 'INSUFFICIENT_EVIDENCE_NO_MODEL_CHANGE' },
  { evidenceId: 'EVC-M1-N03-001', sourceTaskId: 'A-NEW-03', type: 'OBSERVATION', reviewStatus: 'ABSTRACT_ONLY', claim: 'The abstract describes time-dependent tire load behavior resolved through contact-patch heat and surface temperature.', location: 'Official abstract', measurementLocation: 'contact-patch/tread surface', applicability: 'Model architecture only.', modelImpact: 'INSUFFICIENT_EVIDENCE_NO_MODEL_CHANGE' },
  { evidenceId: 'EVC-M1-N04-001', sourceTaskId: 'A-NEW-04', type: 'CALIBRATION_METHOD', reviewStatus: 'ABSTRACT_ONLY', claim: 'The abstract describes deriving nonlinear tire force-and-moment behavior from on-track data with load, camber, combined slip, and friction-ellipse effects.', location: 'Official abstract', applicability: 'Calibration-method candidate; no extracted parameters.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-N18-001', sourceTaskId: 'A-NEW-18', type: 'CALIBRATION_METHOD', reviewStatus: 'ABSTRACT_ONLY', claim: 'The abstract describes measuring contained-air temperature through a valve-stem probe and combining it with the gas equation for hot pressure control.', location: 'Official abstract', measurementLocation: 'cavity/contained air', applicability: 'Earthmover measurement architecture only; not racing absolute temperature or pressure.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-N40-001', sourceTaskId: 'A-NEW-40', type: 'OBSERVATION', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'Period manufacturer engineers describe circuit surface, compound, construction, and temperature as interacting tire-selection variables.', location: 'Motor Sport archive, technical interview around lines 250-255 in reviewed rendering', applicability: 'Period racing mechanism; qualitative.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-N40-002', sourceTaskId: 'A-NEW-40', type: 'OBSERVATION', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The interview notes that inflation pressure can be used when a racing tire moves on its wheel and emphasizes that racing duty cycles differ sharply from road use.', location: 'Motor Sport archive, technical interview around lines 228 and 273-280', applicability: 'Setup mechanism; speaker claim, not a universal threshold.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-N41-001', sourceTaskId: 'A-NEW-41', type: 'MEASUREMENT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'A 1975 Goodyear race-tire engineer is reported as giving approximate effective temperatures of 220 F for dry tires and 170 F for wets, with wet tires exceeding 300 F and failing when run dry.', location: 'Motor Sport archive, quoted engineering passage around line 192 in reviewed rendering', units: ['degF'], measurementLocation: 'unspecified tire temperature observable', applicability: '1975 Goodyear/F1 context; location unspecified, so do not equate to core or universal optimum.', modelImpact: 'HISTORICAL_PRIOR_PROPOSAL' },
  { evidenceId: 'EVC-M1-N42-001', sourceTaskId: 'A-NEW-42', type: 'CALIBRATION_METHOD', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'Period F1 technicians took inner/middle/outer tread temperatures with a needle probe immediately after a stop and logged the spread.', location: 'Motor Sport archive, technical passage around lines 192-196 in reviewed rendering', measurementLocation: 'post-stop tread I/M/O needle probe', applicability: 'Direct period method; not core telemetry.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-N42-002', sourceTaskId: 'A-NEW-42', type: 'MEASUREMENT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The article reports typical 1982 Formula One racing pressures around 12-15 psi and treats one psi as significant.', location: 'Same technical passage', units: ['psi'], measurementLocation: 'inflation pressure; cold/hot state not specified', applicability: '1982 F1 context only; pressure state ambiguity retained.', modelImpact: 'HISTORICAL_PRIOR_PROPOSAL' },
  { evidenceId: 'EVC-M1-N43-001', sourceTaskId: 'A-NEW-43', type: 'MEASUREMENT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'For 1989 Goodyear Formula One radials, reported operating pressures were about 18-20 psi front and 16-18 psi rear, varying with circuit and climate.', location: 'Motor Sport archive, supplier-history passage around lines 215-216 in reviewed rendering', units: ['psi'], measurementLocation: 'operating inflation pressure', applicability: '1989 Goodyear F1 radial only.', modelImpact: 'HISTORICAL_PRIOR_PROPOSAL' },
  { evidenceId: 'EVC-M1-N43-002', sourceTaskId: 'A-NEW-43', type: 'HISTORICAL_CONSTRAINT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The article dates Goodyear\'s first Formula One radials to 1984, initially for rain and then across the range.', location: 'Motor Sport archive around line 214 in reviewed rendering', applicability: 'Supplier-specific chronology.', modelImpact: 'FAMILY_CLASS_UPDATE_CANDIDATE' },
  { evidenceId: 'EVC-M1-N43-003', sourceTaskId: 'A-NEW-43', type: 'OBSERVATION', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The supplier history links thinner racing-tire tread with reduced heat build-up and improved heat-resistant compounds with traction.', location: 'Motor Sport archive around lines 199-206 in reviewed rendering', applicability: 'Qualitative historical mechanism.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-N44-001', sourceTaskId: 'A-NEW-44', type: 'OBSERVATION', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The 1980 Toleman F2 analysis reports that steel-braced Pirellis responded differently to camber than crossply Goodyears and that an initial lateral-stiffness problem was corrected without changing the chassis concept.', location: 'Motor Sport archive, team-analysis passage around lines 210-215 in reviewed rendering', applicability: 'Car/tire/supplier-specific evidence that construction changes setup response.', modelImpact: 'VALIDATION_CONSTRAINT' },
  { evidenceId: 'EVC-M1-N45-001', sourceTaskId: 'A-NEW-45', type: 'HISTORICAL_CONSTRAINT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The 1994 All-Japan GT summary reports classes with minimum weights of 1200 kg and 1050 kg, with a 40 kg addition for four-wheel-drive cars.', location: 'Period summary, vehicle section around lines 133-140 in reviewed rendering', units: ['kg'], applicability: '1994 Japanese GT regulation context; page is a period summary citing JAF Motorsport, not the signed rulebook.', modelImpact: 'FAMILY_CLASS_UPDATE_CANDIDATE' },
  { evidenceId: 'EVC-M1-N45-002', sourceTaskId: 'A-NEW-45', type: 'HISTORICAL_CONSTRAINT', reviewStatus: 'PRIMARY_SCAN_REVIEWED', claim: 'The series removed qualifying tires and limited the pre-event allocation to three sets, with one selected set retained for the race start.', location: 'Period summary, tire section around lines 158-162 in reviewed rendering', applicability: '1994 All-Japan GT event-allocation/menu constraint; not a compound-performance measurement.', modelImpact: 'FAMILY_CLASS_UPDATE_CANDIDATE' },
  { evidenceId: 'EVC-M1-N49-001', sourceTaskId: 'A-NEW-49', type: 'CALIBRATION_METHOD', reviewStatus: 'FULL_TEXT_REVIEWED', claim: 'Dunlop describes a development chain of virtual tire modeling, laboratory machine testing for grip and sensitivity to load, pressure, and camber, then correlation with driver feedback.', location: 'Official supplier page around lines 88-93 in reviewed rendering', applicability: 'Modern LMP2 development method; architecture evidence rather than published numerical coefficients.', modelImpact: 'CALIBRATION_METHOD_UPDATE' },
  { evidenceId: 'EVC-M1-N49-002', sourceTaskId: 'A-NEW-49', type: 'OBSERVATION', reviewStatus: 'FULL_TEXT_REVIEWED', claim: 'The 2017 LMP2 program used a modified prior car to emulate higher power/downforce and tested multiple chassis on Sebring abrasive asphalt and smooth concrete to seek cross-chassis durability and consistency.', location: 'Official supplier page around lines 88-96 in reviewed rendering', applicability: 'Modern LMP2 source; supports load/surface/chassis coverage in validation, not a universal family constant.', modelImpact: 'VALIDATION_CONSTRAINT' },
];

const conflicts = [
  {
    conflictId: 'CON-M1-001',
    type: 'CONTEXTUAL_DIVERGENCE_RETAINED',
    evidenceIds: ['EVC-M1-N42-002', 'EVC-M1-N43-001'],
    issue: 'Reported Formula One inflation-pressure ranges differ between a 1982 general F1 account and 1989 Goodyear radial operating guidance.',
    resolution: 'Do not average. Retain year, supplier, construction, axle, circuit/climate, and pressure-state context. The 1982 cold/hot state remains unspecified.',
    modelImpact: 'NO_MODEL_CHANGE',
  },
];

const evidenceBySource = new Map();
for (const item of evidence) {
  const list = evidenceBySource.get(item.sourceTaskId) || [];
  list.push(item.evidenceId);
  evidenceBySource.set(item.sourceTaskId, list);
}

const lineageById = new Map(lineage.map((row) => [row.contentId, row]));
const layerAById = new Map(lineage.filter((row) => row.layer === 'A').map((row) => [row.contentId, row]));

const revisedLineage = lineage.map((row) => {
  if (reviewMap[row.contentId]) {
    const review = reviewMap[row.contentId];
    return { ...row, currentStatus: review.taskStatus, sourceReviewStatus: review.reviewStatus, evidenceRecordsProduced: review.evidence, reviewAccess: review.access, reviewedProvenance: review.provenance };
  }
  if (row.layer === 'B' && reviewMap[row.parentTaskId]) {
    const review = reviewMap[row.parentTaskId];
    let status = 'DEFERRED_WAITING_FOR_PARENT_EVIDENCE';
    if (review.reviewStatus === 'ABSTRACT_ONLY') status = 'ABSTRACT_ONLY_LIMITED_EVIDENCE';
    if (review.reviewStatus === 'INACCESSIBLE') status = 'INACCESSIBLE';
    if (review.reviewStatus === 'FULL_TEXT_REVIEWED' || review.reviewStatus === 'PRIMARY_SCAN_REVIEWED') status = 'DUPLICATE_PARENT_TASK_SATISFIED';
    return { ...row, currentStatus: status, sourceReviewStatus: review.reviewStatus, evidenceRecordsProduced: review.evidence };
  }
  if (row.layer === 'C' && row.parentTaskId) {
    const parent = lineageById.get(row.parentTaskId);
    const sourceReview = parent && reviewMap[parent.parentTaskId];
    if (sourceReview) {
      let status = 'DEFERRED_WAITING_FOR_PARENT_EVIDENCE';
      if (sourceReview.reviewStatus === 'ABSTRACT_ONLY') status = 'ABSTRACT_ONLY_LIMITED_EVIDENCE';
      if (sourceReview.reviewStatus === 'INACCESSIBLE') status = 'INACCESSIBLE';
      return { ...row, currentStatus: status, sourceReviewStatus: sourceReview.reviewStatus, evidenceRecordsProduced: [] };
    }
  }
  return row;
});

const revisedById = new Map(revisedLineage.map((row) => [row.contentId, row]));
const revisedLedger = ledger.map((row) => {
  const source = revisedById.get(row.contentId);
  return source ? { ...row, status: source.currentStatus, sourceReviewStatus: source.sourceReviewStatus, evidenceIds: source.evidenceRecordsProduced || [], note: source.currentStatus === 'DEFERRED_UNTIL_SOURCE_REVIEW' ? row.note : 'Milestone 1 source-review result propagated through lineage.' } : row;
});

const sourceReviews = lineage.filter((row) => row.layer === 'A').map((row) => {
  const review = reviewMap[row.contentId];
  return {
    sourceTaskId: row.contentId,
    title: row.title,
    canonicalUrl: row.url,
    existingTireKnowledgeSourceId: row.existingTireKnowledgeSourceId,
    reviewStatus: review ? review.reviewStatus : 'METADATA_ONLY',
    taskStatus: review ? review.taskStatus : 'DEFERRED_UNTIL_SOURCE_REVIEW',
    accessBasis: review ? review.access : 'Registered from curated packet; source not yet reviewed.',
    evidenceIds: evidenceBySource.get(row.contentId) || [],
    note: row.contentId === 'A-C4' ? 'Existing SRC001 expansion task; do not create a duplicate source.' : null,
  };
});

const counts = (rows, key) => rows.reduce((acc, row) => { const value = row[key] || 'UNSPECIFIED'; acc[value] = (acc[value] || 0) + 1; return acc; }, {});
const evidenceCounts = evidence.reduce((acc, row) => { acc[row.type] = (acc[row.type] || 0) + 1; return acc; }, {});
const evidenceIds = new Set(evidence.map((row) => row.evidenceId));
const sourceIds = new Set(lineage.filter((row) => row.layer === 'A').map((row) => row.contentId));
const duplicateEvidenceIds = evidence.length - evidenceIds.size;
const orphanEvidenceSourceIds = evidence.filter((row) => !sourceIds.has(row.sourceTaskId)).map((row) => row.sourceTaskId);
const invalidStatusRows = revisedLineage.filter((row) => !row.currentStatus).map((row) => row.contentId);

writeJsonl(path.join(outputDir, 'lineage_registry.jsonl'), revisedLineage);
writeJsonl(path.join(outputDir, 'ingestion_ledger.jsonl'), revisedLedger);
writeJsonl(path.join(outputDir, 'source_reviews.jsonl'), sourceReviews);
writeJsonl(path.join(outputDir, 'evidence_candidates.jsonl'), evidence);
writeJsonl(path.join(outputDir, 'conflict_register.jsonl'), conflicts);
fs.writeFileSync(path.join(outputDir, 'source_identity_index.json'), JSON.stringify(identityIndex, null, 2) + '\n');

const summary = {
  checkpoint: 'Milestone 1: registration plus initial source review over first-priority 5,000 lineage',
  scope: {
    layerATasksRegistered: sourceReviews.length,
    layerBTasksRegistered: revisedLineage.filter((row) => row.layer === 'B').length,
    layerCPilotTasksRegistered: revisedLineage.filter((row) => row.layer === 'C').length,
    layerCFullCorpusVerified: registrationSummary.corpusAccounting.layerCFullCorpusVerified,
    sourceTasksActuallyReviewed: sourceReviews.filter((row) => row.reviewStatus !== 'METADATA_ONLY').length,
  },
  sourceReviewStatuses: counts(sourceReviews, 'reviewStatus'),
  taskStatuses: counts(revisedLineage, 'currentStatus'),
  evidenceCounts,
  evidenceCandidateCount: evidence.length,
  conflictRegisterAdditions: conflicts.length,
  identityAccounting: registrationSummary.sourceIdentityAccounting,
  integrity: {
    duplicateEvidenceIds,
    orphanEvidenceSourceIds,
    contentRowsWithoutStatus: invalidStatusRows,
    sourceReviewRowForEveryLayerA: sourceReviews.length === lineage.filter((row) => row.layer === 'A').length,
    ledgerRowForEveryRegisteredTask: revisedLedger.length === revisedLineage.length,
    noCanonicalKnowledgeWrite: true,
    noApplicationBuild: true,
    noNumericalGeneratorChange: true,
    pass: duplicateEvidenceIds === 0 && orphanEvidenceSourceIds.length === 0 && invalidStatusRows.length === 0,
  },
  limitations: [
    'This is a staging checkpoint, not canonical evidence promotion.',
    `Only ${sourceReviews.filter((row) => row.reviewStatus !== 'METADATA_ONLY').length} of ${sourceReviews.length} Layer A sources have an actual review result in this checkpoint; the remainder are metadata-only and deferred.`,
    'The first 5,000 Layer C tasks are registered and auditable, but most remain deferred until their parent source or lens is reviewed.',
    'Abstract-only evidence is limited to claims supported by the official abstract.',
    'No historical family prior, simulator coefficient, application code, knowledge release, or public build was changed.',
  ],
};

const summaryPath = path.join(outputDir, 'checkpoint_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
summary.outputHashes = {
  lineage: sha256(path.join(outputDir, 'lineage_registry.jsonl')),
  ledger: sha256(path.join(outputDir, 'ingestion_ledger.jsonl')),
  sourceReviews: sha256(path.join(outputDir, 'source_reviews.jsonl')),
  evidenceCandidates: sha256(path.join(outputDir, 'evidence_candidates.jsonl')),
  conflictRegister: sha256(path.join(outputDir, 'conflict_register.jsonl')),
};
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

console.log(JSON.stringify(summary, null, 2));
