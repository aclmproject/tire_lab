# ACLM Calspan 1976 Tire Parameter Determination - Complete Corpus Index

## Purpose

This package indexes the nine-volume 1976 Calspan/NHTSA **Tire Parameter Determination**
corpus (Contract DOT-HS-4-00923) for the ACLM Historical Tire Lab.

It is an indexing/retrieval package. It does **not** make production tire-model numeric changes.

## Corpus coverage

- 9 source PDFs
- 3,630 PDF pages indexed
- 380 unique tire-identification entries transcribed from Volume II Appendix B
- 358 tire-identification package starts detected in Volumes III-IX
- 708 measurement/control pages indexed:
  - 348 cornering-coefficient pages
  - 286 braking-coefficient pages
  - 65 additional test-data pages
  - 9 combined-interaction pages
- 321 tire-uniformity pages
- 323 footprint/image pages
- Full extracted text retained for all 3,630 pages in gzip JSONL and SQLite FTS.

## Important count discrepancy preserved

Volume I reports **378 tires procured** in its representative-sample summary. The Volume II
Appendix B transcription in this package yields **380 unique TIRF tire IDs**. This package does
not silently reconcile or overwrite that discrepancy. Both are retained as source facts.

## Evidence rules

- Source PDFs/scans: `DIRECT PRIMARY`
- Appendix B transcription: direct-primary source transcription with OCR/transcription uncertainty retained
- Package-to-master tire mapping where handwritten IDs are weak: `DERIVED / RECONSTRUCTED`
- No reconstructed mapping is promoted over the source page. `tire_no_raw`, source volume/page,
  mapping confidence, and mapping basis are retained.
- `NO PRODUCTION NUMERIC CHANGES WITHOUT VALIDATION`

Package mapping confidence:
- HIGH: 126
- MEDIUM: 138
- LOW: 94

The LOW mappings are intentionally exposed rather than hidden; future manual page-image review can
replace them without disturbing the raw corpus index.

## Files

- `ACLM_Calspan_1976_Corpus_Index.xlsx` - human-facing workbook
- `calspan_1976_tire_master.csv` - Appendix B master tire list + package coverage
- `calspan_1976_data_packages.csv` - detected Part II tire packages and OCR-identification fields
- `calspan_1976_measurement_pages.csv` - cornering/braking/test-data page locator
- `calspan_1976_page_index.csv` - all-page locator and classification
- `calspan_1976_full_page_text.jsonl.gz` - full page text archive
- `calspan_1976_index.sqlite` - searchable relational database with `pages_fts` FTS5 index
- `calspan_1976_volumes.csv` - volume metadata and SHA-256 provenance
- `INDEX_MANIFEST.json` - package metrics, source hashes, and schema notes

## SQLite examples

```sql
-- Find every page mentioning a Dunlop construction:
SELECT p.volume, p.pdf_page, p.tire_key, p.page_class, snippet(pages_fts,0,'[',']','...',20)
FROM pages_fts
JOIN pages p ON p.id = pages_fts.rowid
WHERE pages_fts MATCH 'DUNLOP';

-- Locate coefficient pages for one TIRF tire:
SELECT volume, pdf_page, measurement_page_type, run_id_raw
FROM measurement_pages
WHERE tire_key='TIRF-317'
ORDER BY volume, pdf_page;

-- Find all radial Dunlop entries in the Appendix B master:
SELECT tire_key, size_raw, brand_name_raw, cords_raw
FROM tires
WHERE manufacturer_code='DU' AND construction_type='R'
ORDER BY CAST(tire_no AS INTEGER);
```

## Source volume map

- Volume 1: PB263440 / DOT HS-802 086 / PB263440.pdf / 28 pages / SHA-256 `a17e473a68ae85a9a9cb9e3caef604f027705bd684c19d5b71c36fb848c478cb`
- Volume 2: PB263441 / DOT HS-802 087 / PB263441(1).pdf / 300 pages / SHA-256 `e742f3b0ed0bb9e0b0da0e9f64987d6e52164fd841b58616c1c137157f768275`
- Volume 3: PB263442 / DOT HS-802 088 / PB263442(1).pdf / 484 pages / SHA-256 `a42b572ba9c11b1c7d7c079c841632eed703604421c597bae3fd25b50526a3d2`
- Volume 4: PB263443 / DOT HS-802 089 / PB263443(1).pdf / 488 pages / SHA-256 `ed8ed9e323c69ca27b2ce41078c90280053cc300865d6294fc1cad151363559c`
- Volume 5: PB263444 / DOT HS-802 090 / PB263444(1).pdf / 484 pages / SHA-256 `aa4f2d4de7d1a3e84d839164a5d602038423b4efd26425970fbbfc48b25a1f3d`
- Volume 6: PB263445 / DOT HS-802 091 / PB263445(1).pdf / 488 pages / SHA-256 `b96e16e461c7f3b0b31d8a8e63da851ebd9209b0e04eadb13048424bc09bf4c6`
- Volume 7: PB263446 / DOT HS-802 092 / PB263446(1).pdf / 474 pages / SHA-256 `74a905a6c0ae5109d56742057c6671b009a8159bb2de9ed87b4bd4b0b37f9f29`
- Volume 8: PB263447 / DOT HS-802 093 / PB263447(1).pdf / 444 pages / SHA-256 `df9b33e6144c2ce12a7040b324f65c8ab871131977f18076b062d56b7b30ba34`
- Volume 9: PB263448 / DOT HS-802 094 / PB263448(1).pdf / 440 pages / SHA-256 `a17415aafb26b665e6d3a64babcac9606d64e62b69de5c64fb4ba6f48e7097c6`

## Next ACLM use

This corpus can now be queried by tire, construction, manufacturer, page class, or arbitrary full-text
term without reopening thousands of PDF pages. The next research step should be **numeric digitization
and validation of selected force/moment families**, not re-indexing this corpus.
