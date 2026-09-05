# Calspan 1976 Complete Index — Ingestion Report

Status: complete for the supplied `ACLM_CALSPAN_1976_COMPLETE_INDEX.zip` retrieval package. This package indexes primary reports, but does not contain the nine original PDF binaries or digitized curve coordinates.

## Corpus accounting

| Record type | Count | Meaning |
|---|---:|---|
| Report volumes | 9 | PB263440–PB263448 / DOT HS-802 086–094 |
| Indexed pages | 3,630 | Page metadata, SHA-256 and OCR/transcribed text |
| Appendix B tire IDs | 380 | Transcribed identity rows |
| Tires reported procured in Volume I | 378 | Primary-report count; the 2-record discrepancy is unresolved |
| Tire-identification data packages | 358 | Volumes III–IX |
| Unique mapped master tires | 306 | Package-to-master mappings |
| Measurement/control pages | 708 | Page locators, not digitized curves |
| Cornering coefficient pages | 348 | Indexed raw coefficient/page text |
| Braking coefficient pages | 286 | Indexed raw coefficient/page text |
| Additional test-data pages | 65 | Indexed page class |
| Combined-interaction pages | 9 | Indexed page class |
| Mapping confidence | 126 HIGH / 138 MEDIUM / 94 LOW | Package-to-master identity mapping |
| Fully digitized force-curve XY observations | **0** | No force/moment value was invented or inferred from a page locator |

## Durable artifacts

- `source_index/` preserves every file supplied inside the ZIP: workbook, CSVs, gzip JSONL page text, SQLite retrieval database, notes, README and manifest.
- `CALSPAN_TIRE_SPECIMENS.csv` preserves 380 identities and their raw construction/cord/product fields.
- `CALSPAN_TEST_SERIES.csv` preserves 358 package-level raw fields and normalizes only strict, unambiguous numeric tokens.
- `CALSPAN_TEST_OBSERVATIONS.csv` preserves 708 measurement-page locators, raw coefficient blocks, normalized conditions where safe, channel groups, and an explicit zero digitized-point count.
- `CALSPAN_CORPUS_MANIFEST.json` records hashes, sizes, counts, boundaries and derived artifacts.

Malformed OCR such as `lG20` or `2.4-` remains in the raw field and produces a blank normalized field. Clean unit conversions are deterministic: mph→km/h, mil→mm, psi→kPa and lb→N.

## Master research totals

The canonical research ledgers now contain 2,484 evidence records and 1,313 sources. The Calspan pass added nine volume sources and six corpus/policy claims. It did not add force-curve measurements to the production Knowledge `measurements` collection.

## Applicability decision

Calspan 1976 is a broad passenger-tire test program. It is valuable for channel taxonomy, test-condition design, construction mechanisms, wet/water-depth branches, load/pressure/speed/camber relationships and extraction targeting. It is not supplier-, event-, chassis- or racing-family-exact evidence.

The default racing applicability is `MECHANISM_ONLY`. Four road-derived historical touring families receive `CLOSE_ANALOG` architecture credit (FAM017, FAM019, FAM021 and FAM027), still with zero promoted numeric parameters. Direct racing evidence always outranks this corpus.

## Source limitation

The original report PDFs are identified and hashed by the supplied index, but their binaries were not included. PDF page-image visual QA and curve digitization therefore remain future recovery tasks. The page text and locators are preserved so those tasks can be executed without rebuilding the corpus map.
