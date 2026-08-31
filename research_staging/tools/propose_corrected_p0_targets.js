const fs = require('fs');
const path = require('path');

const stagingRoot = path.resolve(__dirname, '..');
const packRoot = path.join(stagingRoot, 'weakness_10000_handoff', 'ACLM_Tire_Lab_10000_Weakness_Document_Corpus_Pack');
const auditRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_000_audit');
const outputRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_002_target_correction_proposal');
fs.mkdirSync(outputRoot, { recursive: true });

const readJsonl = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const countBy = (rows, key) => rows.reduce((acc, row) => { const value = row[key] ?? 'UNSPECIFIED'; acc[value] = (acc[value] || 0) + 1; return acc; }, {});

const p0 = readJsonl(path.join(packRoot, 'P0_FIRST_1000.jsonl'));
const flags = new Map(readJsonl(path.join(auditRoot, 'temporal_scope_flags.jsonl')).map((row) => [row.documentTargetId, row]));

const validity = {
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

function replacementClass(row) {
  const y = Number(row.year_start);
  switch (row.series_class) {
    case 'BPR GT1':
      if (y < 1966) return 'period GT and sports racing';
      if (y < 1982) return 'Group 4/5 GT and endurance';
      if (y < 1992) return 'Group C-era GT and endurance';
      return '1990s GT/GT1';
    case 'Le Mans GT1': return y < 1982 ? 'Le Mans GT and sports prototype' : (y < 1992 ? 'Le Mans Group C and GT' : 'Le Mans GT/GT1');
    case 'GT40/1960s endurance': return y < 1964 ? '1950s-early-1960s sports racing' : (y < 1982 ? '1970s endurance GT/prototype' : 'historical GT40/1960s endurance reference');
    case 'Group C/IMSA GTP': return y < 1971 ? '1960s sports prototype' : (y < 1981 ? '1970s sports prototype/IMSA' : 'Group C/IMSA GTP');
    case 'GT2/GTS': return y < 1971 ? '1960s GT/endurance' : (y < 1992 ? 'Group 4/5 and IMSA GT' : 'GT2/GTS');
    case 'Group A/DTM touring': return y < 1982 ? 'Group 2/ETCC touring' : 'Group A/DTM touring';
    case 'Japanese JGTC/GT500': return y < 1982 ? 'Japanese touring/GT racing' : (y < 1993 ? 'Japanese touring/prototype racing' : 'Japanese JGTC/GT500');
    case 'Group 2/ETCC touring': return y > 1981 ? 'touring car/DTM/national saloon' : 'Group 2/ETCC touring';
    case 'IMSA GTS/GT': return y < 1971 ? 'US sports/GT racing' : 'IMSA GTS/GT';
    case '1950s-60s sports racing': return y > 1971 ? 'historical 1950s-60s sports-racing reference' : '1950s-60s sports racing';
    default: return row.series_class;
  }
}

function replaceQuery(row, proposedClass, proposedStart, proposedEnd) {
  let query = row.search_query;
  query = query.replace(`"${row.series_class}"`, `"${proposedClass}"`);
  query = query.replace(new RegExp(`\\b${row.year_start}\\s+${row.year_end}\\b`), `${proposedStart} ${proposedEnd}`);
  return query;
}

const proposals = p0.map((row) => {
  const flag = flags.get(row.document_target_id);
  if (!flag) {
    return { ...row, correctionDisposition: 'UNCHANGED_NO_OBVIOUS_TEMPORAL_CONFLICT', originalSeriesClass: row.series_class, originalYearStart: row.year_start, originalYearEnd: row.year_end, originalSearchQuery: row.search_query };
  }
  const rule = validity[row.series_class];
  if (flag.scopeAudit === 'PARTIAL_TEMPORAL_OVERLAP' && rule) {
    const proposedStart = Math.max(Number(row.year_start), rule[0]);
    const proposedEnd = Math.min(Number(row.year_end), rule[1]);
    return {
      ...row,
      year_start: proposedStart,
      year_end: proposedEnd,
      era: `${proposedStart}-${proposedEnd}`,
      search_query: replaceQuery(row, row.series_class, proposedStart, proposedEnd),
      correctionDisposition: 'PROPOSED_DATE_NARROWING',
      correctionConfidence: 'HIGH',
      correctionReason: flag.reason,
      originalSeriesClass: row.series_class,
      originalYearStart: row.year_start,
      originalYearEnd: row.year_end,
      originalSearchQuery: row.search_query,
    };
  }
  const proposedClass = replacementClass(row);
  return {
    ...row,
    series_class: proposedClass,
    search_query: replaceQuery(row, proposedClass, row.year_start, row.year_end),
    correctionDisposition: 'PROPOSED_CLASS_RELABEL',
    correctionConfidence: proposedClass.includes('historical') ? 'MEDIUM' : 'HIGH',
    correctionReason: flag.reason,
    originalSeriesClass: row.series_class,
    originalYearStart: row.year_start,
    originalYearEnd: row.year_end,
    originalSearchQuery: row.search_query,
  };
});

writeJsonl(path.join(outputRoot, 'P0_FIRST_1000_CORRECTION_PROPOSAL.jsonl'), proposals);
const summary = {
  checkpoint: 'Non-destructive P0 target correction proposal',
  rows: proposals.length,
  dispositions: countBy(proposals, 'correctionDisposition'),
  confidence: countBy(proposals.filter((row) => row.correctionConfidence), 'correctionConfidence'),
  safeguards: {
    originalIdsPreserved: proposals.every((row, index) => row.document_target_id === p0[index].document_target_id),
    originalFieldsRetained: proposals.every((row) => row.originalSeriesClass && row.originalSearchQuery),
    suppliedManifestOverwritten: false,
    canonicalKnowledgeChanged: false,
    applicationChanged: false,
  },
  status: 'PROPOSAL_ONLY_REQUIRES_REVIEW_BEFORE_ACQUISITION',
};
summary.safeguards.pass = summary.safeguards.originalIdsPreserved
  && summary.safeguards.originalFieldsRetained
  && !summary.safeguards.suppliedManifestOverwritten
  && !summary.safeguards.canonicalKnowledgeChanged
  && !summary.safeguards.applicationChanged;
fs.writeFileSync(path.join(outputRoot, 'correction_summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
