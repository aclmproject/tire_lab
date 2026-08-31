ACLM HISTORICAL TIRE LAB — 500-PIECE CORPUS EXPANSION

PURPOSE
This pack contains EXACTLY 500 discrete content-ingestion/research records for the canonical Tire Knowledge corpus. It is designed to extend evidence depth without padding the library with 500 random low-quality URLs.

BREAKDOWN
- 290 deep-mining records across the 145 sources already in Tire Knowledge v1.7.0 (two new extraction passes per source)
- 100 records covering the 50 sources from the prior new-source packet (quantitative/full-text pass + applicability/model-rule pass)
- 100 records covering 50 additional source candidates found in the latest research scan
- 10 cross-source high-priority gap missions
TOTAL = 500

PRIMARY INPUT
ACLM_Tire_Lab_500_Content_Corpus.jsonl

SUPPORTING FILES
FRESH_50_SOURCE_MANIFEST.txt
CORPUS_STATS.txt
ACLM_Tire_Lab_500_Content_Corpus.csv (human inspection only)

DESKTOP INSTRUCTIONS

1. Work on the CANONICAL Tire Knowledge master and current canonical Tire Lab only. Do not create a separate research app or alternate knowledge database.

2. Read ACLM_Tire_Lab_500_Content_Corpus.jsonl and process every record. Preserve content_id so every ingestion decision is auditable.

3. IMPORTANT: these records are research/ingestion instructions, not 500 pre-approved facts. For each source-backed record, actually open/read the source where accessible. Never promote the known_summary as if it were a full-text finding.

4. Before adding a source, deduplicate using normalized title, DOI/report number, author/year, and URL. The fresh-50 list was screened against exact titles in the current 145-source knowledge list and prior 50-source packet, but Desktop must still perform semantic deduplication.

5. Track source review state explicitly:
   FULL_TEXT_REVIEWED
   PRIMARY_SCAN_REVIEWED
   ABSTRACT_ONLY
   SECONDARY_ONLY
   INACCESSIBLE
   DUPLICATE_EXISTING_SOURCE

6. Promote evidence into explicit types, not broad prose blobs:
   measurement
   observation
   scalingRule
   historicalConstraint
   fitmentEvidence
   eventSupplierEvidence
   calibrationMethod
   calibrationFixture (for our own AC telemetry only)

7. Every promoted evidence record must preserve:
   source ID
   page/section/table/figure where available
   exact context and test conditions
   units
   tire size/construction
   load
   pressure
   speed
   temperature measurement location (surface/tread I-M-O/core/cavity/air/etc.)
   slip/camber/drive-brake state where applicable
   direct measurement vs derived fit vs author interpretation
   applicability scope
   confidence

8. Separate GENERAL TIRE MECHANICS from DIRECT MOTORSPORT EVIDENCE. Passenger-car, truck and aircraft work is valuable for mechanisms, equations and normalized scaling, but must not silently supply absolute race-tire grip/temperature/wear constants.

9. Separate HISTORICAL TARGETS from AC IMPLEMENTATION. Real-world distance is not AC virtual km. Historical tread temperature is not automatically AC core temperature. Historical hot pressure is not automatically PRESSURE_STATIC.

10. For the 290 deep-mining records on existing sources, compare against current measurements/scalingRules first and add only genuinely new evidence or richer provenance. Do not double-count the source merely because a new extraction record exists.

11. For the 100 records from the prior 50-source packet and the 100 records from the fresh 50 sources, create source records only after verification. If paywalled/abstract-only, keep the evidence level honest.

12. For the 10 gap missions, search deeply and return a source manifest before promoting any numerical target. Primary manufacturer/team/regulatory/technical sources outrank retrospective summaries.

13. Do NOT automatically change numerical Tire Lab generator parameters as part of corpus ingestion. First produce an evidence-impact report listing:
    - formulas/rules strengthened
    - historical priors supported/challenged
    - families/classes affected
    - proposed numerical changes, if any
    - evidence strength and conflicts

14. Numerical changes require an explicit trace from source evidence -> interpretation -> affected model parameter/prior -> regression impact. If evidence only supports architecture/directionality, change the rule/constraint rather than inventing a coefficient.

15. Add an evidence conflict mechanism. If two credible sources disagree, retain both with context (supplier, construction, track, measurement method, era) rather than averaging them into fake certainty.

16. Add/retain Research Needed priorities from confidenceGaps and update them based on the new evidence. A source that reduces one gap may reveal another.

17. Pay special attention to evidence that can improve the current active calibration problems:
    - cold-to-hot pressure closure and pressure/deflection coupling
    - surface vs carcass/core/cavity temperature distinctions
    - construction-specific thermal behavior (cross-ply/belted/radial)
    - vertical/lateral carcass stiffness and pressure-rate response
    - load/camber/combined-slip force behavior
    - wear energy, wear-vs-load/temp, and wear->grip mapping
    - wet/intermediate temperature and tread-depth behavior
    - heat-cycle degradation
    - high-speed growth/cooling
    - supplier/event-specific 1993-1996 GT1 tire identity
    - 1971-76 Group 2/ETCC slick operating evidence

18. The fresh source set intentionally includes period SAE/NASA mechanics, official modern manufacturer pressure-temperature references, period racing reports, Escort-specific material, and 1995 GT1 supplier chronology. Treat each at the appropriate evidence level.

19. Do not bundle copyrighted full papers into the end-user installer unless licensing explicitly permits it. Store bibliographic metadata, extracted facts/rules and citations. Development-only local source copies can remain outside the distributable package.

20. After processing all 500 records, produce:
    A. INGESTION_LEDGER with one row per content_id and status
    B. NEW_SOURCES_ADDED list
    C. DUPLICATES/INACCESSIBLE list
    D. NEW_MEASUREMENTS count/list
    E. NEW_OBSERVATIONS count/list
    F. NEW_SCALING_RULES count/list
    G. NEW_HISTORICAL_CONSTRAINTS count/list
    H. NEW_FITMENT/EVENT-SUPPLIER evidence
    I. CONFLICTS / contradictory evidence
    J. CONFIDENCE_GAPS before/after
    K. MODEL_IMPACT_PROPOSALS (no silent numerical changes)
    L. affected family/class matrix

21. Increment the Tire Knowledge release version appropriately, regenerate content SHA/hash, update release notes, and make sure the packaged canonical Tire Lab consumes the updated release.

22. Run knowledge-integrity tests: no orphan source refs, duplicate IDs, malformed URLs, missing provenance, invalid evidence type, or release-hash mismatch.

23. Do not claim “500 sources added.” The correct statement is “500 corpus-expansion records processed.” Report the actual number of new unique sources successfully reviewed and added separately.

ACCEPTANCE CRITERION
Every one of the 500 content_id records must have a final auditable status. No item can silently disappear. The knowledge master should become deeper and more traceable, not merely larger.
