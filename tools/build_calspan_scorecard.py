"""Recalculate family capability rankings after the additive Calspan architecture pass."""
import csv
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research_import" / "TIRE_FAMILY_COVERAGE_SCORECARD.csv"
DEST = ROOT / "research_import" / "calspan_1976" / "TIRE_FAMILY_CAPABILITY_SCORECARD_v1.9.0.csv"
CLOSE = {"FAM017", "FAM019", "FAM021", "FAM027"}

with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
    rows = list(csv.DictReader(handle))

pre_order = sorted(rows, key=lambda row: (-float(row["overall_confidence_score"]), row["family_id"]))
pre_rank = {row["family_id"]: index for index, row in enumerate(pre_order, 1)}
out = []
for row in rows:
    before = float(row["overall_confidence_score"])
    applicability = "CLOSE_ANALOG" if row["family_id"] in CLOSE else "MECHANISM_ONLY"
    uplift = 0.6 if applicability == "CLOSE_ANALOG" else 0.2
    after = min(100.0, round(before + uplift, 1))
    out.append({
        **row,
        "pre_calspan_score": f"{before:.1f}",
        "calspan_applicability": applicability,
        "architecture_readiness": "100.0",
        "calspan_digitized_curve_points": "0",
        "numeric_calibration_change": "0.0",
        "evidence_architecture_uplift": f"{uplift:.1f}",
        "post_calspan_score": f"{after:.1f}",
        "pre_calspan_rank": str(pre_rank[row["family_id"]]),
        "promotion_status": "BLOCKED — no digitized curves; racing applicability review required",
        "score_interpretation": "Architecture/evidence-routing readiness only; not added grip, stiffness, pressure, thermal or wear calibration confidence",
    })

post_order = sorted(out, key=lambda row: (-float(row["post_calspan_score"]), row["family_id"]))
post_rank = {row["family_id"]: index for index, row in enumerate(post_order, 1)}
for row in out:
    row["post_calspan_rank"] = str(post_rank[row["family_id"]])
    row["rank_change"] = str(pre_rank[row["family_id"]] - post_rank[row["family_id"]])

fields = list(out[0])
with DEST.open("w", encoding="utf-8", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    writer.writerows(sorted(out, key=lambda row: int(row["post_calspan_rank"])))

print("top25")
for row in post_order[:25]:
    print(row["post_calspan_rank"], row["family_id"], row["post_calspan_score"], row["rank_change"])
print("bottom10")
for row in post_order[-10:]:
    print(row["post_calspan_rank"], row["family_id"], row["post_calspan_score"], row["rank_change"])
