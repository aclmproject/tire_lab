from __future__ import annotations

import json
import re
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
M3 = REPO / "research_staging" / "checkpoint_003_milestone3_archive_first"
M4 = REPO / "research_staging" / "checkpoint_004_milestone4_fulltext"
PACKETS = M4 / "review_packets"
PACKETS.mkdir(parents=True, exist_ok=True)

# Selected from the existing Layer E records only. The mix intentionally favors
# pressure/deflection, thermal, construction-comparison and wear/energy sources.
SELECTED_IDS = [
    "E-SRC-0074", "E-SRC-0075", "E-SRC-0078", "E-SRC-0079", "E-SRC-0084",
    "E-SRC-0085", "E-SRC-0089", "E-SRC-0090", "E-SRC-0091", "E-SRC-0094",
    "E-SRC-0095", "E-SRC-0096", "E-SRC-0098", "E-SRC-0100", "E-SRC-0109",
    "E-SRC-0113", "E-SRC-0114", "E-SRC-0116", "E-SRC-0118", "E-SRC-0122",
    "E-SRC-0124", "E-SRC-0125", "E-SRC-0130", "E-SRC-0131", "E-SRC-0076",
    "E-SRC-0081", "E-SRC-0105", "E-SRC-0108", "E-SRC-0123", "E-SRC-0128",
]

sources = {
    row["sourceId"]: row
    for row in (
        json.loads(line)
        for line in (M3 / "layer_e_source_reviews.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    )
}
inventory = {
    row["sourceId"]: row
    for row in json.loads((M4 / "fulltext_extraction_inventory.json").read_text(encoding="utf-8"))
}


def split_pages(text: str) -> list[str]:
    chunks = re.split(r"\n\n\f\n\n", text)
    pages = []
    for chunk in chunks:
        chunk = re.sub(r"^=== PDF PAGE \d+ ===\n", "", chunk).strip()
        pages.append(chunk)
    return pages


def page_excerpt(text: str, max_chars: int = 850) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + " […]"


def numeric_sentences(pages: list[str]) -> list[dict]:
    unit_re = re.compile(
        r"\b(?:psi|kpa|mpa|pa|bar|°c|deg(?:rees)? c|°f|mm|cm|inch(?:es)?|lb|lbf|kg|n/mm|mph|km/h|m/s|percent|%)\b",
        re.IGNORECASE,
    )
    relevance_re = re.compile(
        r"pressure|inflation|temperature|thermal|heat|deflection|stiffness|footprint|contact|wear|abras|hyster|bias|radial|slip|cornering|load",
        re.IGNORECASE,
    )
    found = []
    for page_no, page in enumerate(pages, start=1):
        for sentence in re.split(r"(?<=[.!?])\s+|\n", page):
            compact = re.sub(r"\s+", " ", sentence).strip()
            if 35 <= len(compact) <= 500 and unit_re.search(compact) and relevance_re.search(compact):
                found.append({"page": page_no, "text": compact})
    # Stable dedup, capped to avoid letting tables dominate a review packet.
    unique = []
    seen = set()
    for row in found:
        key = re.sub(r"\W+", "", row["text"].casefold())
        if key not in seen:
            seen.add(key)
            unique.append(row)
    return unique[:10]


queue = []
packet_rows = []
for rank, source_id in enumerate(SELECTED_IDS, start=1):
    source = sources[source_id]
    item = inventory[source_id]
    pages = split_pages((M4 / item["extractPath"]).read_text(encoding="utf-8"))
    ranked = [row["page"] for row in item.get("rankedRelevantPages", [])[:4]]
    summary_pages = [
        index for index, page in enumerate(pages, start=1)
        if re.search(r"\b(summary|conclusions?|results and discussion)\b", page, re.IGNORECASE)
    ]
    selected_pages = []
    for page_no in [1, *ranked, *summary_pages[-1:], len(pages)]:
        if 1 <= page_no <= len(pages) and page_no not in selected_pages and pages[page_no - 1].strip():
            selected_pages.append(page_no)

    priority = (
        "A_PRESSURE_DEFLECTION" if "PRESSURE" in source["topics"] else
        "B_THERMAL_NETWORK" if "THERMAL" in source["topics"] else
        "C_CONSTRUCTION" if "CONSTRUCTION" in source["topics"] else
        "D_WEAR_ENERGY" if "WEAR" in source["topics"] else
        "SUPPORTING_FM_WET"
    )
    queue.append({
        "queueRank": rank,
        "sourceId": source_id,
        "title": source["title"],
        "authors": source["authors"],
        "publicationYear": source["publicationYear"],
        "canonicalUrl": source["canonicalUrl"],
        "reportOrDoi": source.get("doi") or next(iter(source.get("identifiers", [])), None),
        "priority": priority,
        "topics": source["topics"],
        "pageCount": item["pageCount"],
        "reviewPacketPages": selected_pages,
        "selectionReason": "Existing Layer E record with retrievable public full text and direct relevance to pressure, thermal, construction, wear, F&M or wet-model questions.",
        "attemptStatus": "FULL_TEXT_RETRIEVED_PENDING_REVIEW",
    })
    packet_rows.append({
        "queue": queue[-1],
        "pages": [{"page": number, "text": page_excerpt(pages[number - 1])} for number in selected_pages],
        "numericSentences": numeric_sentences(pages),
    })

(M4 / "fulltext_priority_queue.json").write_text(
    json.dumps(queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)

for group_index in range(0, len(packet_rows), 5):
    group = packet_rows[group_index:group_index + 5]
    lines = [f"# Milestone 4 review packet {group_index // 5 + 1}", ""]
    for row in group:
        q = row["queue"]
        lines += [
            f"## {q['sourceId']} — {q['title']}",
            "",
            f"- Authors: {', '.join(q['authors']) if q['authors'] else 'not stated in Layer E metadata'}",
            f"- Year: {q['publicationYear']}",
            f"- Identifier: {q['reportOrDoi']}",
            f"- Canonical URL: {q['canonicalUrl']}",
            f"- Priority/topics: {q['priority']} / {', '.join(q['topics'])}",
            "",
        ]
        for page in row["pages"]:
            lines += [f"### PDF page {page['page']}", "", page["text"], ""]
        if row["numericSentences"]:
            lines += ["### Unit-bearing candidate sentences", ""]
            for sentence in row["numericSentences"]:
                lines.append(f"- p. {sentence['page']}: {sentence['text']}")
            lines.append("")
    (PACKETS / f"review_packet_{group_index // 5 + 1:02d}.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )

print(json.dumps({"selected": len(queue), "packets": len(list(PACKETS.glob('review_packet_*.md')))}, indent=2))
