from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import pdfplumber


REPO = Path(__file__).resolve().parents[2]
CHECKPOINT = REPO / "research_staging" / "checkpoint_004_milestone4_fulltext"
MANIFEST = CHECKPOINT / "fulltext_acquisition_manifest.json"
EXTRACT_DIR = CHECKPOINT / "fulltext_extracts"
EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

KEYWORDS = {
    "PRESSURE": [
        "inflation pressure", "tire pressure", "tyre pressure", "internal pressure",
        "cavity temperature", "air temperature", "gas law", "volume change",
        "deflection", "footprint", "contact area", "vertical stiffness",
    ],
    "THERMAL": [
        "temperature distribution", "tread temperature", "carcass temperature",
        "surface temperature", "internal temperature", "heat generation",
        "heat transfer", "thermal conduct", "hysteresis", "cooling", "equilibrium",
    ],
    "CONSTRUCTION": [
        "bias ply", "bias-ply", "cross ply", "cross-ply", "bias belted",
        "bias-belted", "radial belted", "radial-belted", "cord angle", "carcass",
    ],
    "WEAR": [
        "tire wear", "tyre wear", "tread wear", "wear rate", "abrasion",
        "mass loss", "volume loss", "rubber loss", "slip energy", "frictional work",
    ],
    "FM": [
        "cornering stiffness", "cornering force", "lateral force", "slip angle",
        "relaxation length", "force-deflection", "spring rate", "load deflection",
    ],
    "METHODOLOGY": [
        "thermocouple", "pyrometer", "test procedure", "test apparatus",
        "instrumentation", "measured", "calibration", "figure", "table",
    ],
}


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact_excerpt(text: str, start: int, width: int = 380) -> str:
    left = max(0, start - width // 2)
    right = min(len(text), start + width // 2)
    value = re.sub(r"\s+", " ", text[left:right]).strip()
    return value


records = json.loads(MANIFEST.read_text(encoding="utf-8"))
inventory: list[dict] = []

for record in records:
    if record["retrievalStatus"] != "RETRIEVED":
        inventory.append({**record, "extractionStatus": "NOT_RETRIEVED"})
        continue

    pdf_path = CHECKPOINT / record["localPdf"]
    page_texts: list[str] = []
    page_hits: list[dict] = []
    total_hits: Counter[str] = Counter()
    extraction_error = None

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                text = clean_text(page.extract_text(x_tolerance=2, y_tolerance=3) or "")
                page_texts.append(text)
                lower = text.casefold()
                group_counts: dict[str, int] = {}
                excerpts: list[dict] = []
                for group, terms in KEYWORDS.items():
                    count = 0
                    for term in terms:
                        positions = [match.start() for match in re.finditer(re.escape(term), lower)]
                        count += len(positions)
                        if positions and len(excerpts) < 8:
                            excerpts.append({
                                "group": group,
                                "term": term,
                                "excerpt": compact_excerpt(text, positions[0]),
                            })
                    if count:
                        group_counts[group] = count
                        total_hits[group] += count
                if group_counts:
                    page_hits.append({
                        "page": page_number,
                        "score": sum(group_counts.values()),
                        "groups": group_counts,
                        "excerpts": excerpts,
                    })
    except Exception as exc:  # Preserve the failed state for recovery.
        extraction_error = f"{type(exc).__name__}: {exc}"

    joined = "\n\n\f\n\n".join(
        f"=== PDF PAGE {index} ===\n{text}" for index, text in enumerate(page_texts, start=1)
    )
    extract_path = EXTRACT_DIR / f"{record['sourceId']}.txt"
    extract_path.write_text(joined + "\n", encoding="utf-8")
    ranked_pages = sorted(page_hits, key=lambda item: (-item["score"], item["page"]))[:15]
    inventory.append({
        **record,
        "extractionStatus": "EXTRACTED" if not extraction_error else "EXTRACTION_ERROR",
        "extractionError": extraction_error,
        "pageCount": len(page_texts),
        "textCharacterCount": len(joined),
        "wordCountApprox": len(re.findall(r"\b\w+\b", joined)),
        "textSha256": hashlib.sha256(joined.encode("utf-8")).hexdigest(),
        "extractPath": f"fulltext_extracts/{record['sourceId']}.txt",
        "keywordHits": dict(sorted(total_hits.items())),
        "rankedRelevantPages": ranked_pages,
        "visualReviewRequired": len(joined) < 1000,
    })

(CHECKPOINT / "fulltext_extraction_inventory.json").write_text(
    json.dumps(inventory, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)

print(json.dumps({
    "attempted": len(records),
    "extracted": sum(item.get("extractionStatus") == "EXTRACTED" for item in inventory),
    "extractionErrors": sum(item.get("extractionStatus") == "EXTRACTION_ERROR" for item in inventory),
    "visualReviewRequired": sum(item.get("visualReviewRequired", False) for item in inventory),
    "totalPages": sum(item.get("pageCount", 0) for item in inventory),
    "totalWordsApprox": sum(item.get("wordCountApprox", 0) for item in inventory),
}, indent=2))
