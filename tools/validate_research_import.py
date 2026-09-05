from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "research_import"


def canonical(value):
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(key) + ":" + canonical(value[key]) for key in sorted(value)) + "}"
    return json.dumps(value, separators=(",", ":"))


def hash_object(value) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def read_csv(name: str) -> list[dict[str, str]]:
    with (IMPORT / name).open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    evidence = read_csv("MASTER_EVIDENCE_LEDGER.csv")
    sources = read_csv("MASTER_SOURCE_MANIFEST.csv")
    inventory = read_csv("RESEARCH_ARCHIVE_INVENTORY.csv")
    contradictions = read_csv("CONTRADICTIONS_AND_SUPERSESSIONS.csv")
    numeric = read_csv("NUMERIC_EVIDENCE_CLASSIFICATION.csv")
    coverage = read_csv("TIRE_FAMILY_COVERAGE_SCORECARD.csv")
    provenance = json.loads((IMPORT / "INGESTION_PROVENANCE.json").read_text(encoding="utf-8"))

    require(len(inventory) == 75, "Expected 74 ZIPs plus one workbook in the inventory.")
    require(provenance["stats"]["archive_errors"] == 0, "Archive errors remain.")
    require(provenance["stats"]["member_errors"] == 0, "ZIP member errors remain.")
    require(provenance["stats"]["parse_errors"] == 0, "Structured-source parse errors remain.")
    require(provenance["productionNumericChangesRecommended"] is False, "Production numeric guardrail is not false.")

    evidence_ids = [row["evidence_id"] for row in evidence]
    evidence_by_id = {row["evidence_id"]: row for row in evidence}
    source_ids = [row["source_id"] for row in sources]
    relation_ids = [row["relationship_id"] for row in contradictions]
    numeric_ids = [row["numeric_id"] for row in numeric]
    require(len(evidence_ids) == len(set(evidence_ids)), "Duplicate evidence IDs found.")
    require(len(source_ids) == len(set(source_ids)), "Duplicate source IDs found.")
    require(len(relation_ids) == len(set(relation_ids)), "Duplicate relationship IDs found.")
    require(len(numeric_ids) == len(set(numeric_ids)), "Duplicate numeric IDs found.")

    allowed = {"DIRECT PRIMARY", "STRONG PERIOD/ARCHIVAL SECONDARY", "DERIVED/RECONSTRUCTED", "UNKNOWN"}
    require(all(row["evidence_class"] in allowed for row in evidence), "Noncanonical evidence class found.")
    require(all(row["evidence_class_original"] or row["evidence_class"] == "UNKNOWN" for row in evidence), "Evidence class provenance missing.")
    require(all(row["canonical_source_id"] in set(source_ids) or not row["canonical_source_id"] for row in evidence), "Broken canonical source link.")
    require(all(row["evidence_class"] != "DIRECT PRIMARY" or "direct primary" in norm(row["evidence_class_original"]) for row in evidence), "A direct-primary record was promoted without an explicit direct-primary source label.")
    require(all(not (row["numeric_class"].startswith("A") and evidence_by_id[row["evidence_id"]]["evidence_class"] != "DIRECT PRIMARY") for row in numeric), "Class-A numeric evidence lacks direct-primary classification.")
    require(all(not (row["numeric_class"].startswith("A") and "abstract" in norm(evidence_by_id[row["evidence_id"]]["evidence_class_original"])) for row in numeric), "Abstract-only evidence entered numeric class A.")
    require(all(row["reason"] or row["resolution_status"] for row in contradictions), "Contradiction/rejection reason missing.")

    fingerprints = ["|".join((norm(row["source_url_or_stable_identifier"] or row["source_title"]), norm(row["topic"]), norm(row["claim"]))) for row in evidence]
    require(len(fingerprints) == len(set(fingerprints)), "Duplicate canonical evidence fingerprint found.")
    require(len(coverage) == 85, "Coverage scorecard does not contain all 85 families.")
    require(len({row["family_id"] for row in coverage}) == 85, "Coverage scorecard family IDs are not unique.")

    corpus = "\n".join(norm(f"{row['topic']} {row['claim']} {row['applicability_limits']}") for row in evidence)
    required_trails = {
        "917 Watkins Glen Firestone": ("917", "watkins glen", "firestone"),
        "917 alignment heating failure": ("917", "alignment", "heat"),
        "250F Stelvio": ("250f", "stelvio"),
        "250F 5.50x16 baseline": ("250f", "5 50x16", "7 00x16"),
        "cotton/rayon/nylon": ("cotton", "rayon", "nylon"),
        "relaxation length": ("relaxation",),
        "combined slip": ("combined slip",),
        "Calspan 1976": ("calspan", "1976"),
        "Group C": ("group c",),
        "NTMP P195": ("p195",),
    }
    for label, tokens in required_trails.items():
        require(all(norm(token) in corpus for token in tokens), f"Required evidence trail missing: {label}")

    v171 = json.loads((ROOT / "knowledge" / "releases" / "ACLM_Tire_Knowledge_v1.7.1.json").read_text(encoding="utf-8"))
    v180 = json.loads((ROOT / "knowledge" / "releases" / "ACLM_Tire_Knowledge_v1.8.0.json").read_text(encoding="utf-8"))
    require(v180["releaseVersion"] == "1.8.0", "Knowledge v1.8.0 release version missing.")
    for key in ("generatorPriors", "measurements", "scalingRules", "fitmentOverrides", "classes"):
        require(hash_object(v171[key]) == hash_object(v180[key]), f"Frozen collection changed: {key}")
    require(v180.get("researchArchive", {}).get("productionNumericChangesRecommended") is False, "Knowledge research archive numeric guardrail missing.")
    car023 = next((item for item in v180["profiles"] if item["id"] == "CAR023"), None)
    require(car023 is not None and car023["supplier"] is None, "CAR023 must remain supplier-neutral outside event evidence.")
    require(car023["productionNumericChangesRecommended"] is False, "CAR023 numeric guardrail missing.")

    summary = {
        "inventoryRows": len(inventory),
        "evidenceRows": len(evidence),
        "sourceRows": len(sources),
        "numericRows": len(numeric),
        "contradictionRows": len(contradictions),
        "coverageRows": len(coverage),
        "knowledgeVersion": v180["releaseVersion"],
        "frozenCollectionsVerified": ["generatorPriors", "measurements", "scalingRules", "fitmentOverrides", "classes"],
        "productionNumericChangesRecommended": False,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"VALIDATION FAILED: {exc}", file=sys.stderr)
        raise
