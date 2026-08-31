# ACLM research staging

This directory is deliberately separate from the shipped Tire Knowledge JSON and generator.

- handoff contains the supplied immutable corpus inputs.
- checkpoint_000_first_5000 is a registration/lineage checkpoint, not promoted evidence.
- checkpoint_001_milestone1 adds the first actual source-review batch, staged evidence candidates, a conflict register, propagated task statuses, and the Milestone 1 impact report.
- weakness_10000_checkpoint_000_audit verifies the later 10,000-document acquisition pack and quarantines generated temporal/class conflicts without treating targets as documents.
- weakness_10000_checkpoint_001_seed_review contains the first high-value seed reviews and evidence candidates; its P0 1,000-document milestone is explicitly incomplete.
- weakness_10000_checkpoint_002_target_correction_proposal preserves the original P0 rows while proposing class/date repairs for the temporal conflicts found in the generated target set.
- checkpoint_002_milestone2_working is the consolidated Milestone 2 staging checkpoint. It merges Layer D into the Milestone 1 source/evidence graph, supplies the reusable historical ontology and repository rules, preserves the immutable 10,000-row input, validates corrected P0/full-corpus active targets, and records honest dispositions for the first 250 targets.
- A task is never counted as a source, and a source candidate is never counted as reviewed evidence.
- Child tasks remain deferred until the parent source has the required review status.
- No numerical generator change or application build is authorized by corpus registration.
- In checkpoint 001, the word "promoted" in task statuses means task-to-staged-evidence promotion only; canonical Tire Knowledge remains unchanged.

The working application changes already present when this handoff arrived are outside this research checkpoint and must not be committed or released as part of ingestion.
