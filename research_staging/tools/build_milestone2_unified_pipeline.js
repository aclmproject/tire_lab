const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const stagingRoot = path.resolve(__dirname, '..');
const milestone1Root = path.join(stagingRoot, 'checkpoint_001_milestone1');
const seedRoot = path.join(stagingRoot, 'weakness_10000_checkpoint_001_seed_review');
const packRoot = path.join(stagingRoot, 'weakness_10000_handoff', 'ACLM_Tire_Lab_10000_Weakness_Document_Corpus_Pack');
const outputRoot = path.join(stagingRoot, 'checkpoint_002_milestone2_working');
fs.mkdirSync(outputRoot, { recursive: true });
const inputRoot = path.join(stagingRoot, 'inputs');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = (file, rows) => fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = (file) => sha256(fs.readFileSync(file));
const normalizedText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const canonicalUrl = (value) => String(value || '').trim().replace(/\/$/, '').toLowerCase();
const countBy = (rows, key) => rows.reduce((acc, row) => {
  const value = typeof key === 'function' ? key(row) : row[key];
  const label = value ?? 'UNSPECIFIED';
  acc[label] = (acc[label] || 0) + 1;
  return acc;
}, {});
const readInputBatches = (suffix) => fs.readdirSync(inputRoot)
  .filter((name) => /^milestone2_acquisition_batch_\d+_/.test(name) && name.endsWith(suffix))
  .sort()
  .flatMap((name) => readJsonl(path.join(inputRoot, name)));
const acquisitionReviews = readInputBatches('_source_reviews.jsonl');
const acquisitionEvidenceInput = readInputBatches('_evidence_candidates.jsonl');

const provenanceSources = [
  {
    provenanceId: 'ONT-SRC-FIA-K-2025',
    title: 'FIA Appendix K 2025',
    publisher: 'FIA',
    url: 'https://www.fia.com/sites/default/files/appendix_k_2025_online_v20250610.pdf',
    supports: ['historic period definitions', 'Formula Junior/F2/F3/Formula Ford subdivisions', 'Group C', 'Group 5', 'historic American categories'],
  },
  {
    provenanceId: 'ONT-SRC-FIA-HDB',
    title: 'FIA Historic Database — period regulations and homologation records',
    publisher: 'FIA',
    url: 'https://historicdb.fia.com/front',
    supports: ['period Appendix J', 'homologation identity', 'historic regulation provenance'],
  },
  {
    provenanceId: 'ONT-SRC-SUPERGT-HISTORY',
    title: 'SUPER GT official history',
    publisher: 'GTA / SUPER GT',
    url: 'https://supergt.net/about-super-gt/history',
    supports: ['JGTC began in 1994', '1994 GT1/GT2 terminology', 'SUPER GT name from 2005'],
  },
  {
    provenanceId: 'ONT-SRC-IMSA-GTP',
    title: 'IMSA official GTP history',
    publisher: 'IMSA',
    url: 'https://www.imsa.com/wp-content/uploads/sites/32/2023/05/25/2023_IMSA_UltimateExpression.pdf',
    supports: ['original IMSA GTP period 1981-1993'],
  },
  {
    provenanceId: 'ONT-SRC-TRANSAM',
    title: 'Trans Am official history',
    publisher: 'Trans Am',
    url: 'https://gotransam.com/about/Our-History/59342',
    supports: ['Trans-Am first race March 25, 1966'],
  },
  {
    provenanceId: 'ONT-SRC-FIA-BPR',
    title: 'FIA InMotion — GT history',
    publisher: 'FIA',
    url: 'https://www.fia.com/sites/default/files/publication/file/in_motion_March%2010.pdf',
    supports: ['BPR 1994-1996', 'FIA GT succession from 1997'],
  },
  {
    provenanceId: 'ONT-SRC-WRC',
    title: 'WRC official historical archive and champion profile',
    publisher: 'WRC Promoter / FIA World Rally Championship',
    url: 'https://www.wrc.com/en/misc/world-rally-champion-bjoern-waldegard',
    supports: ['first official drivers championship 1979', 'pre-1979 driver terminology limitation'],
  },
];

const ontologyEntries = [
  ['general_racing_tire', 'General Racing Tire', null, null, ['General racing tire'], 'NO_HARD_CHAMPIONSHIP_WINDOW'],
  ['general_tire_mechanics', 'General Tire Mechanics', null, null, ['General tire mechanics'], 'NO_HARD_CHAMPIONSHIP_WINDOW'],
  ['historic_reference', 'Historic Racing Reference', null, null, ['Historic racing reference'], 'REFERENCE_CONTEXT_ONLY'],
  ['formula_1_1950_1965', 'Formula 1 — early World Championship', 1950, 1965, ['Formula 1'], 'PERIOD_SUBDIVISION'],
  ['formula_1_1966_1981', 'Formula 1 — 3-litre/cross-ply-to-radial transition', 1966, 1981, ['Formula 1'], 'PERIOD_SUBDIVISION'],
  ['formula_1_1982_1991', 'Formula 1 — turbo/radial slick era', 1982, 1991, ['Formula 1'], 'PERIOD_SUBDIVISION'],
  ['formula_1_1992_2001', 'Formula 1 — 1990s radial slick/grooved transition', 1992, 2001, ['Formula 1'], 'PERIOD_SUBDIVISION'],
  ['formula_1_2002_2010', 'Formula 1 — grooved-to-slick-return era', 2002, 2010, ['Formula 1'], 'PERIOD_SUBDIVISION'],
  ['formula_junior_1958_1963', 'Formula Junior', 1958, 1963, ['Formula Junior'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3_1964_1970', 'Formula 3 — 1964-1970', 1964, 1970, ['Formula 3'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3_1971_1973', 'Formula 3 — 1971-1973', 1971, 1973, ['Formula 3'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3_1974_1986', 'Formula 3 — 1974-1986', 1974, 1986, ['Formula 3'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3_1987_1990', 'Formula 3 — 1987-1990', 1987, 1990, ['Formula 3'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3_1991_2010', 'Formula 3 — 1991-2010', 1991, 2010, ['Formula 3'], 'CURATED_PERIOD_SUBDIVISION'],
  ['formula_2_1956_1960', 'Formula 2 — 1956-1960', 1956, 1960, ['Formula 2'], 'FIA_HISTORIC_DEFINED'],
  ['formula_2_1964_1966', 'Formula 2 — 1964-1966', 1964, 1966, ['Formula 2'], 'FIA_HISTORIC_DEFINED'],
  ['formula_2_1967_1971', 'Formula 2 — 1967-1971', 1967, 1971, ['Formula 2'], 'FIA_HISTORIC_DEFINED'],
  ['formula_2_1972_1984', 'Formula 2 — 1972-1984', 1972, 1984, ['Formula 2'], 'FIA_HISTORIC_DEFINED'],
  ['formula_3000_1985_2004', 'International Formula 3000', 1985, 2004, ['Formula 3000', 'F3000'], 'SERIES_DEFINED'],
  ['formula_ford_1967_1976', 'Formula Ford — 1967-1976', 1967, 1976, ['Formula Ford'], 'FIA_HISTORIC_DEFINED'],
  ['formula_ford_1977_1981', 'Formula Ford — 1977-1981', 1977, 1981, ['Formula Ford'], 'FIA_HISTORIC_DEFINED'],
  ['formula_ford_1982_1992', 'Formula Ford — 1982-1992', 1982, 1992, ['Formula Ford'], 'FIA_HISTORIC_DEFINED'],
  ['formula_ford_1993_2010', 'Formula Ford — 1993-2010', 1993, 2010, ['Formula Ford'], 'CURATED_PERIOD_SUBDIVISION'],
  ['club_single_seater_pre1967', 'Club single-seater — pre-Formula Ford', 1950, 1966, ['Club racing'], 'CONTEXTUAL_FALLBACK'],
  ['indy_aaa_1950_1955', 'AAA Championship Car / Indianapolis', 1950, 1955, ['Indy', 'AAA'], 'ERA_APPROPRIATE_SANCTION'],
  ['indy_usac_1956_1978', 'USAC Championship Car / Indianapolis', 1956, 1978, ['Indy', 'USAC'], 'ERA_APPROPRIATE_SANCTION'],
  ['indy_cart_1979_2003', 'CART / Indy-car', 1979, 2003, ['Indy', 'CART'], 'ERA_APPROPRIATE_SANCTION'],
  ['sports_racing_1950_1963', 'Sports racing / prototypes — 1950-1963', 1950, 1963, ['sports racing', 'prototype'], 'CURATED_PERIOD_SUBDIVISION'],
  ['gt40_endurance_1964_1969', 'GT40-era endurance', 1964, 1969, ['GT40', '1960s endurance'], 'CAR_COMPETITION_WINDOW'],
  ['sports_prototype_1964_1971', 'Sports racing / prototypes — 1964-1971', 1964, 1971, ['sports racing', 'prototype'], 'CURATED_PERIOD_SUBDIVISION'],
  ['sports_prototype_1972_1981', 'Sports racing / prototypes — 1972-1981', 1972, 1981, ['sports racing', 'prototype'], 'CURATED_PERIOD_SUBDIVISION'],
  ['group_c_1982_1993', 'Group C', 1982, 1993, ['Group C'], 'FIA_HISTORIC_DEFINED'],
  ['imsa_gtp_1981_1993', 'IMSA GTP', 1981, 1993, ['IMSA GTP'], 'IMSA_OFFICIAL_DEFINED'],
  ['lmp_transition_1993_1999', 'Le Mans Prototype transition', 1993, 1999, ['LMP', 'WSC prototype'], 'CURATED_PERIOD_SUBDIVISION'],
  ['lmp900_675_2000_2003', 'LMP900 / LMP675', 2000, 2003, ['LMP900', 'LMP675'], 'REGULATION_ERA'],
  ['lmp1_2_2004_2010', 'LMP1 / LMP2', 2004, 2010, ['LMP1', 'LMP2'], 'REGULATION_ERA'],
  ['canam_original_1966_1974', 'Can-Am — original', 1966, 1974, ['Can-Am', 'Group 7'], 'SERIES_PERIOD'],
  ['canam_revival_1977_1986', 'Can-Am — revival', 1977, 1986, ['Can-Am revival'], 'SERIES_PERIOD'],
  ['touring_pre1963', 'Touring / saloon racing — pre-1963', 1950, 1962, ['touring', 'saloon'], 'CONTEXTUAL_FALLBACK'],
  ['group_2_etcc_1963_1969', 'Group 2 / ETCC — 1963-1969', 1963, 1969, ['Group 2', 'ETCC'], 'REGULATION_ERA'],
  ['group_2_etcc_1970_1975', 'Group 2 / ETCC — 1970-1975', 1970, 1975, ['Group 2', 'ETCC'], 'FIA_HISTORIC_DEFINED'],
  ['group_2_etcc_1976_1981', 'Group 2 / ETCC — 1976-1981', 1976, 1981, ['Group 2', 'ETCC'], 'REGULATION_ERA'],
  ['group_4_1966_1969', 'Group 4 Sports Cars — 1966-1969', 1966, 1969, ['Group 4'], 'REGULATION_ERA'],
  ['group_4_gt_1970_1981', 'Group 4 Special GT — 1970-1981', 1970, 1981, ['Group 4'], 'REGULATION_ERA'],
  ['group_5_1966_1969', 'Group 5 Special Touring — 1966-1969', 1966, 1969, ['Group 5'], 'FIA_HISTORIC_DEFINED'],
  ['group_5_sports_1970_1975', 'Group 5 Sports Cars — 1970-1975', 1970, 1975, ['Group 5'], 'REGULATION_ERA'],
  ['group_5_1976_1981', 'Group 5 Special Production — 1976-1981', 1976, 1981, ['Group 5'], 'FIA_HISTORIC_DEFINED'],
  ['transam_1966_1972', 'Trans-Am — 1966-1972', 1966, 1972, ['Trans-Am'], 'SERIES_PERIOD'],
  ['transam_1973_1981', 'Trans-Am — 1973-1981', 1973, 1981, ['Trans-Am'], 'SERIES_PERIOD'],
  ['transam_1982_2001', 'Trans-Am — 1982-2001', 1982, 2001, ['Trans-Am'], 'SERIES_PERIOD'],
  ['imsa_gt_1971_1981', 'IMSA GT — 1971-1981', 1971, 1981, ['IMSA GT'], 'SERIES_PERIOD'],
  ['imsa_gt_1982_1993', 'IMSA GT — 1982-1993', 1982, 1993, ['IMSA GT', 'GTO', 'GTU'], 'SERIES_PERIOD'],
  ['imsa_gt_1994_2001', 'IMSA GT/GTS — 1994-2001', 1994, 2001, ['IMSA GT', 'IMSA GTS'], 'SERIES_PERIOD'],
  ['group_a_1982_1992', 'Group A touring — 1982-1992', 1982, 1992, ['Group A'], 'FIA_PERIOD_DEFINED'],
  ['group_a_1993_2001', 'Group A / production touring — 1993-2001', 1993, 2001, ['Group A'], 'CURATED_PERIOD_SUBDIVISION'],
  ['dtm_1984_1992', 'DTM — Group A era', 1984, 1992, ['DTM'], 'REGULATION_ERA'],
  ['dtm_class1_1993_1996', 'DTM / ITC — Class 1', 1993, 1996, ['DTM', 'ITC'], 'FIA_HISTORIC_DEFINED'],
  ['dtm_2000_2010', 'DTM — silhouette era', 2000, 2010, ['DTM'], 'REGULATION_ERA'],
  ['bpr_1994_1996', 'BPR Global GT', 1994, 1996, ['BPR'], 'FIA_OFFICIAL_DEFINED'],
  ['early_gt1_1994_1999', 'GT1 — 1994-1999 context', 1994, 1999, ['GT1'], 'SANCTION_CONTEXT_REQUIRED'],
  ['fia_gt_1997_2009', 'FIA GT — 1997-2009', 1997, 2009, ['FIA GT', 'GT1'], 'SANCTION_CONTEXT_REQUIRED'],
  ['fia_gt1_world_2010', 'FIA GT1 World Championship', 2010, 2010, ['FIA GT1'], 'SANCTION_CONTEXT_REQUIRED'],
  ['gt2_gts_1994_2004', 'GT2 / GTS — 1994-2004 sanction-specific', 1994, 2004, ['GT2', 'GTS'], 'SANCTION_CONTEXT_REQUIRED'],
  ['gt2_gts_2005_2010', 'GT2 / GTS — 2005-2010 sanction-specific', 2005, 2010, ['GT2', 'GTS'], 'SANCTION_CONTEXT_REQUIRED'],
  ['jgtc_1994_1999', 'JGTC — 1994-1999 (GT1/GT2 terminology)', 1994, 1999, ['JGTC', 'GT1', 'GT2'], 'SUPER_GT_OFFICIAL_DEFINED'],
  ['jgtc_2000_2004', 'JGTC — 2000-2004', 2000, 2004, ['JGTC', 'GT500', 'GT300'], 'SUPER_GT_OFFICIAL_DEFINED'],
  ['super_gt_2005_2010', 'SUPER GT — 2005-2010', 2005, 2010, ['SUPER GT', 'GT500', 'GT300'], 'SUPER_GT_OFFICIAL_DEFINED'],
  ['international_rally_pre1973', 'International rally — pre-WRC', 1950, 1972, ['international rally'], 'TERMINOLOGY_GUARD'],
  ['wrc_manufacturers_1973_1978', 'World Rally Championship — manufacturers era', 1973, 1978, ['WRC'], 'TERMINOLOGY_GUARD'],
  ['wrc_1979_1986', 'World Rally Championship — 1979-1986', 1979, 1986, ['WRC'], 'WRC_OFFICIAL_CONTEXT'],
  ['wrc_1987_2001', 'World Rally Championship — 1987-2001', 1987, 2001, ['WRC'], 'WRC_OFFICIAL_CONTEXT'],
  ['wrc_2002_2010', 'World Rally Championship — 2002-2010', 2002, 2010, ['WRC'], 'WRC_OFFICIAL_CONTEXT'],
  ['rallycross_1967_1981', 'Rallycross — 1967-1981', 1967, 1981, ['Rallycross'], 'SEPARATE_DISCIPLINE'],
  ['rallycross_1982_2010', 'Rallycross — 1982-2010', 1982, 2010, ['Rallycross'], 'SEPARATE_DISCIPLINE'],
  ['nascar_1950_1971', 'NASCAR stock car — 1950-1971', 1950, 1971, ['NASCAR'], 'PERIOD_SUBDIVISION'],
  ['nascar_1972_1991', 'NASCAR stock car — 1972-1991', 1972, 1991, ['NASCAR'], 'PERIOD_SUBDIVISION'],
  ['nascar_1992_2010', 'NASCAR stock car — 1992-2010', 1992, 2010, ['NASCAR'], 'PERIOD_SUBDIVISION'],
  ['us_gt_pre1971', 'US GT / sports racing — pre-IMSA GT', 1950, 1970, ['US GT', 'sports racing'], 'TERMINOLOGY_GUARD'],
  ['japanese_gt_touring_pre1994', 'Japanese GT / touring — pre-JGTC', 1950, 1993, ['Japanese GT', 'Japanese touring'], 'TERMINOLOGY_GUARD'],
];

const sourceByStatus = {
  FIA_HISTORIC_DEFINED: ['ONT-SRC-FIA-K-2025', 'ONT-SRC-FIA-HDB'],
  FIA_PERIOD_DEFINED: ['ONT-SRC-FIA-K-2025', 'ONT-SRC-FIA-HDB'],
  FIA_OFFICIAL_DEFINED: ['ONT-SRC-FIA-BPR'],
  SUPER_GT_OFFICIAL_DEFINED: ['ONT-SRC-SUPERGT-HISTORY'],
  IMSA_OFFICIAL_DEFINED: ['ONT-SRC-IMSA-GTP'],
  WRC_OFFICIAL_CONTEXT: ['ONT-SRC-WRC'],
  TERMINOLOGY_GUARD: ['ONT-SRC-FIA-K-2025', 'ONT-SRC-WRC'],
  ERA_APPROPRIATE_SANCTION: ['ONT-SRC-FIA-K-2025'],
  SERIES_DEFINED: ['ONT-SRC-FIA-K-2025'],
  SERIES_PERIOD: ['ONT-SRC-FIA-K-2025', 'ONT-SRC-TRANSAM'],
  REGULATION_ERA: ['ONT-SRC-FIA-K-2025', 'ONT-SRC-FIA-HDB'],
  SANCTION_CONTEXT_REQUIRED: ['ONT-SRC-FIA-BPR'],
  CAR_COMPETITION_WINDOW: ['ONT-SRC-FIA-HDB'],
};

const ontology = ontologyEntries.map(([ontologyId, label, start, end, aliases, basis]) => ({
  ontologyId,
  label,
  subjectPeriodStart: start,
  subjectPeriodEnd: end,
  aliases,
  basis,
  provenanceIds: sourceByStatus[basis] || ['ONT-SRC-FIA-K-2025'],
  publicationDateMustBeStoredSeparately: true,
}));
const ontologyById = new Map(ontology.map((row) => [row.ontologyId, row]));

const classCandidates = {
  'Formula 1': ['formula_1_1950_1965', 'formula_1_1966_1981', 'formula_1_1982_1991', 'formula_1_1992_2001', 'formula_1_2002_2010'],
  'Group C/IMSA GTP': ['imsa_gtp_1981_1993', 'group_c_1982_1993', 'sports_racing_1950_1963', 'sports_prototype_1964_1971', 'sports_prototype_1972_1981', 'lmp_transition_1993_1999'],
  'General racing tire': ['general_racing_tire'],
  'Trans-Am/IMSA sedan': ['transam_1966_1972', 'transam_1973_1981', 'transam_1982_2001', 'imsa_gt_1971_1981', 'imsa_gt_1982_1993', 'imsa_gt_1994_2001', 'touring_pre1963'],
  'Club/Formula Ford': ['formula_ford_1967_1976', 'formula_ford_1977_1981', 'formula_ford_1982_1992', 'formula_ford_1993_2010', 'club_single_seater_pre1967'],
  'Group 2/ETCC touring': ['group_2_etcc_1963_1969', 'group_2_etcc_1970_1975', 'group_2_etcc_1976_1981', 'group_a_1982_1992', 'group_a_1993_2001', 'touring_pre1963'],
  'Japanese JGTC/GT500': ['jgtc_1994_1999', 'jgtc_2000_2004', 'super_gt_2005_2010', 'japanese_gt_touring_pre1994'],
  'GT40/1960s endurance': ['gt40_endurance_1964_1969', 'sports_racing_1950_1963', 'sports_prototype_1964_1971', 'sports_prototype_1972_1981', 'historic_reference'],
  'IMSA GTS/GT': ['imsa_gt_1971_1981', 'imsa_gt_1982_1993', 'imsa_gt_1994_2001', 'us_gt_pre1971'],
  'Indy/USAC/CART': ['indy_aaa_1950_1955', 'indy_usac_1956_1978', 'indy_cart_1979_2003'],
  'Le Mans GT1': ['early_gt1_1994_1999', 'gt40_endurance_1964_1969', 'sports_racing_1950_1963', 'group_4_gt_1970_1981', 'group_c_1982_1993', 'lmp_transition_1993_1999', 'fia_gt_1997_2009'],
  'Formula 3/Formula Junior': ['formula_junior_1958_1963', 'formula_3_1964_1970', 'formula_3_1971_1973', 'formula_3_1974_1986', 'formula_3_1987_1990', 'formula_3_1991_2010'],
  'World Rally/Rallycross': ['international_rally_pre1973', 'wrc_manufacturers_1973_1978', 'wrc_1979_1986', 'wrc_1987_2001', 'wrc_2002_2010', 'rallycross_1967_1981', 'rallycross_1982_2010'],
  'Can-Am/Group 7': ['canam_original_1966_1974', 'canam_revival_1977_1986', 'sports_racing_1950_1963', 'sports_prototype_1964_1971', 'sports_prototype_1972_1981'],
  'GT2/GTS': ['gt2_gts_1994_2004', 'gt2_gts_2005_2010', 'group_4_gt_1970_1981', 'imsa_gt_1982_1993', 'us_gt_pre1971'],
  '1950s-60s sports racing': ['sports_racing_1950_1963', 'sports_prototype_1964_1971', 'historic_reference'],
  'Historic racing reference': ['historic_reference'],
  'Group 4/5 GT': ['group_4_1966_1969', 'group_4_gt_1970_1981', 'group_5_1966_1969', 'group_5_sports_1970_1975', 'group_5_1976_1981', 'sports_racing_1950_1963', 'group_c_1982_1993'],
  'LMP/Prototype': ['lmp_transition_1993_1999', 'lmp900_675_2000_2003', 'lmp1_2_2004_2010', 'sports_racing_1950_1963', 'sports_prototype_1964_1971', 'sports_prototype_1972_1981', 'group_c_1982_1993'],
  'Group A/DTM touring': ['group_a_1982_1992', 'dtm_1984_1992', 'dtm_class1_1993_1996', 'dtm_2000_2010', 'group_2_etcc_1963_1969', 'group_2_etcc_1970_1975', 'group_2_etcc_1976_1981', 'touring_pre1963'],
  'General tire mechanics': ['general_tire_mechanics'],
  'NASCAR stock car': ['nascar_1950_1971', 'nascar_1972_1991', 'nascar_1992_2010'],
  'BPR GT1': ['bpr_1994_1996', 'early_gt1_1994_1999', 'fia_gt_1997_2009', 'gt40_endurance_1964_1969', 'group_4_gt_1970_1981', 'group_c_1982_1993', 'sports_racing_1950_1963'],
  'Formula 2/F3000': ['formula_2_1956_1960', 'formula_2_1964_1966', 'formula_2_1967_1971', 'formula_2_1972_1984', 'formula_3000_1985_2004'],
};

const repositoryRules = [
  { ruleId: 'REPO-FIA-HOMOLOGATION', match: /fia historic database|homologation|appendix j|appendix c|period technical regulations/i, allowedWeaknesses: ['W05_CONSTRUCTION_MATERIALS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP'], allowedTypes: ['regulation/homologation', 'homologation form', 'period regulation', 'regulation'] },
  { ruleId: 'REPO-FIA-EVENT', match: /fia\/event|fia official|event bulletin/i, allowedWeaknesses: ['W01_PRESSURE_TEMP_SETUP', 'W06_SUPPLIER_COMPOUNDS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP'], allowedTypes: ['regulation', 'event/regulatory bulletin', 'official bulletin'] },
  { ruleId: 'REPO-TECHNICAL', match: /sae|tire science|nasa|nhtsa|nist|epa|university|calspan|road-surface|technical textile|research paper/i, allowedWeaknesses: ['W01_PRESSURE_TEMP_SETUP', 'W02_WEAR_LIFE_GRIP', 'W03_FM_STIFFNESS_TRANSIENT', 'W04_WET_INTERMEDIATE', 'W05_CONSTRUCTION_MATERIALS', 'W09_HEAT_CYCLE_AGING_DAMAGE', 'W10_RR_HYSTERESIS_THERMAL'], allowedTypes: ['technical paper', 'peer-reviewed paper', 'government technical report', 'thesis/dissertation', 'test methodology', 'technical report', 'government monograph', 'materials technical paper', 'technical/race engineering paper', 'supplier research paper'] },
  { ruleId: 'REPO-PATENT', match: /patent/i, allowedWeaknesses: ['W03_FM_STIFFNESS_TRANSIENT', 'W05_CONSTRUCTION_MATERIALS', 'W09_HEAT_CYCLE_AGING_DAMAGE', 'W10_RR_HYSTERESIS_THERMAL'], allowedTypes: ['patent', 'patent or technical catalog'] },
  { ruleId: 'REPO-PERIOD-MOTORSPORT', match: /motor sport|motorsportmagazine|period motorsport magazine/i, allowedWeaknesses: ['W01_PRESSURE_TEMP_SETUP', 'W02_WEAR_LIFE_GRIP', 'W04_WET_INTERMEDIATE', 'W05_CONSTRUCTION_MATERIALS', 'W06_SUPPLIER_COMPOUNDS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP', 'W09_HEAT_CYCLE_AGING_DAMAGE'], allowedTypes: ['period race report / technical feature', 'period technical/race article'] },
  { ruleId: 'REPO-SUPPLIER', match: /manufacturer/i, allowedWeaknesses: ['W01_PRESSURE_TEMP_SETUP', 'W02_WEAR_LIFE_GRIP', 'W03_FM_STIFFNESS_TRANSIENT', 'W04_WET_INTERMEDIATE', 'W05_CONSTRUCTION_MATERIALS', 'W06_SUPPLIER_COMPOUNDS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP', 'W09_HEAT_CYCLE_AGING_DAMAGE', 'W10_RR_HYSTERESIS_THERMAL'], allowedTypes: ['supplier technical document', 'supplier racing document', 'supplier technical paper', 'supplier motorsport document', 'supplier catalog/manual', 'supplier technical/press document', 'supplier racing catalog', 'supplier research paper', 'technical/historical document', 'patent or technical catalog'] },
  { ruleId: 'REPO-TEAM-SETUP', match: /team\/setup|race engineering literature/i, allowedWeaknesses: ['W01_PRESSURE_TEMP_SETUP', 'W02_WEAR_LIFE_GRIP', 'W03_FM_STIFFNESS_TRANSIENT', 'W04_WET_INTERMEDIATE', 'W06_SUPPLIER_COMPOUNDS', 'W09_HEAT_CYCLE_AGING_DAMAGE'], allowedTypes: ['setup book / test sheet', 'technical/race engineering paper'] },
  { ruleId: 'REPO-RACE-EVENT', match: /race results|entry|program|24h-lemans|racingsportscars/i, allowedWeaknesses: ['W02_WEAR_LIFE_GRIP', 'W04_WET_INTERMEDIATE', 'W06_SUPPLIER_COMPOUNDS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP', 'W09_HEAT_CYCLE_AGING_DAMAGE'], allowedTypes: ['race report/result/stint evidence', 'entry list/program', 'period program/entry documentation', 'official event retrospective/report', 'entry/result photo/documentation'] },
  { ruleId: 'REPO-GT-REGULATION', match: /fia gt regulations|imsa period regulations/i, allowedWeaknesses: ['W06_SUPPLIER_COMPOUNDS', 'W07_FITMENT_GEOMETRY_REGS', 'W08_GT1_1990S_MAP'], allowedTypes: ['regulation'] },
];

const preferredRepositories = {
  W01_PRESSURE_TEMP_SETUP: ['race team/setup book archive', 'period motorsport magazine', 'manufacturer technical archive'],
  W02_WEAR_LIFE_GRIP: ['period motorsport magazine', 'manufacturer racing archive', 'SAE Mobilus'],
  W03_FM_STIFFNESS_TRANSIENT: ['SAE Mobilus', 'Tire Science & Technology', 'Calspan/Flat-Trac methodology'],
  W04_WET_INTERMEDIATE: ['period motorsport magazine', 'manufacturer racing archive', 'SAE Mobilus'],
  W05_CONSTRUCTION_MATERIALS: ['manufacturer technical archive', 'SAE Mobilus', 'Google Patents'],
  W06_SUPPLIER_COMPOUNDS: ['manufacturer racing archive', 'period motorsport magazine', 'race entry/program archive'],
  W07_FITMENT_GEOMETRY_REGS: ['FIA Historic Database homologations', 'manufacturer racing catalog/manual', 'period technical regulations'],
  W08_GT1_1990S_MAP: ['period motorsport magazine', 'race entry/program archive', 'FIA GT regulations'],
  W09_HEAT_CYCLE_AGING_DAMAGE: ['manufacturer technical archive', 'SAE Mobilus', 'period motorsport magazine'],
  W10_RR_HYSTERESIS_THERMAL: ['SAE Mobilus', 'Tire Science & Technology', 'EPA/NHTSA/NIST technical archive'],
};

const repositoryType = {
  'race team/setup book archive': 'setup book / test sheet',
  'period motorsport magazine': 'period technical/race article',
  'manufacturer technical archive': 'supplier technical document',
  'manufacturer racing archive': 'supplier racing document',
  'SAE Mobilus': 'technical paper',
  'Tire Science & Technology': 'peer-reviewed paper',
  'Calspan/Flat-Trac methodology': 'test methodology',
  'Google Patents': 'patent',
  'FIA Historic Database homologations': 'homologation form',
  'manufacturer racing catalog/manual': 'supplier catalog/manual',
  'period technical regulations': 'regulation',
  'race entry/program archive': 'entry list/program',
  'FIA GT regulations': 'regulation',
  'EPA/NHTSA/NIST technical archive': 'government technical report',
};

function overlap(entry, start, end) {
  if (entry.subjectPeriodStart === null) return end - start + 1;
  return Math.max(0, Math.min(end, entry.subjectPeriodEnd) - Math.max(start, entry.subjectPeriodStart) + 1);
}

function selectOntology(row) {
  const candidates = (classCandidates[row.series_class] || ['general_racing_tire']).map((id) => ontologyById.get(id));
  const scored = candidates.map((entry, index) => ({ entry, index, overlap: overlap(entry, Number(row.year_start), Number(row.year_end)) }));
  scored.sort((a, b) => b.overlap - a.overlap || a.index - b.index);
  return scored[0].entry;
}

function repositoryRule(repository) {
  return repositoryRules.find((rule) => rule.match.test(repository));
}

function isRepositoryCompatible(row) {
  const rule = repositoryRule(row.repository_target);
  return Boolean(rule && rule.allowedWeaknesses.includes(row.weakness_id) && rule.allowedTypes.includes(row.target_document_type));
}

function repairedRepository(row) {
  const choices = preferredRepositories[row.weakness_id];
  const index = parseInt(sha256(row.document_target_id).slice(0, 8), 16) % choices.length;
  const repository = choices[index];
  return { repository, type: repositoryType[repository] };
}

function targetQuery(row, entry, start, end, repository, type) {
  const supplier = row.supplier && row.supplier !== 'Any' ? `"${row.supplier}" ` : '';
  const documentHint = type.replace(/\//g, ' ');
  return `${supplier}"${entry.label}" ${start} ${end} tire tyre ${row.evidence_subtopic} ${documentHint}`.replace(/\s+/g, ' ').trim();
}

function normalizeTarget(row) {
  const entry = selectOntology(row);
  const start = entry.subjectPeriodStart === null ? Number(row.year_start) : Math.max(Number(row.year_start), entry.subjectPeriodStart);
  const end = entry.subjectPeriodEnd === null ? Number(row.year_end) : Math.min(Number(row.year_end), entry.subjectPeriodEnd);
  const originalRepoCompatible = isRepositoryCompatible(row);
  const repo = originalRepoCompatible ? { repository: row.repository_target, type: row.target_document_type } : repairedRepository(row);
  const ontologyChanged = entry.label !== row.series_class || start !== Number(row.year_start) || end !== Number(row.year_end);
  const repositoryChanged = repo.repository !== row.repository_target || repo.type !== row.target_document_type;
  const changed = ontologyChanged || repositoryChanged;
  const activeTargetId = changed ? `D-RPL-${row.document_target_id}` : row.document_target_id;
  const active = {
    layer: 'D',
    target_id: activeTargetId,
    original_target_id: row.document_target_id,
    supersedes_target_id: changed ? row.document_target_id : null,
    status: 'TO_ACQUIRE_REAL_DOCUMENT',
    priority: row.priority,
    priority_score: row.priority_score,
    parent_weakness: row.weakness_id,
    weakness: row.weakness,
    historical_class: entry.label,
    ontology_id: entry.ontologyId,
    ontology_provenance_ids: entry.provenanceIds,
    subject_period_start: start,
    subject_period_end: end,
    publication_date: null,
    supplier_target: row.supplier,
    evidence_subtopic: row.evidence_subtopic,
    repository: repo.repository,
    document_type: repo.type,
    search_query: changed ? targetQuery(row, entry, start, end, repo.repository, repo.type) : row.search_query,
    expected_evidence_fields: row.expected_evidence_fields,
    must_extract: row.must_extract,
    acceptance_rule: row.acceptance_rule,
    do_not_infer: row.do_not_infer,
    source_identity_id: null,
    evidence_candidate_ids: [],
    replacement_lineage: {
      disposition: changed ? 'REPLACEMENT_ACTIVE' : 'ORIGINAL_ACTIVE_UNCHANGED',
      originalTargetId: row.document_target_id,
      supersedesTargetId: changed ? row.document_target_id : null,
      ontologyChanged,
      repositoryChanged,
      correctionReasons: [
        ...(ontologyChanged ? [`Class/era normalized from ${row.series_class} ${row.year_start}-${row.year_end} to ${entry.label} ${start}-${end}.`] : []),
        ...(repositoryChanged ? [`Repository/type repaired from ${row.repository_target} / ${row.target_document_type} to ${repo.repository} / ${repo.type}.`] : []),
      ],
    },
  };
  active.repository_rule_id = repositoryRule(active.repository)?.ruleId || null;
  active.intent_fingerprint = sha256([
    active.parent_weakness,
    active.ontology_id,
    active.subject_period_start,
    active.subject_period_end,
    normalizedText(active.supplier_target),
    normalizedText(active.evidence_subtopic),
    normalizedText(active.repository),
    normalizedText(active.document_type),
    normalizedText(active.search_query),
  ].join('|')).slice(0, 24);
  return {
    active,
    originalDisposition: {
      layer: 'D',
      original_target_id: row.document_target_id,
      status: changed
        ? (ontologyChanged && repositoryChanged ? 'QUARANTINED_REQUIRES_ONTOLOGY_AND_REPOSITORY_REPLACEMENT'
          : ontologyChanged ? 'QUARANTINED_INVALID_ONTOLOGY'
            : 'QUARANTINED_INVALID_REPOSITORY_TYPE')
        : 'ACTIVE_UNCHANGED',
      replacement_target_id: changed ? activeTargetId : null,
      ontology_changed: ontologyChanged,
      repository_changed: repositoryChanged,
    },
  };
}

const manifestPath = path.join(packRoot, 'DOCUMENT_ACQUISITION_MANIFEST.jsonl');
const p0Path = path.join(packRoot, 'P0_FIRST_1000.jsonl');
const originalManifest = readJsonl(manifestPath);
const originalP0Ids = new Set(readJsonl(p0Path).map((row) => row.document_target_id));
const normalizedTargets = originalManifest.map(normalizeTarget);
const activeTargets = normalizedTargets.map((row) => row.active);
const originalDispositions = normalizedTargets.map((row) => row.originalDisposition);

const acquisitionAngles = [
  'measurement table',
  'setup record',
  'technical drawing',
  'event bulletin',
  'compound chart',
  'pressure log',
  'temperature trace',
  'stint record',
  'failure analysis',
  'test-method appendix',
  'construction specification',
  'fitment schedule',
  'supplier recommendation',
  'wear observation',
  'driver engineering debrief',
  'laboratory result',
];

function refreshIntentFingerprint(row) {
  row.intent_fingerprint = sha256([
    row.parent_weakness,
    row.ontology_id,
    row.subject_period_start,
    row.subject_period_end,
    normalizedText(row.supplier_target),
    normalizedText(row.evidence_subtopic),
    normalizedText(row.repository),
    normalizedText(row.document_type),
    normalizedText(row.search_query),
  ].join('|')).slice(0, 24);
}

const initialIntentGroups = new Map();
for (const row of activeTargets) {
  if (!initialIntentGroups.has(row.intent_fingerprint)) initialIntentGroups.set(row.intent_fingerprint, []);
  initialIntentGroups.get(row.intent_fingerprint).push(row);
}
for (const group of initialIntentGroups.values()) {
  if (group.length < 2) continue;
  group.sort((a, b) => a.target_id.localeCompare(b.target_id));
  group.forEach((row, index) => {
    row.acquisition_angle = acquisitionAngles[index % acquisitionAngles.length];
    row.search_query = `${row.search_query} "${row.acquisition_angle}"`;
    row.replacement_lineage.dedupIntentChanged = true;
    row.replacement_lineage.correctionReasons.push(`Exact acquisition-intent collision separated by document purpose: ${row.acquisition_angle}.`);
    refreshIntentFingerprint(row);
  });
}

const replacements = activeTargets.filter((row) => row.supersedes_target_id);
const activeP0 = activeTargets.filter((row) => originalP0Ids.has(row.original_target_id));

const duplicateIds = (rows, key) => Object.entries(countBy(rows, key)).filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
const ontologyFailures = activeTargets.filter((row) => {
  const entry = ontologyById.get(row.ontology_id);
  return !entry || (entry.subjectPeriodStart !== null && (row.subject_period_start < entry.subjectPeriodStart || row.subject_period_end > entry.subjectPeriodEnd));
});
const repositoryFailures = activeTargets.filter((row) => !isRepositoryCompatible({
  weakness_id: row.parent_weakness,
  repository_target: row.repository,
  target_document_type: row.document_type,
}));

const p0Validation = {
  activeTargets: activeP0.length,
  invalidClassEra: activeP0.filter((row) => ontologyFailures.includes(row)).length,
  invalidRepositoryType: activeP0.filter((row) => repositoryFailures.includes(row)).length,
  duplicateIntent: duplicateIds(activeP0, 'intent_fingerprint').length,
  duplicateActiveTargetIds: duplicateIds(activeP0, 'target_id').length,
  targetsWithoutWeakness: activeP0.filter((row) => !row.parent_weakness).length,
  replacementLineageValid: activeP0.filter((row) => !row.replacement_lineage || row.replacement_lineage.originalTargetId !== row.original_target_id).length === 0,
};
p0Validation.pass = p0Validation.activeTargets === 1000
  && p0Validation.invalidClassEra === 0
  && p0Validation.invalidRepositoryType === 0
  && p0Validation.duplicateIntent === 0
  && p0Validation.duplicateActiveTargetIds === 0
  && p0Validation.targetsWithoutWeakness === 0
  && p0Validation.replacementLineageValid;

const fullValidation = {
  activeTargets: activeTargets.length,
  invalidClassEra: ontologyFailures.length,
  invalidRepositoryType: repositoryFailures.length,
  duplicateIntent: duplicateIds(activeTargets, 'intent_fingerprint').length,
  duplicateActiveTargetIds: duplicateIds(activeTargets, 'target_id').length,
  originalTargetIdsUnique: duplicateIds(originalManifest, 'document_target_id').length === 0,
  replacementTargets: replacements.length,
  activeIntendedAcquisitionsPreserved: activeTargets.length === originalManifest.length,
};
fullValidation.pass = fullValidation.activeTargets === 10000
  && fullValidation.invalidClassEra === 0
  && fullValidation.invalidRepositoryType === 0
  && fullValidation.duplicateIntent === 0
  && fullValidation.duplicateActiveTargetIds === 0
  && fullValidation.originalTargetIdsUnique
  && fullValidation.activeIntendedAcquisitionsPreserved;

if (!p0Validation.pass || !fullValidation.pass) {
  throw new Error(`Validation failed: ${JSON.stringify({ p0Validation, fullValidation })}`);
}

fs.copyFileSync(manifestPath, path.join(outputRoot, 'LAYER_D_ORIGINAL_TARGETS_IMMUTABLE.jsonl'));
writeJsonl(path.join(outputRoot, 'layer_d_original_dispositions.jsonl'), originalDispositions);
writeJsonl(path.join(outputRoot, 'layer_d_replacement_targets.jsonl'), replacements);
writeJsonl(path.join(outputRoot, 'layer_d_active_targets.jsonl'), activeTargets);
writeJsonl(path.join(outputRoot, 'P0_FIRST_1000_CORRECTED_ACTIVE.jsonl'), activeP0);
writeJson(path.join(outputRoot, 'p0_validation.json'), p0Validation);
writeJson(path.join(outputRoot, 'full_10000_validation.json'), fullValidation);

writeJson(path.join(outputRoot, 'historical_motorsport_ontology.json'), {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  purpose: 'Reusable class/era terminology and subject-period validation for all research layers.',
  publicationDateRule: 'publication_date is independent from subject_period_start/end; a retrospective publication never becomes a contemporary period source.',
  provenanceSources,
  entries: ontology,
});
writeJson(path.join(outputRoot, 'repository_document_compatibility_rules.json'), {
  schemaVersion: '1.0.0',
  rules: repositoryRules.map(({ match, ...rule }) => ({ ...rule, repositoryPattern: match.source })),
  preferredRepairRepositories: preferredRepositories,
  principle: 'A repository is not evidence for a field it is structurally unlikely to contain. Homologation/regulation records constrain fitment and legality; they do not stand in for thermal, pyrometer, wear, or F&M measurements unless explicitly stated.',
});

const cellMap = new Map();
for (const row of activeTargets) {
  const key = [row.parent_weakness, row.subject_period_start, row.subject_period_end, row.historical_class, row.supplier_target, row.document_type].join('\u001f');
  cellMap.set(key, (cellMap.get(key) || 0) + 1);
}
const coverageRows = [...cellMap.entries()].map(([key, count]) => {
  const [weakness, start, end, historicalClass, supplier, documentType] = key.split('\u001f');
  return { weakness, subjectPeriodStart: Number(start), subjectPeriodEnd: Number(end), historicalClass, supplier, documentType, activeTargetCount: count };
}).sort((a, b) => b.activeTargetCount - a.activeTargetCount || a.weakness.localeCompare(b.weakness));
const csvEscape = (value) => `"${String(value).replace(/"/g, '""')}"`;
const coverageHeader = ['weakness', 'subjectPeriodStart', 'subjectPeriodEnd', 'historicalClass', 'supplier', 'documentType', 'activeTargetCount'];
fs.writeFileSync(path.join(outputRoot, 'coverage_matrix.csv'), `${coverageHeader.join(',')}\n${coverageRows.map((row) => coverageHeader.map((key) => csvEscape(row[key])).join(',')).join('\n')}\n`);

const coarseRisks = new Map();
for (const row of activeTargets) {
  const key = [row.parent_weakness, row.ontology_id, row.subject_period_start, row.subject_period_end, normalizedText(row.supplier_target), normalizedText(row.evidence_subtopic)].join('|');
  if (!coarseRisks.has(key)) coarseRisks.set(key, []);
  coarseRisks.get(key).push(row.target_id);
}
const duplicateIntentRisks = [...coarseRisks.entries()].filter(([, ids]) => ids.length > 1).map(([coarseIntent, ids]) => ({
  coarseIntent,
  targetCount: ids.length,
  targetIds: ids,
  status: 'DISTINCT_DOCUMENT_INTENTS_BUT_COARSE_CELL_OVERLAP_REQUIRES_ACQUISITION_DEDUP',
}));
writeJsonl(path.join(outputRoot, 'duplicate_intent_risks.jsonl'), duplicateIntentRisks);

const highValueCells = [
  { gapId: 'GAP-M2-01', weakness: 'W01_PRESSURE_TEMP_SETUP', classPattern: /Group 2 \/ ETCC — 1970-1975/, period: '1971-1976', need: 'FAM023 cold/hot pressure and I/M/O pyrometer evidence' },
  { gapId: 'GAP-M2-02', weakness: 'W03_FM_STIFFNESS_TRANSIENT', classPattern: /Group 2 \/ ETCC/, period: '1971-1976', need: 'FAM023 cross-ply carcass/rate and F&M' },
  { gapId: 'GAP-M2-03', weakness: 'W01_PRESSURE_TEMP_SETUP', classPattern: /Formula 1 — early/, period: '1958-1965', need: 'R5-era pressure and temperature' },
  { gapId: 'GAP-M2-04', weakness: 'W03_FM_STIFFNESS_TRANSIENT', classPattern: /Formula 1 — early/, period: '1958-1965', need: 'R5-era vertical/lateral stiffness and F&M' },
  { gapId: 'GAP-M2-05', weakness: 'W07_FITMENT_GEOMETRY_REGS', classPattern: /GT40/, period: '1964-1969', need: 'GT40 exact sizes and loaded radius' },
  { gapId: 'GAP-M2-06', weakness: 'W09_HEAT_CYCLE_AGING_DAMAGE', classPattern: /GT1|JGTC|BPR/, period: '1993-1996', need: '1990s GT heat-cycle degradation and failure evidence' },
];
const evaluatedHighValueCells = highValueCells.map((cell) => ({
  ...cell,
  activeTargetCount: activeTargets.filter((row) => row.parent_weakness === cell.weakness && cell.classPattern.test(row.historical_class)).length,
  status: 'TARGETED_NOT_YET_CLOSED_BY_REVIEW',
}));
writeJson(path.join(outputRoot, 'coverage_quality_audit.json'), {
  activeTargets: activeTargets.length,
  coverageCells: coverageRows.length,
  overrepresentedCells: coverageRows.slice(0, 25),
  underrepresentedCells: coverageRows.filter((row) => row.activeTargetCount === 1).slice(0, 100),
  missingHighValueCells: evaluatedHighValueCells.filter((row) => row.activeTargetCount === 0),
  highValueCells: evaluatedHighValueCells,
  coarseDuplicateIntentRiskGroups: duplicateIntentRisks.length,
  note: 'Exact active intent fingerprints are unique; coarse overlap groups identify cells where different planned documents may still resolve to the same real source and therefore require source-identity deduplication during acquisition.',
});

const milestone1Identity = readJson(path.join(milestone1Root, 'source_identity_index.json'));
const seedReviews = readJsonl(path.join(seedRoot, 'seed_source_reviews.jsonl'));
const unifiedIdentity = milestone1Identity.map((row) => ({ ...row, layerDSeedIds: row.layerDSeedIds || [], layerDAcquisitionDocumentIds: row.layerDAcquisitionDocumentIds || [] }));
const identityByUrl = new Map(unifiedIdentity.filter((row) => row.canonicalUrl).map((row) => [canonicalUrl(row.canonicalUrl), row]));
const identityByTitle = new Map(unifiedIdentity.map((row) => [normalizedText(row.canonicalTitle), row]));
const seedDocumentToIdentity = new Map();
for (const seed of seedReviews) {
  const byUrl = identityByUrl.get(canonicalUrl(seed.canonicalUrl));
  const byTitle = identityByTitle.get(normalizedText(seed.title));
  const existing = byUrl || byTitle;
  if (existing) {
    existing.layerDSeedIds.push(seed.seedId);
    if (seed.resolvedDocumentId) seedDocumentToIdentity.set(seed.resolvedDocumentId, existing.bibliographicIdentity);
    continue;
  }
  const identity = {
    bibliographicIdentity: sha256(`${normalizedText(seed.seedId)}|${normalizedText(seed.title)}|${canonicalUrl(seed.canonicalUrl)}`).slice(0, 24),
    canonicalTitle: seed.title,
    canonicalUrl: seed.canonicalUrl,
    identifiers: seed.seedId ? [seed.seedId] : [],
    publicationDate: seed.issueDate || seed.year || null,
    subjectPeriodStart: seed.subjectPeriodStart || null,
    subjectPeriodEnd: seed.subjectPeriodEnd || null,
    existingTireKnowledgeSourceId: null,
    existingTireKnowledgeSourceIds: [],
    isResearchMission: false,
    layerATasks: [],
    layerBTasks: [],
    layerDSeedIds: [seed.seedId],
    sourceReviewStatus: seed.currentReviewStatus,
    disposition: seed.currentReviewStatus === 'NOT_YET_REVIEWED_IN_THIS_CHECKPOINT' ? 'CANDIDATE_NOT_YET_REVIEWED' : 'LAYER_D_SEED_RESOLVED',
  };
  unifiedIdentity.push(identity);
  identityByUrl.set(canonicalUrl(seed.canonicalUrl), identity);
  identityByTitle.set(normalizedText(seed.title), identity);
  if (seed.resolvedDocumentId) seedDocumentToIdentity.set(seed.resolvedDocumentId, identity.bibliographicIdentity);
}
const acquisitionDocumentToIdentity = new Map();
for (const review of acquisitionReviews) {
  const byUrl = identityByUrl.get(canonicalUrl(review.canonicalUrl));
  const byTitle = identityByTitle.get(normalizedText(review.title));
  const existing = byUrl || byTitle;
  if (existing) {
    existing.layerDAcquisitionDocumentIds = existing.layerDAcquisitionDocumentIds || [];
    existing.layerDAcquisitionDocumentIds.push(review.acquisitionDocumentId);
    existing.publicationDate = existing.publicationDate || review.publicationDate || null;
    existing.subjectPeriodStart = existing.subjectPeriodStart || review.subjectPeriodStart || null;
    existing.subjectPeriodEnd = existing.subjectPeriodEnd || review.subjectPeriodEnd || null;
    acquisitionDocumentToIdentity.set(review.acquisitionDocumentId, existing.bibliographicIdentity);
    continue;
  }
  const identity = {
    bibliographicIdentity: sha256(`${normalizedText(review.identifier)}|${normalizedText(review.title)}|${canonicalUrl(review.canonicalUrl)}`).slice(0, 24),
    canonicalTitle: review.title,
    canonicalUrl: review.canonicalUrl,
    identifiers: review.identifier ? [review.identifier] : [],
    publicationDate: review.publicationDate || null,
    subjectPeriodStart: review.subjectPeriodStart || null,
    subjectPeriodEnd: review.subjectPeriodEnd || null,
    existingTireKnowledgeSourceId: null,
    existingTireKnowledgeSourceIds: [],
    isResearchMission: false,
    layerATasks: review.sourceTaskId ? [review.sourceTaskId] : [],
    layerBTasks: [],
    layerDSeedIds: review.seedId ? [review.seedId] : [],
    layerDAcquisitionDocumentIds: [review.acquisitionDocumentId],
    sourceReviewStatus: review.reviewStatus,
    disposition: 'LAYER_D_ACQUISITION_REVIEWED',
  };
  unifiedIdentity.push(identity);
  identityByUrl.set(canonicalUrl(review.canonicalUrl), identity);
  identityByTitle.set(normalizedText(review.title), identity);
  acquisitionDocumentToIdentity.set(review.acquisitionDocumentId, identity.bibliographicIdentity);
}
writeJson(path.join(outputRoot, 'source_identity_index.json'), unifiedIdentity);

const milestone1Reviews = readJsonl(path.join(milestone1Root, 'source_reviews.jsonl')).map((row) => ({
  ...row,
  layer: 'A',
  sourceIdentityId: identityByUrl.get(canonicalUrl(row.canonicalUrl))?.bibliographicIdentity || null,
  publicationDate: row.publicationDate || null,
  subjectPeriodStart: row.subjectPeriodStart || null,
  subjectPeriodEnd: row.subjectPeriodEnd || null,
}));
const layerDReviews = seedReviews.map((row) => ({
  layer: 'D',
  seedId: row.seedId,
  documentId: row.resolvedDocumentId,
  sourceIdentityId: row.resolvedDocumentId ? seedDocumentToIdentity.get(row.resolvedDocumentId) : identityByUrl.get(canonicalUrl(row.canonicalUrl))?.bibliographicIdentity,
  title: row.title,
  canonicalUrl: row.canonicalUrl,
  publicationDate: row.issueDate || row.year || null,
  subjectPeriodStart: row.subjectPeriodStart || null,
  subjectPeriodEnd: row.subjectPeriodEnd || null,
  reviewStatus: row.currentReviewStatus === 'NOT_YET_REVIEWED_IN_THIS_CHECKPOINT' ? 'METADATA_ONLY' : row.currentReviewStatus,
  taskStatus: row.currentReviewStatus === 'NOT_YET_REVIEWED_IN_THIS_CHECKPOINT' ? 'DEFERRED_UNTIL_SOURCE_REVIEW' : row.currentReviewStatus,
  evidenceIds: row.evidenceCandidateIds || [],
  accessBasis: row.provenance || null,
  note: row.reviewNote || null,
  reusedExistingReview: Boolean(identityByUrl.get(canonicalUrl(row.canonicalUrl))?.layerATasks?.length),
}));
const unifiedReviews = [...milestone1Reviews, ...layerDReviews];
for (const review of acquisitionReviews) {
  const sourceIdentityId = acquisitionDocumentToIdentity.get(review.acquisitionDocumentId) || null;
  const existing = unifiedReviews.find((row) => canonicalUrl(row.canonicalUrl) === canonicalUrl(review.canonicalUrl)
    || (review.sourceTaskId && row.sourceTaskId === review.sourceTaskId)
    || (review.seedId && row.seedId === review.seedId));
  const normalizedReview = {
    layer: review.sourceTaskId ? 'A' : 'D',
    acquisitionDocumentId: review.acquisitionDocumentId,
    sourceTaskId: review.sourceTaskId || null,
    seedId: review.seedId || null,
    sourceIdentityId,
    title: review.title,
    canonicalUrl: review.canonicalUrl,
    identifier: review.identifier || null,
    publisher: review.publisher,
    publicationDate: review.publicationDate,
    subjectPeriodStart: review.subjectPeriodStart,
    subjectPeriodEnd: review.subjectPeriodEnd,
    reviewStatus: review.reviewStatus,
    taskStatus: review.reviewStatus,
    accessBasis: review.accessBasis,
    reviewLocation: review.reviewLocation,
    evidenceIds: review.evidenceIds,
    note: review.limitations,
    reusedExistingReview: false,
  };
  if (existing) Object.assign(existing, normalizedReview, { layer: existing.layer || normalizedReview.layer });
  else unifiedReviews.push(normalizedReview);
}
writeJsonl(path.join(outputRoot, 'source_reviews.jsonl'), unifiedReviews);

const milestone1Evidence = readJsonl(path.join(milestone1Root, 'evidence_candidates.jsonl')).map((row) => ({
  ...row,
  evidenceType: row.type,
  sourceIdentityId: milestone1Reviews.find((review) => review.sourceTaskId === row.sourceTaskId)?.sourceIdentityId || null,
  provenanceLayer: 'A',
}));
const seedEvidence = readJsonl(path.join(seedRoot, 'seed_evidence_candidates.jsonl')).map((row) => ({
  ...row,
  evidenceType: row.type === 'HISTORICAL_OBSERVATION' ? 'OBSERVATION' : row.type,
  originalEvidenceType: row.type,
  sourceIdentityId: seedDocumentToIdentity.get(row.documentId) || null,
  provenanceLayer: 'D',
}));
const acquisitionEvidence = acquisitionEvidenceInput.map((row) => ({
  ...row,
  evidenceType: row.type,
  sourceIdentityId: acquisitionDocumentToIdentity.get(row.acquisitionDocumentId) || null,
  provenanceLayer: 'D',
}));
const combinedEvidence = [];
const evidenceFingerprints = new Map();
for (const evidence of [...milestone1Evidence, ...seedEvidence, ...acquisitionEvidence]) {
  const fingerprint = sha256(`${evidence.sourceIdentityId}|${normalizedText(evidence.claim)}`);
  if (evidenceFingerprints.has(fingerprint)) {
    evidenceFingerprints.get(fingerprint).corroboratingEvidenceIds.push(evidence.evidenceId);
  } else {
    const normalized = { ...evidence, claimFingerprint: fingerprint.slice(0, 24), corroboratingEvidenceIds: [] };
    evidenceFingerprints.set(fingerprint, normalized);
    combinedEvidence.push(normalized);
  }
}
const architectureEvidence = {
  evidenceId: 'EVC-M2-ARCH-001',
  evidenceType: 'COMPOUND_APPLICABILITY',
  type: 'COMPOUND_APPLICABILITY',
  sourceIdentityId: null,
  supportingEvidenceIds: ['WEVC-0005', 'WEVC-0006', 'WEVC-0012', 'WEVC-0013'],
  provenanceLayer: 'D',
  claim: 'Compound suitability is vehicle/load/context dependent and may vary with mass, normal load/FZ0, axle duty, tire dimensions, construction, thermal capacity, circuit energy demand, wetness, and ambient/track state.',
  applicability: 'Evidence-backed architectural candidate only. No hard mass threshold or generator coefficient is authorized.',
  modelImpact: 'SUPPORTED_ARCHITECTURE_CANDIDATE_NO_IMPLEMENTATION',
  status: 'EVIDENCE_BACKED_ARCHITECTURAL_CANDIDATE',
  futureSearchTags: ['same compound different-weight cars', 'intermediate choice by vehicle weight', 'supplier compound recommendation by axle load', 'overheating related to vehicle mass or tire load', 'endurance compound choice versus tire load'],
  claimFingerprint: sha256('vehicle-load-dependent compound applicability').slice(0, 24),
  corroboratingEvidenceIds: [],
};
combinedEvidence.push(architectureEvidence);
writeJsonl(path.join(outputRoot, 'evidence_candidates.jsonl'), combinedEvidence);
writeJson(path.join(outputRoot, 'evidence_type_schema.json'), {
  allowedTypes: ['MEASUREMENT', 'OBSERVATION', 'SCALING_RULE', 'HISTORICAL_CONSTRAINT', 'CALIBRATION_FIXTURE', 'CONFLICT', 'COMPOUND_APPLICABILITY', 'SOURCE_METHODOLOGY', 'EVENT_SUPPLIER_EVIDENCE', 'CALIBRATION_METHOD'],
  publicationDateRule: 'Publication date and subject period are independent provenance fields.',
  retrospectiveRule: 'A later publication about a historical event is SECONDARY_RETROSPECTIVE unless the underlying primary record is separately reviewed.',
});
writeJson(path.join(outputRoot, 'architecture_candidates.json'), {
  candidates: [architectureEvidence],
  numericalRulesImplemented: 0,
  applicationFilesChanged: 0,
});

const conflicts = readJsonl(path.join(milestone1Root, 'conflict_register.jsonl'));
writeJsonl(path.join(outputRoot, 'conflict_register.jsonl'), conflicts);

const repositoryRoot = path.resolve(stagingRoot, '..');
const outOfScopeFiles = [
  'src/payload/app/app.js',
  'src/payload/app/index.html',
  'src/payload/app/pressure_solver.js',
].map((relativePath) => ({
  relativePath,
  sha256AtCheckpoint: hashFile(path.join(repositoryRoot, relativePath)),
  disposition: 'PRE_EXISTING_UNCOMMITTED_PHYSICS_WORK_PRESERVED_OUT_OF_SCOPE',
}));
writeJson(path.join(outputRoot, 'scope_guard.json'), {
  researchScope: 'Staging-only research lineage, ontology, acquisition-target repair, evidence merge, and audit.',
  prohibitedActionsObserved: [],
  outOfScopeFiles,
  canonicalKnowledgeChanged: false,
  applicationChangedByThisPipeline: false,
  buildRun: false,
  releaseCreated: false,
});

function milestone2PriorityScore(row) {
  let score = Number(row.priority_score || 0);
  if (/Group 2 \/ ETCC/.test(row.historical_class) && row.subject_period_start <= 1976 && row.subject_period_end >= 1971) score += 80;
  if (/Formula 1 — early/.test(row.historical_class) && row.subject_period_start <= 1965 && row.subject_period_end >= 1958) score += 75;
  if (/GT40/.test(row.historical_class)) score += 70;
  if (/BPR|JGTC|GT1/.test(row.historical_class) && row.subject_period_start <= 1996 && row.subject_period_end >= 1993) score += 65;
  if (['W01_PRESSURE_TEMP_SETUP', 'W03_FM_STIFFNESS_TRANSIENT', 'W10_RR_HYSTERESIS_THERMAL'].includes(row.parent_weakness)) score += 30;
  if (['W02_WEAR_LIFE_GRIP', 'W04_WET_INTERMEDIATE'].includes(row.parent_weakness)) score += 25;
  return score;
}

const scoredP0 = [...activeP0]
  .map((row) => ({ ...row, milestone2_priority_score: milestone2PriorityScore(row) }))
  .sort((a, b) => b.milestone2_priority_score - a.milestone2_priority_score || b.priority_score - a.priority_score || a.target_id.localeCompare(b.target_id));

// The original blind score over-selected W01. Preserve the stated A-E research
// priorities while ensuring stiffness/transient, wet and general-mechanics gaps
// are represented in the first executed batch.
const selectedTargetIds = new Set();
const selectedForExecution = [];
function selectWhere(predicate, limit) {
  for (const row of scoredP0) {
    if (selectedForExecution.length >= 250 || limit <= 0) break;
    if (!selectedTargetIds.has(row.target_id) && predicate(row)) {
      selectedTargetIds.add(row.target_id);
      selectedForExecution.push(row);
      limit -= 1;
    }
  }
}
selectWhere((row) => /Group 2 \/ ETCC/.test(row.historical_class) && row.subject_period_start <= 1976 && row.subject_period_end >= 1971, 45);
selectWhere((row) => /GT40/.test(row.historical_class), 35);
selectWhere((row) => /BPR|JGTC|GT1|GT2|IMSA GT\/GTS/.test(row.historical_class) && row.subject_period_start <= 1996 && row.subject_period_end >= 1993, 55);
selectWhere((row) => row.ontology_id === 'general_tire_mechanics', 30);
selectWhere((row) => row.parent_weakness === 'W03_FM_STIFFNESS_TRANSIENT', 60);
selectWhere((row) => row.parent_weakness === 'W04_WET_INTERMEDIATE', 25);
selectWhere(() => true, 250 - selectedForExecution.length);

const executionQueue = selectedForExecution
  .map((row, index) => ({
    queueRank: index + 1,
    targetId: row.target_id,
    originalTargetId: row.original_target_id,
    milestone2PriorityScore: row.milestone2_priority_score,
    status: 'PENDING_ACQUISITION',
    sourceIdentityId: null,
    reviewStatus: null,
    note: 'Structural gates passed. This target is queued but does not count as reviewed until a unique real document is resolved and its contents are reviewed.',
  }));
writeJsonl(path.join(outputRoot, 'P0_TOP_250_EXECUTION_QUEUE.jsonl'), executionQueue);

const queueTargetById = new Map(selectedForExecution.map((row) => [row.target_id, row]));
const acquisitionReviewById = new Map(acquisitionReviews.map((row) => [row.acquisitionDocumentId, row]));
const searchSweeps = [
  { searchSweepId: 'M2-SWEEP-GROUP2', scope: '1971-1976 Group 2 / ETCC', queries: ['Group 2 ETCC Dunlop Goodyear tire pressure pyrometer 1971 1976', 'Escort Camaro BMW Group 2 intermediate tyre compound 1970 1976'], repositories: ['Motor Sport archive', 'supplier archives', 'SAE/NASA technical indexes'], disposition: 'Period compound observations found; no qualifying cold/hot-pressure, pyrometer or team setup sheets found for most exact supplier/subtopic targets.' },
  { searchSweepId: 'M2-SWEEP-GT40', scope: '1964-1969 GT40/endurance', queries: ['Ford GT40 Goodyear Firestone Dunlop tire pressure size Le Mans 1964 1969', 'GT40 tyre failure wet intermediate stint Goodyear Firestone'], repositories: ['Ford heritage/SAE', 'Goodyear history', 'Motor Sport archive', 'FIA Historic Database'], disposition: 'Supplier/event and failure evidence found; exact pressure, pyrometer and setup-book targets largely remain open.' },
  { searchSweepId: 'M2-SWEEP-1950S', scope: '1950s-early 1960s sports/GP and Dunlop R5/RS5', queries: ['Dunlop R5 RS5 racing tyre pressure temperature 1958 1965', '1959 Grand Prix Dunlop tyre heat wear race report'], repositories: ['Dunlop history', 'Motor Sport archive', 'historic supplier catalogues'], disposition: 'Period durability/heat observations and later RS5 construction history found; no period pressure table or stiffness/F&M document found.' },
  { searchSweepId: 'M2-SWEEP-1990SGT', scope: '1993-1996 BPR/Le Mans/JGTC/IMSA GT', queries: ['BPR GT1 tyre pressure compound Goodyear Michelin Dunlop Pirelli 1994 1996', '1994 JGTC tire allocation compound pressure', '1996 IMSA GTS tire regulations'], repositories: ['FIA Historic Database', 'supplier histories', 'Motor Sport archive', 'RacingSportsCars'], disposition: 'Chronology, supplier/event context and regulations found; numerical pressure/temperature/stiffness/wear documents were not found for most exact targets.' },
  { searchSweepId: 'M2-SWEEP-MECHANICS', scope: 'general tire thermal/mechanics/wear architecture', queries: ['site:ntrs.nasa.gov tire heat generation deflection pressure slip wear', 'site:saemobilus.sae.org tire temperature inflation pressure deflection footprint'], repositories: ['NASA NTRS', 'SAE Mobilus'], disposition: 'Multiple qualifying government reports and SAE abstracts reviewed; applicability is architectural/methodological unless a racing bridge exists.' },
  { searchSweepId: 'M2-SWEEP-OTHER-HISTORIC', scope: 'remaining active historic class/supplier targets', queries: ['historic racing tire pressure temperature supplier setup Goodyear Dunlop Avon Michelin Pirelli Firestone', 'period racing tyre wear stint compound wet intermediate'], repositories: ['Motor Sport archive', 'supplier archives', 'FIA Historic Database', 'technical indexes'], disposition: 'Only reviewed documents with direct relevance were linked; unmatched exact combinations are retained as NO_DOCUMENT_FOUND rather than inferred.' },
];
writeJson(path.join(outputRoot, 'acquisition_search_sweeps.json'), searchSweeps);

function targetSearchSweep(row) {
  if (/Group 2 \/ ETCC/.test(row.historical_class)) return 'M2-SWEEP-GROUP2';
  if (/GT40/.test(row.historical_class)) return 'M2-SWEEP-GT40';
  if (/1950|1960|Historic Racing Reference/.test(row.historical_class)) return 'M2-SWEEP-1950S';
  if (/BPR|JGTC|GT1|GT2|IMSA GT\/GTS/.test(row.historical_class)) return 'M2-SWEEP-1990SGT';
  if (row.ontology_id === 'general_tire_mechanics') return 'M2-SWEEP-MECHANICS';
  return 'M2-SWEEP-OTHER-HISTORIC';
}

function resolutionDocumentId(row) {
  const subtopic = normalizedText(row.evidence_subtopic);
  if (row.ontology_id === 'general_tire_mechanics') {
    if (row.parent_weakness === 'W02_WEAR_LIFE_GRIP') return 'M2-DOC-0009';
    if (/pressure.*deflection|deflection.*pressure|vertical stiffness|footprint/.test(subtopic)) return 'M2-DOC-0006';
    if (/pressure rise|rolling loss/.test(subtopic)) return 'M2-DOC-0011';
    if (/ambient|inflation pressure.*temperature/.test(subtopic)) return 'M2-DOC-0007';
    if (/surface.*core|core.*surface|heat transfer|thermal diffusion/.test(subtopic)) return 'M2-DOC-0010';
    if (/slip|braking/.test(subtopic)) return 'M2-DOC-0013';
    if (/load heating|speed cooling|carcass temperature|cyclic deflection/.test(subtopic)) return 'M2-DOC-0008';
    if (row.parent_weakness === 'W03_FM_STIFFNESS_TRANSIENT') return 'M2-DOC-0012';
  }
  if (/GT40/.test(row.historical_class) && /Goodyear/i.test(row.supplier_target)
      && (row.parent_weakness === 'W04_WET_INTERMEDIATE' || /failure|tread|wet|intermediate/.test(subtopic))) return 'M2-DOC-0001';
  if (/Group 2 \/ ETCC/.test(row.historical_class) && /Dunlop/i.test(row.supplier_target)
      && (row.parent_weakness === 'W04_WET_INTERMEDIATE' || /compound|wet|intermediate/.test(subtopic))) return 'M2-DOC-0002';
  if (/Sports racing \/ prototypes — 1950-1963/.test(row.historical_class) && /Dunlop/i.test(row.supplier_target)
      && /heat|durability|stint|wear/.test(subtopic)) return 'M2-DOC-0019';
  if (/Historic Racing Reference/.test(row.historical_class) && /Dunlop/i.test(row.supplier_target)
      && /pressure/.test(subtopic)) return 'M2-DOC-0021';
  return null;
}

const targetResults = executionQueue.map((queued) => {
  const target = queueTargetById.get(queued.targetId);
  const acquisitionDocumentId = resolutionDocumentId(target);
  const review = acquisitionDocumentId ? acquisitionReviewById.get(acquisitionDocumentId) : null;
  if (!review) return {
    queueRank: queued.queueRank,
    targetId: queued.targetId,
    originalTargetId: queued.originalTargetId,
    targetStatus: 'NO_DOCUMENT_FOUND',
    reviewStatus: 'NO_DOCUMENT_FOUND',
    sourceIdentityId: null,
    acquisitionDocumentId: null,
    searchSweepId: targetSearchSweep(target),
    evidenceCandidateIds: [],
    note: 'Processed in the cited grouped acquisition sweep. No reviewed document directly satisfied this exact class/supplier/subtopic intent; the gap remains open.',
  };
  return {
    queueRank: queued.queueRank,
    targetId: queued.targetId,
    originalTargetId: queued.originalTargetId,
    targetStatus: review.reviewStatus,
    reviewStatus: review.reviewStatus,
    sourceIdentityId: acquisitionDocumentToIdentity.get(acquisitionDocumentId) || null,
    acquisitionDocumentId,
    searchSweepId: targetSearchSweep(target),
    evidenceCandidateIds: review.evidenceIds || [],
    note: 'Resolved only because the linked document was reviewed and directly addresses the target mechanism or historical context. Source limitations remain controlling.',
  };
});
writeJsonl(path.join(outputRoot, 'P0_TOP_250_EXECUTION_RESULTS.jsonl'), targetResults);

const resolvedTargetResults = targetResults.filter((row) => row.targetStatus !== 'NO_DOCUMENT_FOUND');
const targetExecutionValidation = {
  queuedTargets: executionQueue.length,
  resultRows: targetResults.length,
  uniqueTargetIds: new Set(targetResults.map((row) => row.targetId)).size,
  allQueueTargetsResolvedToDisposition: executionQueue.every((row) => targetResults.some((result) => result.targetId === row.targetId)),
  allowedStatusesOnly: targetResults.every((row) => ['FULL_TEXT_REVIEWED', 'PRIMARY_SCAN_REVIEWED', 'PRIMARY_PERIOD_PAGE_REVIEWED', 'ABSTRACT_ONLY', 'SECONDARY_RETROSPECTIVE', 'ACCESS_BLOCKED', 'NO_DOCUMENT_FOUND', 'DUPLICATE_EXISTING_SOURCE'].includes(row.targetStatus)),
  targetsLinkedToReviewedDocuments: resolvedTargetResults.length,
  uniqueReviewedDocumentsLinked: new Set(resolvedTargetResults.map((row) => row.acquisitionDocumentId)).size,
  noDocumentFound: targetResults.filter((row) => row.targetStatus === 'NO_DOCUMENT_FOUND').length,
};
targetExecutionValidation.pass = targetExecutionValidation.queuedTargets === 250
  && targetExecutionValidation.resultRows === 250
  && targetExecutionValidation.uniqueTargetIds === 250
  && targetExecutionValidation.allQueueTargetsResolvedToDisposition
  && targetExecutionValidation.allowedStatusesOnly;
writeJson(path.join(outputRoot, 'top_250_execution_validation.json'), targetExecutionValidation);

const checkpointSummary = {
  checkpoint: 'MILESTONE 2 — WEAKNESS CLOSURE / ONTOLOGY / FIRST 250 DOCUMENTS',
  status: targetExecutionValidation.pass ? 'MILESTONE_2_STAGING_CHECKPOINT_COMPLETE' : 'TOP_250_EXECUTION_VALIDATION_FAILED',
  layers: {
    A: {
      registered: 55,
      reviewed: unifiedReviews.filter((row) => row.layer === 'A' && row.reviewStatus !== 'METADATA_ONLY').length,
      deferred: unifiedReviews.filter((row) => row.layer === 'A' && row.reviewStatus === 'METADATA_ONLY').length,
    },
    B: { registered: 500 },
    C: { pilotRegistered: 5000, fullCorpusVerified: 50000 },
    D: {
      original: originalManifest.length,
      quarantined: originalDispositions.filter((row) => row.status.startsWith('QUARANTINED')).length,
      correctedReplacements: replacements.length,
      active: activeTargets.length,
      p0Active: activeP0.length,
      executed: targetResults.length,
      queuedForExecution: 0,
      linkedToReviewedDocuments: targetExecutionValidation.targetsLinkedToReviewedDocuments,
      noDocumentFound: targetExecutionValidation.noDocumentFound,
    },
  },
  p0Validation,
  fullValidation,
  targetExecutionValidation,
  sourceIdentity: {
    unifiedIdentityRows: unifiedIdentity.length,
    milestone1Rows: milestone1Identity.length,
    layerDSeedRows: seedReviews.length,
    newLayerDSeedDocumentsReviewed: layerDReviews.filter((row) => !row.reusedExistingReview && !['METADATA_ONLY', 'INACCESSIBLE'].includes(row.reviewStatus)).length,
    layerDSeedAccessBlocked: layerDReviews.filter((row) => row.reviewStatus === 'INACCESSIBLE').length,
    acquisitionBatchDocuments: acquisitionReviews.length,
    acquisitionBatchReviewStatuses: countBy(acquisitionReviews, 'reviewStatus'),
    uniqueAcquisitionSourceIdentities: new Set(acquisitionReviews.map((row) => acquisitionDocumentToIdentity.get(row.acquisitionDocumentId))).size,
    preservedKnownDuplicateGroups: [['SRC025', 'SRC098'], ['SRC030', 'SRC081']],
  },
  evidence: {
    milestone1Candidates: milestone1Evidence.length,
    weaknessSeedCandidates: seedEvidence.length,
    acquisitionBatchCandidates: acquisitionEvidence.length,
    architecturalCandidates: 1,
    unifiedCandidates: combinedEvidence.length,
    exactClaimDuplicatesMerged: milestone1Evidence.length + seedEvidence.length + acquisitionEvidence.length - (combinedEvidence.length - 1),
    byType: countBy(combinedEvidence, 'evidenceType'),
  },
  conflicts: {
    carriedForward: conflicts.length,
    new: 0,
    resolved: 0,
    unresolved: conflicts.length,
  },
  safeguards: {
    milestone1Duplicated: false,
    originalLayerDRowsModified: false,
    canonicalKnowledgeChanged: false,
    applicationChanged: false,
    physicsChanged: false,
    buildRun: false,
    releaseCreated: false,
    preExistingUncommittedPhysicsWork: 'PRESERVED_OUT_OF_SCOPE',
  },
  limitations: [
    'The top 250 active targets were processed to an allowed disposition. This does not mean 250 documents were found: unmatched exact intents remain NO_DOCUMENT_FOUND.',
    'Deferred Layer A and weakness seed rows remain unreviewed unless an explicit acquisition review superseded their metadata-only status; they are not counted as evidence.',
    'Curated period subdivisions in the ontology remain terminology guards; they are not tire-physics claims.',
    'No numerical model change is supported or implemented by this checkpoint.',
  ],
};
writeJson(path.join(outputRoot, 'checkpoint_summary.json'), checkpointSummary);

const outputFiles = fs.readdirSync(outputRoot).filter((name) => !['output_hashes.json'].includes(name));
writeJson(path.join(outputRoot, 'output_hashes.json'), Object.fromEntries(outputFiles.map((name) => [name, hashFile(path.join(outputRoot, name))])));

console.log(JSON.stringify(checkpointSummary, null, 2));
