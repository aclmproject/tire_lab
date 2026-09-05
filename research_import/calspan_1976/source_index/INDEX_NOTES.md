# Indexing Notes and Known OCR Exceptions

This file documents manual/logic corrections made during corpus indexing. It exists so later ACLM work does not have to rediscover them.

## Appendix B master list

The Volume II Appendix B table was transcribed by PDF text/word coordinates and cross-checked against table order.

Known OCR corrections retained in the master index:

- Appendix B PDF p.222: the second OCR occurrence of `191` at size `165 SR15` is indexed as **TIRF 197**.
- Appendix B PDF p.225: a stray `III` graphical/OCR artifact overlaps the **TIRF 260** row; the actual row token `Z60` is retained as TIRF 260 and the duplicate artifact is discarded.
- Appendix B PDF p.229: OCR `312` in the otherwise sequential 36x/37x block is indexed as **TIRF 372**.
- Appendix B PDF p.235: OCR `l>19` for the 7.50-16 LT Goodyear Custom Hi Miler is indexed as **TIRF 619**.
- Appendix B TIRF 482 has a blank/failed construction transcription on the master page; its **radial-ply** classification is cross-indexed from Volume II Table 3-14. The construction source is explicitly marked accordingly.

The resulting Appendix B master contains **380 unique TIRF tire IDs**.

## Package crosswalk

Part II identification forms frequently contain handwritten values with poor text-layer recognition.
The package crosswalk therefore preserves:

- `tire_no_raw`
- raw identification-form fields
- `matched_tire_no`
- `mapping_confidence`
- `mapping_basis`
- sequence/alignment score

The mapping is not treated as direct primary evidence where handwriting/OCR is weak.

## Completeness definition

“Indexed” means:

1. every one of the nine PDFs has a SHA-256 and volume record;
2. every one of the 3,630 PDF pages has a locator, class, text hash, and full extracted text in the searchable archive;
3. Volume II Appendix B has a 380-row tire master;
4. every detected Tire Identification page in Volumes III-IX is a package start;
5. cornering, braking, uniformity, footprint/image, interaction, and other pages remain addressable by source volume/page and package;
6. full page text is stored in SQLite FTS and gzip JSONL so future research does not need another corpus-wide OCR/indexing pass.

This does **not** mean that every plotted curve has been manually digitized to clean numerical XY data. That is the next campaign and should be performed selectively under the ACLM validation rules.
