# ACLM Tire Lab 50k Corpus — Quality Gates

1. Never convert a task into a fact without source review.
2. Every content_id receives a final status.
3. Keep full-text, abstract-only, secondary-only, inaccessible, duplicate, not-present and not-applicable states distinct.
4. Preserve measurement location: tread surface/I-M-O vs carcass/core vs cavity/air vs rim.
5. Preserve historical target vs simulator implementation. Real km is not AC vKm. Historical hot pressure is not automatically PRESSURE_STATIC.
6. General passenger/truck/aircraft work can constrain mechanisms and normalized relationships; it cannot silently supply absolute racing constants.
7. Event-specific racing evidence outranks generic retrospective summaries for fitment/supplier/compound identity.
8. Conflicting credible evidence remains explicit and contextualized; do not average away supplier, size, construction, track or test-method differences.
9. No numerical generator change without evidence -> interpretation -> model parameter -> regression trace. “No change / insufficient evidence” is a valid outcome.
10. No app rebuild per research shard. Update research checkpoints/knowledge staging, then build at deliberate milestones.
11. Do not bundle copyrighted full papers in the end-user installer unless licensing permits. Keep citations/extracted evidence, and development-only source copies separately.
12. Run integrity checks after every batch: unique IDs, valid source refs, provenance, units, evidence type, no orphan refs, hash/version consistency.
