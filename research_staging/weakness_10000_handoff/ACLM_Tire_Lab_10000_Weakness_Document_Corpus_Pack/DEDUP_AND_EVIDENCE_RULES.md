# ACLM Tire Lab — 10,000-Document Gap-Closure Quality Gates

This pack is deliberately a **document acquisition manifest**, not a claim that 10,000 full documents have already been read or verified.

## What counts as one document
A target counts only when it is resolved to a unique, identifiable document such as a paper, report, patent, homologation form, regulation PDF, manufacturer bulletin/catalog, race technical report, period article, setup sheet, test report, entry list/program, or equivalent primary/technical artifact.

The following do **not** count: search results, topic/category pages, snippets, AI summaries, duplicate mirrors, link lists, or a citation that cannot be resolved to a document.

## Deduplication
Deduplicate by DOI, SAE/report number, patent family/publication number, FIA document identity, normalized title + authors + year, and canonical URL. A mirror does not become a second document. A translated FIA regulation is a second document only when it contains independently useful content; otherwise link it as a language mirror.

## Review status
Every resolved document must be labeled one of: FULL_TEXT_REVIEWED, PARTIAL_TEXT_REVIEWED, ABSTRACT_ONLY, METADATA_ONLY, INACCESSIBLE, DUPLICATE, OUT_OF_SCOPE, or NO_DOCUMENT_FOUND.

## Evidence separation
Extract separately: direct numeric measurements, direct historical observations, setup/operational guidance, construction facts, fitment/regulatory facts, causal/scaling relationships, model methodology, and inference. Never promote inference as direct measurement.

## Context preservation
For numbers preserve units, tire size, construction, supplier/compound, wheel/rim, load, pressure, speed, ambient/road/tire temperature, slip/camber, surface, wetness/water depth, test method, vehicle/class/event, and whether the reading is tread surface, carcass/core, cavity air, or another observable.

## Racing applicability
Passenger/truck/aircraft research can establish mechanisms and scaling directions. It cannot silently become an absolute racing coefficient. Patents prove disclosed construction ideas, not that a specific race tire used them. Modern historic guidance is not automatically original-period data.

## Numerical generator changes
Research ingestion alone must not automatically alter numeric Tire Lab priors. Produce evidence candidates first. Any proposed numeric change needs an explicit provenance chain, applicability argument, uncertainty/confidence, affected families, and cross-family regression plan.

## Stop conditions
If a target cannot be resolved after reasonable searching, mark NO_DOCUMENT_FOUND. Never fabricate a paper or URL to reach the 10,000 count. Unresolved targets are valuable evidence gaps.
