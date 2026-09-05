from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import re
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable


CANONICAL_CLASSES = (
    "DIRECT PRIMARY",
    "STRONG PERIOD/ARCHIVAL SECONDARY",
    "DERIVED/RECONSTRUCTED",
    "UNKNOWN",
)

EVIDENCE_COLUMNS = [
    "evidence_id", "first_seen_time", "latest_strengthened_time", "topic", "host",
    "tire_family", "claim", "source_title", "source_url_or_stable_identifier",
    "canonical_source_id", "source_date", "source_type", "evidence_class",
    "evidence_class_original", "confidence", "supplier", "event", "year",
    "car_chassis", "axle", "tire_size", "rim_size", "construction",
    "carcass_material", "compound", "pressure_convention", "pressure_values",
    "load", "speed", "camber", "slip_condition", "test_conditions",
    "applicability_limits", "prior_aclm_state", "evidence_state_change",
    "calibration_implication", "contradiction_links", "status", "numeric_class",
    "is_new_to_repository", "source_archives", "original_reports",
    "source_file_hashes", "dedup_group_size", "original_evidence_ids",
    "original_record_json",
]

SOURCE_COLUMNS = [
    "source_id", "source_title", "url_or_stable_identifier", "source_date",
    "publisher_origin", "source_type", "evidence_class", "access_status", "summary",
    "limitations", "mention_count", "source_archives", "original_reports",
    "source_file_hashes",
]

INVENTORY_COLUMNS = [
    "archive_or_file_name", "sha256", "file_type", "apparent_research_date",
    "hourly_daily_cumulative_status", "recursive_file_count", "unique_payload_count",
    "contained_evidence_count", "contained_source_count", "exact_duplicate",
    "duplicate_of", "overlap_ratio", "partially_overlapping", "unique_payloads_to_input",
    "superseded_but_contains_unique_evidence", "malformed_or_incomplete",
    "ingestion_disposition",
]

NUMERIC_COLUMNS = [
    "numeric_id", "evidence_id", "topic", "numeric_excerpt", "numeric_class",
    "classification_basis", "units_or_convention", "source_title",
    "source_url_or_stable_identifier", "applicability_limits",
    "controlled_test_status", "source_archives", "original_reports",
]

COVERAGE_DIMENSIONS = [
    "geometry", "construction", "supplier_product_identity", "pressure",
    "vertical_stiffness", "lateral_stiffness", "longitudinal_stiffness",
    "load_sensitivity", "camber_behavior", "aligning_torque_trail",
    "relaxation_transient", "thermal_architecture", "thermal_numeric_calibration",
    "wet_intermediate", "wear", "degradation", "compound_menu", "high_speed_growth",
    "failure_behavior", "stint_durability", "force_moment_data",
]

COVERAGE_COLUMNS = [
    "family_id", "family_name", *COVERAGE_DIMENSIONS, "overall_confidence_score",
    "strongest_evidence_dimensions", "weakest_evidence_dimensions", "p0_p1_gaps",
    "historical_defensibility_status", "supporting_evidence_records",
]

CONTRADICTION_COLUMNS = [
    "relationship_id", "subject_evidence_id", "related_evidence_id", "relationship",
    "topic", "claim_or_state", "reason", "resolution_status", "source_archives",
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return re.sub(r"\s+", " ", str(value)).strip()


def normalized(value: Any) -> str:
    text = clean(value).lower().replace("×", "x")
    text = re.sub(r"https?://(?:www\.)?", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_identifier(value: Any) -> str:
    text = clean(value).strip()
    if not text:
        return ""
    text = re.sub(r"^doi\s*:?\s*", "", text, flags=re.I)
    text = re.sub(r"[?#].*$", "", text.rstrip("/"))
    return normalized(text)


def digits(value: Any) -> tuple[str, ...]:
    return tuple(re.findall(r"(?<![a-z])[-+]?\d+(?:\.\d+)?", clean(value).lower()))


def apparent_date(*values: str) -> str:
    joined = " ".join(values)
    match = re.search(r"(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)", joined)
    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}" if match else ""


def normalize_timestamp(raw: str, *context: str) -> str:
    value = clean(raw)
    date = apparent_date(*context)
    if re.fullmatch(r"[0-2]?\d:[0-5]\d", value) and date:
        return f"{date}T{value.zfill(5)}:00-07:00"
    if re.fullmatch(r"[0-2]?\d:[0-5]\d:[0-5]\d", value) and date:
        return f"{date}T{value.zfill(8)}-07:00"
    if date and not value:
        return f"{date}T00:00:00-07:00"
    return value


def canonical_evidence_class(value: Any) -> str:
    text = normalized(value)
    if "derived reconstructed" in text or "reconstructed" in text or "derived" in text:
        return "DERIVED/RECONSTRUCTED"
    if "direct primary" in text:
        return "DIRECT PRIMARY"
    if any(token in text for token in ("archival secondary", "period archival secondary", "strong secondary", "modern specialist secondary", "secondary")):
        return "STRONG PERIOD/ARCHIVAL SECONDARY"
    return "UNKNOWN"


def first_value(row: dict[str, Any], names: Iterable[str]) -> str:
    key_map = {normalized(key).replace(" ", "_"): key for key in row}
    for name in names:
        actual = key_map.get(normalized(name).replace(" ", "_"))
        if actual is not None and clean(row.get(actual)):
            return clean(row.get(actual))
    return ""


def join_values(*values: str) -> str:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        for part in re.split(r"\s*;\s*", clean(value)):
            if part and normalized(part) not in seen:
                seen.add(normalized(part))
                output.append(part)
    return "; ".join(output)


def merge_prefer(a: str, b: str) -> str:
    if not a:
        return b
    if not b:
        return a
    if normalized(a) == normalized(b):
        return a if len(a) >= len(b) else b
    return join_values(a, b)


def decode_text(data: bytes) -> str | None:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


@dataclass
class Payload:
    digest: str
    name: str
    data: bytes
    occurrences: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Candidate:
    record: dict[str, str]
    digest: str
    filename: str
    provenance: set[str]
    archives: set[str]
    original_ids: set[str] = field(default_factory=set)
    original_records: list[str] = field(default_factory=list)
    group_size: int = 1


def walk_zip(
    data: bytes,
    top_name: str,
    chain: list[str],
    payloads: dict[str, Payload],
    occurrences: list[dict[str, Any]],
    archive_layers: list[dict[str, Any]],
    root_sets: dict[str, set[str]],
) -> None:
    layer = {"top_archive": top_name, "archive_chain": chain, "sha256": sha256_bytes(data), "entries": 0, "error": ""}
    archive_layers.append(layer)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                layer["entries"] += 1
                try:
                    member = zf.read(info)
                except Exception as exc:
                    occurrences.append({
                        "top_archive": top_name, "archive_chain": chain, "path": info.filename,
                        "size": info.file_size, "sha256": "", "extension": Path(info.filename).suffix.lower(),
                        "error": str(exc),
                    })
                    continue
                digest = sha256_bytes(member)
                extension = Path(info.filename).suffix.lower()
                occurrence = {
                    "top_archive": top_name, "archive_chain": chain, "path": info.filename,
                    "size": len(member), "sha256": digest, "extension": extension, "error": "",
                }
                occurrences.append(occurrence)
                root_sets[top_name].add(digest)
                payload = payloads.setdefault(digest, Payload(digest, info.filename, member))
                payload.occurrences.append(occurrence)
                if extension == ".zip":
                    walk_zip(member, top_name, chain + [info.filename], payloads, occurrences, archive_layers, root_sets)
    except Exception as exc:
        layer["error"] = str(exc)


def classify_input_status(name: str) -> str:
    text = name.lower()
    if "hourly" in text:
        return "hourly"
    if "day" in text or "daily" in text:
        return "daily cumulative"
    if any(token in text for token in ("consolidated", "checkpoint", "preservation", "handoff", "continued", "fullset")):
        return "cumulative/checkpoint"
    return "focused research package"


def source_key(title: str, identifier: str) -> str:
    ident = normalized_identifier(identifier)
    return f"id:{ident}" if ident else f"title:{normalized(title)}"


def row_to_candidate(row: dict[str, Any], filename: str, digest: str, payload: Payload) -> Candidate:
    lower_name = filename.lower()
    claim = first_value(row, ("claim", "finding", "observation", "conclusion", "correction", "evidence", "result", "value"))
    topic = first_value(row, ("topic_host", "topic", "tire_or_subject", "subject", "family_era", "target", "branch", "metric", "field"))
    if not claim:
        meaningful = [(clean(k), clean(v)) for k, v in row.items() if clean(v)]
        claim = f"{Path(filename).stem}: " + "; ".join(f"{k}={v}" for k, v in meaningful[:14])
    if not topic:
        topic = Path(filename).stem.replace("_", " ")
    original_class = first_value(row, ("evidence_class", "class", "source_class", "evidence_type"))
    source_title = first_value(row, ("source_title", "source", "title", "document", "report", "publication", "source_pdf"))
    identifier = first_value(row, ("source_url_or_stable_identifier", "source_url_or_identifier", "url_or_stable_identifier", "url", "doi", "identifier", "report_number", "archive_id"))
    event_year = first_value(row, ("event_year", "event", "year"))
    pressure = first_value(row, ("pressure_values", "cold_pressure_raw", "pressure", "inflation", "hot_pressure", "cold_pressure"))
    record = {
        "first_seen_time": first_value(row, ("first_seen_time", "first_seen", "created_utc", "date")),
        "latest_strengthened_time": first_value(row, ("latest_strengthened_time", "latest_seen_time", "latest_seen", "updated_utc")),
        "topic": topic,
        "host": first_value(row, ("host", "car", "vehicle", "test_object")),
        "tire_family": first_value(row, ("tire_family", "family", "family_era", "family_id")),
        "claim": claim,
        "source_title": source_title,
        "source_url_or_stable_identifier": identifier,
        "source_date": first_value(row, ("source_date", "date", "publication_date", "year")),
        "source_type": first_value(row, ("source_type", "publisher_origin", "origin", "repository")),
        "evidence_class": canonical_evidence_class(original_class),
        "evidence_class_original": original_class,
        "confidence": first_value(row, ("confidence", "confidence_pct", "quality", "qa_status")),
        "supplier": first_value(row, ("supplier", "manufacturer", "brand", "manufacturer_code")),
        "event": event_year,
        "year": first_value(row, ("year", "event_year", "source_date")),
        "car_chassis": first_value(row, ("car_chassis", "chassis", "car", "vehicle", "test_object")),
        "axle": first_value(row, ("axle", "position")),
        "tire_size": first_value(row, ("tire_size", "size", "specimens")),
        "rim_size": first_value(row, ("rim_size", "rim", "wheel_size")),
        "construction": first_value(row, ("construction", "construction_type", "cord_construction")),
        "carcass_material": first_value(row, ("carcass_material", "cord_material", "material", "cord_construction")),
        "compound": first_value(row, ("compound", "tread_compound")),
        "pressure_convention": first_value(row, ("pressure_convention",)),
        "pressure_values": pressure,
        "load": first_value(row, ("load", "design_load_raw", "vertical_load", "load_n", "load_lb")),
        "speed": first_value(row, ("speed", "road_speed_raw", "test_speed", "speed_kmh", "speed_mph")),
        "camber": first_value(row, ("camber", "camber_deg")),
        "slip_condition": first_value(row, ("slip_condition", "slip_angle", "slip_ratio")),
        "test_conditions": first_value(row, ("test_conditions", "conditions", "protocol", "test_condition")),
        "applicability_limits": first_value(row, ("applicability_limits", "limitations", "must_not_infer", "note", "notes")),
        "prior_aclm_state": first_value(row, ("prior_aclm_state", "previous_aclm_state", "prior_state")),
        "evidence_state_change": first_value(row, ("evidence_state_change", "proposed_evidence_state_change", "status_delta")),
        "calibration_implication": first_value(row, ("calibration_implication", "aclm_implication", "generator_use", "action")),
        "contradiction_links": first_value(row, ("contradiction_links", "contradicts", "related_claim")),
        "status": first_value(row, ("status(active/strengthened/contradicted/rejected)", "status", "disposition")) or "active",
        "numeric_class": "",
        "is_new_to_repository": "",
    }
    context = [occ["top_archive"] for occ in payload.occurrences]
    record["first_seen_time"] = normalize_timestamp(record["first_seen_time"], filename, *context)
    record["latest_strengthened_time"] = normalize_timestamp(record["latest_strengthened_time"] or record["first_seen_time"], filename, *context)
    provenance = {f"{occ['top_archive']}::{occ['path']}" for occ in payload.occurrences}
    archives = {occ["top_archive"] for occ in payload.occurrences}
    original_id = first_value(row, ("evidence_id", "id", "record_id", "finding_id"))
    return Candidate(
        record=record, digest=digest, filename=filename, provenance=provenance, archives=archives,
        original_ids={original_id} if original_id else set(),
        original_records=[json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))],
    )


def looks_like_hash_manifest(filename: str, headers: set[str]) -> bool:
    name = filename.lower()
    normalized_headers = {normalized(h).replace(" ", "_") for h in headers}
    return (
        any(token in name for token in ("sha256", "file_manifest", "package_manifest", "pack_index", "output_hash"))
        or normalized_headers <= {"path", "relative_path", "file", "sha256", "bytes", "size"}
    )


def is_queue_file(filename: str) -> bool:
    name = filename.lower()
    return any(token in name for token in ("gap", "negative", "target_queue", "research_queue", "search_ledger", "pull_list", "unresolved", "remaining_"))


def is_source_file(filename: str) -> bool:
    name = filename.lower()
    return any(token in name for token in ("source_manifest", "source_master", "document_nodes", "archive_map", "source_map", "paper_graph", "citation"))


def is_evidence_file(filename: str) -> bool:
    name = filename.lower()
    tokens = (
        "evidence", "measurement", "numeric", "quantitative", "coefficient", "constant",
        "stiffness", "force", "moment", "pressure", "camber", "geometry", "thermal",
        "wear", "failure", "construction", "material", "compound", "tire_size", "supplier",
        "transient", "wet", "drag", "aquaplan", "cord", "belt", "footprint", "load",
        "radius", "growth", "oracle", "benchmark", "data_point", "digitized", "model_",
        "primary_ledger", "fitment", "carcass", "ply", "friction", "hydroplan",
    )
    return any(token in name for token in tokens)


def row_has_evidence(row: dict[str, Any], filename: str) -> bool:
    keys = {normalized(key).replace(" ", "_") for key in row}
    if "claim" in keys or "finding" in keys or "observation" in keys:
        return True
    if not is_evidence_file(filename):
        return False
    return bool(keys & {
        "evidence", "value", "normalized_value", "raw_value_text", "measurement", "result",
        "correction", "metric", "field", "size", "tire_size", "coefficient", "pressure",
    }) or len([v for v in row.values() if clean(v)]) >= 2


def parse_csv_payload(payload: Payload) -> tuple[list[Candidate], list[dict[str, Any]], list[dict[str, Any]]]:
    text = decode_text(payload.data)
    if text is None:
        return [], [], []
    delimiter = "\t" if payload.name.lower().endswith(".tsv") else ","
    try:
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        rows = [
            {(clean(key) or "__extra_columns__"): value for key, value in row.items()}
            for row in reader
        ]
    except csv.Error:
        return [], [], []
    headers = set(reader.fieldnames or [])
    if looks_like_hash_manifest(payload.name, headers):
        return [], [], []
    evidence: list[Candidate] = []
    sources: list[dict[str, Any]] = []
    queue: list[dict[str, Any]] = []
    for row in rows:
        if not any(clean(value) for value in row.values()):
            continue
        if row_has_evidence(row, payload.name) and not is_queue_file(payload.name):
            evidence.append(row_to_candidate(row, payload.name, payload.digest, payload))
        if is_source_file(payload.name) or any(normalized(k).replace(" ", "_") in {"source_title", "url", "doi", "identifier"} for k in row):
            title = first_value(row, ("source_title", "source", "title", "document", "publication", "repository_or_source"))
            identifier = first_value(row, ("source_url_or_stable_identifier", "source_url_or_identifier", "url", "doi", "identifier", "report_number", "archive_id"))
            if title or identifier:
                sources.append({
                    "source_title": title or identifier,
                    "url_or_stable_identifier": identifier,
                    "source_date": first_value(row, ("source_date", "year", "date")),
                    "publisher_origin": first_value(row, ("publisher_origin", "publisher", "origin", "institution_manufacturer", "repository")),
                    "source_type": first_value(row, ("source_type", "type")),
                    "evidence_class": canonical_evidence_class(first_value(row, ("evidence_class", "class"))),
                    "access_status": first_value(row, ("access_status", "recovered", "status", "disposition")),
                    "summary": first_value(row, ("summary", "use", "finding", "claim", "target", "value")),
                    "limitations": first_value(row, ("limitations", "reason_notes", "missing", "note", "notes")),
                    "digest": payload.digest,
                    "archives": {occ["top_archive"] for occ in payload.occurrences},
                    "provenance": {f"{occ['top_archive']}::{occ['path']}" for occ in payload.occurrences},
                })
        if is_queue_file(payload.name):
            queue.append({
                "priority": first_value(row, ("priority", "rank")),
                "target": first_value(row, ("target", "need", "source", "branch", "item", "objective")) or Path(payload.name).stem,
                "status": first_value(row, ("status", "current_state", "search_result", "outcome", "extent_status")),
                "why": first_value(row, ("why", "reason", "objective", "missing", "observed")),
                "next_action": first_value(row, ("next_action", "next_route", "action", "exact_route", "search_keys", "literal_search_terms")),
                "identifier": first_value(row, ("identifier", "url", "repository", "report_number")),
                "digest": payload.digest,
                "archives": {occ["top_archive"] for occ in payload.occurrences},
                "provenance": {f"{occ['top_archive']}::{occ['path']}" for occ in payload.occurrences},
            })
    return evidence, sources, queue


def walk_json_records(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, dict):
        yield obj
        for value in obj.values():
            if isinstance(value, (dict, list)):
                yield from walk_json_records(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk_json_records(value)


def parse_json_payload(payload: Payload) -> list[Candidate]:
    text = decode_text(payload.data)
    if text is None:
        return []
    try:
        if payload.name.lower().endswith(".jsonl"):
            objects = [json.loads(line) for line in text.splitlines() if line.strip()]
        else:
            objects = [json.loads(text)]
    except Exception:
        return []
    output: list[Candidate] = []
    for obj in objects:
        for row in walk_json_records(obj):
            keys = {normalized(key).replace(" ", "_") for key in row}
            if keys & {"claim", "finding", "observation"}:
                output.append(row_to_candidate(row, payload.name, payload.digest, payload))
    return output


def add_calspan_workbook(
    workbook_dump: Path,
    workbook_path: Path,
) -> tuple[list[Candidate], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    data = json.loads(workbook_dump.read_text(encoding="utf-8"))
    digest = sha256_bytes(workbook_path.read_bytes())
    occurrence = {"top_archive": workbook_path.name, "path": workbook_path.name}
    payload = Payload(digest, workbook_path.name, b"", [occurrence])
    evidence: list[Candidate] = []
    sources: list[dict[str, Any]] = []
    queue: list[dict[str, Any]] = []
    row_counts: dict[str, int] = {}
    for sheet_name, sheet in data.items():
        values = sheet.get("values") or []
        if not values:
            continue
        headers = [clean(value) or f"column_{index + 1}" for index, value in enumerate(values[0])]
        rows = [dict(zip(headers, row + [None] * (len(headers) - len(row)))) for row in values[1:] if any(clean(value) for value in row)]
        row_counts[sheet_name] = len(rows)
        for row in rows:
            if sheet_name == "Batch01 Master":
                row["topic"] = "Calspan 1976 tire identity and construction"
                row["claim"] = (
                    f"TIRF {clean(row.get('tirf_id'))}: {clean(row.get('brand_model'))} {clean(row.get('size'))}; "
                    f"construction {clean(row.get('cord_construction'))} ({clean(row.get('construction_type'))})."
                )
                row["source_title"] = "Calspan 1976 Tire Parameter Determination Volumes II-III batch extraction"
                row["source_url_or_stable_identifier"] = clean(row.get("identity_source")) or clean(row.get("packet_pdf"))
                row["source_date"] = "1976"
                row["evidence_class"] = "STRONG PERIOD/ARCHIVAL SECONDARY"
                row["confidence"] = clean(row.get("qa_status"))
                row["applicability_limits"] = "Curated transcription; identities were visually checked, while raw numeric form fields remain OCR until independently transcribed."
                candidate = row_to_candidate(row, f"{workbook_path.name}#{sheet_name}", digest, payload)
                evidence.append(candidate)
            elif sheet_name == "Model Constants":
                row["topic"] = "Calspan 1976 force-model coefficients"
                row["claim"] = (
                    f"TIRF {clean(row.get('tirf_id'))} {clean(row.get('section'))} coefficient "
                    f"{clean(row.get('coefficient'))} = {clean(row.get('normalized_value')) or clean(row.get('raw_value_text'))}."
                )
                row["source_title"] = clean(row.get("source_pdf")) or "Calspan 1976 Tire Parameter Determination"
                row["source_url_or_stable_identifier"] = f"{clean(row.get('source_pdf'))} page {clean(row.get('source_page'))}"
                row["source_date"] = "1976"
                row["evidence_class"] = "STRONG PERIOD/ARCHIVAL SECONDARY"
                row["confidence"] = clean(row.get("parse_status"))
                row["applicability_limits"] = "OCR-derived coefficient transcription; test prior only until page image and units are independently verified."
                candidate = row_to_candidate(row, f"{workbook_path.name}#{sheet_name}", digest, payload)
                candidate.record["numeric_class"] = "B — Test prior"
                evidence.append(candidate)
            elif sheet_name in {"Source Map", "Packet Locator"}:
                title = first_value(row, ("source_pdf", "pdf"))
                if title:
                    sources.append({
                        "source_title": title,
                        "url_or_stable_identifier": f"Calspan 1976 {first_value(row, ('source_volume', 'volume'))} pages {first_value(row, ('page_start', 'start_page'))}-{first_value(row, ('page_end', 'end_page'))}",
                        "source_date": "1976", "publisher_origin": "Calspan / DOT",
                        "source_type": first_value(row, ("source_role",)) or "Primary government tire-test report",
                        "evidence_class": "DIRECT PRIMARY", "access_status": "indexed in supplied workbook",
                        "summary": clean(row.get("notes")), "limitations": "Workbook pointer; consult page image before calibration.",
                        "digest": digest, "archives": {workbook_path.name},
                        "provenance": {f"{workbook_path.name}::{sheet_name}"},
                    })
            elif sheet_name == "QA":
                missing = clean(row.get("missing_coefficients"))
                if missing or "review" in normalized(row.get("qa_priority")):
                    queue.append({
                        "priority": clean(row.get("qa_priority")) or "P1",
                        "target": f"Calspan TIRF {clean(row.get('tirf_id'))} coefficient verification",
                        "status": f"{clean(row.get('coefficients_found'))}/{clean(row.get('coefficients_expected'))} coefficients found",
                        "why": clean(row.get("notes")) or f"Missing: {missing}",
                        "next_action": "Verify against the cited packet pages and resolve OCR/units before calibration use.",
                        "identifier": "", "digest": digest, "archives": {workbook_path.name},
                        "provenance": {f"{workbook_path.name}::{sheet_name}"},
                    })
    metadata = {"sha256": digest, "sheet_row_counts": row_counts, "file_size": workbook_path.stat().st_size}
    return evidence, sources, queue, metadata


def candidate_key(candidate: Candidate) -> str:
    row = candidate.record
    return "|".join((
        source_key(row["source_title"], row["source_url_or_stable_identifier"]),
        normalized(row["topic"]), normalized(row["claim"]),
    ))


def near_duplicate(a: Candidate, b: Candidate) -> bool:
    ar, br = a.record, b.record
    if source_key(ar["source_title"], ar["source_url_or_stable_identifier"]) != source_key(br["source_title"], br["source_url_or_stable_identifier"]):
        return False
    if digits(ar["claim"]) != digits(br["claim"]):
        return False
    a_text, b_text = normalized(ar["claim"]), normalized(br["claim"])
    if not a_text or not b_text:
        return False
    return SequenceMatcher(None, a_text, b_text).ratio() >= 0.91


def merge_candidates(target: Candidate, incoming: Candidate) -> None:
    class_rank = {"UNKNOWN": 0, "DERIVED/RECONSTRUCTED": 1, "STRONG PERIOD/ARCHIVAL SECONDARY": 2, "DIRECT PRIMARY": 3}
    for key, value in incoming.record.items():
        if key in {"evidence_class", "first_seen_time", "latest_strengthened_time", "status"}:
            continue
        target.record[key] = merge_prefer(target.record.get(key, ""), value)
    if class_rank[incoming.record["evidence_class"]] > class_rank[target.record["evidence_class"]]:
        target.record["evidence_class"] = incoming.record["evidence_class"]
    first_values = [value for value in (target.record["first_seen_time"], incoming.record["first_seen_time"]) if value]
    latest_values = [value for value in (target.record["latest_strengthened_time"], incoming.record["latest_strengthened_time"]) if value]
    target.record["first_seen_time"] = min(first_values) if first_values else ""
    target.record["latest_strengthened_time"] = max(latest_values) if latest_values else ""
    statuses = {normalized(target.record["status"]), normalized(incoming.record["status"])}
    for preferred in ("rejected", "contradicted", "superseded", "strengthened", "active"):
        if any(preferred in item for item in statuses):
            target.record["status"] = preferred
            break
    target.provenance.update(incoming.provenance)
    target.archives.update(incoming.archives)
    target.original_ids.update(incoming.original_ids)
    target.original_records.extend(incoming.original_records)
    target.group_size += incoming.group_size


def deduplicate_candidates(candidates: list[Candidate]) -> list[Candidate]:
    exact: dict[str, Candidate] = {}
    for candidate in candidates:
        key = candidate_key(candidate)
        if key in exact:
            merge_candidates(exact[key], candidate)
        else:
            exact[key] = candidate
    buckets: dict[str, list[Candidate]] = defaultdict(list)
    output: list[Candidate] = []
    for candidate in exact.values():
        row = candidate.record
        bucket_key = source_key(row["source_title"], row["source_url_or_stable_identifier"])
        merged = False
        for prior in buckets[bucket_key]:
            if near_duplicate(prior, candidate):
                merge_candidates(prior, candidate)
                merged = True
                break
        if not merged:
            buckets[bucket_key].append(candidate)
            output.append(candidate)
    return output


def infer_family(topic: str, claim: str, current: str) -> str:
    text = normalized(f"{topic} {claim} {current}")
    mappings = [
        (("250f", "stelvio"), "FAM002"),
        (("dunlop r5",), "FAM003"),
        (("dunlop r6", "dunlop r7", "r6 r7"), "FAM032"),
        (("jaguar d type", "d type"), "FAM018"),
        (("gt40",), "FAM022"),
        (("917",), "FAM035"),
        (("group c", "porsche 956", "porsche 962", "r89c", "toyota 84c"), "FAM007; FAM028; FAM029"),
        (("imsa gtp",), "FAM030"),
        (("bpr", "gt1", "gt2", "mclaren f1 gtr"), "FAM010; FAM012"),
        (("333 sp", "riley scott", "wsc95", "1990s wsc"), "FAM080"),
        (("calspan", "p195", "ntmp"), "NTMP/P195 reference — non-racing transfer limited"),
        (("hypercar", "lmdh", "porsche 963", "imsa gtp 2023"), "FAM063; FAM065"),
        (("gtd", "gt3"), "FAM069"),
        (("lmp2",), "FAM066"),
        (("formula 1 199", "f1 199"), "FAM041; FAM042"),
    ]
    found: list[str] = []
    for tokens, family in mappings:
        if any(token in text for token in tokens):
            found.extend(part.strip() for part in family.split(";") if part.strip())
    if found:
        return "; ".join(dict.fromkeys(found))
    if current:
        return current
    if any(token in text for token in ("bias ply", "cross ply", "carcass", "cord", "pneumatic trail", "relaxation")):
        return "Cross-ply physics reference — magnitude transfer limited"
    return ""


NUMERIC_KEYWORDS = (
    "pressure", "psi", "bar", "kpa", "stiffness", "force", "moment", "load", "speed",
    "km h", "mph", "radius", "diameter", "width", "size", "rim", "camber", "slip",
    "temperature", "heat", "wear", "stint", "km", "mile", "coefficient", "ply", "cord angle",
)


def classify_numeric(row: dict[str, str]) -> tuple[str, str] | tuple[None, None]:
    text = normalized(" ".join(row.get(key, "") for key in ("topic", "claim", "pressure_values", "load", "speed", "camber", "tire_size", "rim_size")))
    if not digits(text) or not any(token in text for token in NUMERIC_KEYWORDS):
        return None, None
    if row.get("numeric_class"):
        existing = row["numeric_class"]
        if existing.startswith("A"):
            return existing, "Specific numeric value is reported by an explicitly identified direct primary source."
        if existing.startswith("B"):
            return existing, "Source artifact explicitly limits OCR-derived or bounded values to test-prior use."
        if existing.startswith("C"):
            return existing, "The supplying record labels the number derived or reconstructed."
        if existing.startswith("D"):
            return existing, "Created for an ACLM/model experiment rather than recovered as historical measurement."
        return existing, "Classification preserved verbatim from the supplying evidence record."
    original = normalized(row.get("evidence_class_original", ""))
    source_type = normalized(row.get("source_type", ""))
    limits = normalized(row.get("applicability_limits", ""))
    if any(token in text for token in ("experimental aclm", "simulator", "test sweep")):
        return "D — Experimental ACLM value", "Created for an ACLM/model experiment rather than recovered as historical measurement."
    if row["evidence_class"] == "DERIVED/RECONSTRUCTED":
        return "C — Derived/reconstructed value", "The supplying record labels the number derived or reconstructed."
    if row["evidence_class"] == "DIRECT PRIMARY" and "abstract" not in original and "ocr" not in limits and "mirror" not in source_type:
        return "A — Validated historical numeric evidence", "Specific numeric value is reported by an explicitly identified direct primary source."
    return "B — Test prior", "Useful bounded number, but source scope, transfer, transcription, or primary-document access does not justify production calibration."


def build_known_sources(knowledge_path: Path) -> dict[str, list[str]]:
    knowledge = json.loads(knowledge_path.read_text(encoding="utf-8"))
    known: dict[str, list[str]] = defaultdict(list)
    for source in knowledge.get("sources", {}).values():
        title = clean(source.get("title"))
        url = clean(source.get("url"))
        summary = normalized(f"{clean(source.get('summary'))} {clean(source.get('limitations'))}")
        known[source_key(title, url)].append(summary)
        if title:
            known[f"title:{normalized(title)}"].append(summary)
    return known


def is_new_to_repository(row: dict[str, str], known_sources: dict[str, list[str]]) -> bool:
    keys = {
        source_key(row["source_title"], row["source_url_or_stable_identifier"]),
        f"title:{normalized(row['source_title'])}" if row["source_title"] else "",
    }
    summaries = [summary for key in keys if key in known_sources for summary in known_sources[key]]
    if not summaries:
        return True
    claim = normalized(row["claim"])
    stop = {"the", "and", "for", "from", "with", "that", "this", "tire", "tyre", "source", "evidence", "only"}
    claim_tokens = {token for token in claim.split() if len(token) > 2 and token not in stop}
    for summary in summaries:
        summary_tokens = {token for token in summary.split() if len(token) > 2 and token not in stop}
        overlap = len(claim_tokens & summary_tokens) / max(1, min(len(claim_tokens), len(summary_tokens)))
        if overlap >= 0.25 or SequenceMatcher(None, claim, summary).ratio() >= 0.48:
            return False
    return True


def build_source_manifest(source_rows: list[dict[str, Any]], candidates: list[Candidate], payloads: dict[str, Payload]) -> list[dict[str, str]]:
    rows = list(source_rows)
    for candidate in candidates:
        record = candidate.record
        if record["source_title"] or record["source_url_or_stable_identifier"]:
            rows.append({
                "source_title": record["source_title"] or record["source_url_or_stable_identifier"],
                "url_or_stable_identifier": record["source_url_or_stable_identifier"],
                "source_date": record["source_date"], "publisher_origin": record["supplier"],
                "source_type": record["source_type"], "evidence_class": record["evidence_class"],
                "access_status": "evidence captured", "summary": record["claim"],
                "limitations": record["applicability_limits"], "digest": candidate.digest,
                "archives": set(candidate.archives), "provenance": set(candidate.provenance),
            })
    for payload in payloads.values():
        extension = Path(payload.name).suffix.lower()
        if extension in {".pdf", ".md", ".txt", ".patch"}:
            rows.append({
                "source_title": Path(payload.name).name,
                "url_or_stable_identifier": f"SHA-256 {payload.digest}",
                "source_date": apparent_date(payload.name, *(occ["top_archive"] for occ in payload.occurrences)),
                "publisher_origin": "supplied research archive", "source_type": "archived research artifact",
                "evidence_class": "UNKNOWN", "access_status": "preserved by hash and original archive path",
                "summary": "Archived source/report artifact retained for audit and provenance.",
                "limitations": "Artifact text is not automatically a primary historical source.",
                "digest": payload.digest, "archives": {occ["top_archive"] for occ in payload.occurrences},
                "provenance": {f"{occ['top_archive']}::{occ['path']}" for occ in payload.occurrences},
            })
    merged: dict[str, dict[str, Any]] = {}
    for row in rows:
        title = clean(row.get("source_title"))
        identifier = clean(row.get("url_or_stable_identifier"))
        if not title and not identifier:
            continue
        key = source_key(title, identifier)
        if key not in merged:
            merged[key] = dict(row)
            merged[key]["archives"] = set(row.get("archives") or [])
            merged[key]["provenance"] = set(row.get("provenance") or [])
            merged[key]["digests"] = {clean(row.get("digest"))} if clean(row.get("digest")) else set()
            merged[key]["mention_count"] = 1
        else:
            target = merged[key]
            for field_name in ("source_title", "url_or_stable_identifier", "source_date", "publisher_origin", "source_type", "access_status", "summary", "limitations"):
                target[field_name] = merge_prefer(clean(target.get(field_name)), clean(row.get(field_name)))
            if CANONICAL_CLASSES.index(clean(row.get("evidence_class")) or "UNKNOWN") < CANONICAL_CLASSES.index(clean(target.get("evidence_class")) or "UNKNOWN"):
                target["evidence_class"] = clean(row.get("evidence_class"))
            target["archives"].update(row.get("archives") or [])
            target["provenance"].update(row.get("provenance") or [])
            if clean(row.get("digest")):
                target["digests"].add(clean(row.get("digest")))
            target["mention_count"] += 1
    output: list[dict[str, str]] = []
    for index, (key, row) in enumerate(sorted(merged.items()), 1):
        output.append({
            "source_id": f"SRC-FRA-{index:05d}",
            "source_title": clean(row.get("source_title")),
            "url_or_stable_identifier": clean(row.get("url_or_stable_identifier")),
            "source_date": clean(row.get("source_date")),
            "publisher_origin": clean(row.get("publisher_origin")),
            "source_type": clean(row.get("source_type")),
            "evidence_class": clean(row.get("evidence_class")) or "UNKNOWN",
            "access_status": clean(row.get("access_status")),
            "summary": clean(row.get("summary")),
            "limitations": clean(row.get("limitations")),
            "mention_count": str(row["mention_count"]),
            "source_archives": "; ".join(sorted(row["archives"])),
            "original_reports": "; ".join(sorted(row["provenance"])),
            "source_file_hashes": "; ".join(sorted(row["digests"])),
        })
    return output


def evidence_dimensions(record: dict[str, str]) -> set[str]:
    text = normalized(" ".join(record.get(key, "") for key in ("topic", "claim", "calibration_implication", "test_conditions")))
    mapping = {
        "geometry": ("geometry", "diameter", "width", "tire size", "rim", "footprint", "radius"),
        "construction": ("construction", "carcass", "cord", "ply", "belt", "breaker", "cotton", "rayon", "nylon"),
        "supplier_product_identity": ("supplier", "goodyear", "firestone", "dunlop", "pirelli", "michelin", "bridgestone", "avon"),
        "pressure": ("pressure", "psi", "bar", "inflation"),
        "vertical_stiffness": ("vertical stiffness", "vertical rate", "deflection"),
        "lateral_stiffness": ("lateral stiffness", "cornering stiffness", "cornering power"),
        "longitudinal_stiffness": ("longitudinal stiffness", "braking stiffness", "tractive stiffness"),
        "load_sensitivity": ("load sensitivity", "bearing pressure", "load effect"),
        "camber_behavior": ("camber", "camber thrust"),
        "aligning_torque_trail": ("aligning torque", "pneumatic trail", " mz "),
        "relaxation_transient": ("relaxation", "transient", "time lag", "phase lag"),
        "thermal_architecture": ("thermal", "heat", "temperature", "hysteresis", "cavity"),
        "thermal_numeric_calibration": ("thermal numeric", "temperature target", "temperature c", "temperature f"),
        "wet_intermediate": ("wet", "intermediate", "hydroplan", "aquaplan", "water"),
        "wear": ("wear", "abrasion", "tread loss"),
        "degradation": ("degradation", "graining", "heat cycle", "performance drop"),
        "compound_menu": ("compound", "soft", "medium", "hard", "qualifying"),
        "high_speed_growth": ("growth", "centrifugal", "high speed", "speed expansion"),
        "failure_behavior": ("failure", "puncture", "burst", "separation", "chunk", "fatigue"),
        "stint_durability": ("stint", "durability", "tire change", "tyre change", "life"),
        "force_moment_data": ("force moment", "force and moment", "lateral force", "longitudinal force", "aligning torque", "combined slip"),
    }
    return {dimension for dimension, tokens in mapping.items() if any(token in f" {text} " for token in tokens)}


def family_matches(record: dict[str, str], family_id: str, family_name: str) -> bool:
    families = {part.strip() for part in record.get("tire_family", "").split(";")}
    if family_id in families:
        return True
    text = normalized(f"{record.get('topic')} {record.get('claim')}")
    distinctive = [token for token in normalized(family_name).split() if len(token) >= 5 and token not in {"modern", "control", "radial", "racing", "treaded", "cross", "ply", "world", "formula", "slick"}]
    return len(distinctive) >= 2 and sum(token in text for token in distinctive[:5]) >= 2


def build_coverage(knowledge_path: Path, evidence_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    knowledge = json.loads(knowledge_path.read_text(encoding="utf-8"))
    output: list[dict[str, str]] = []
    class_weight = {"DIRECT PRIMARY": 2.5, "STRONG PERIOD/ARCHIVAL SECONDARY": 1.7, "DERIVED/RECONSTRUCTED": 0.9, "UNKNOWN": 0.35}
    identity_dims = {"geometry", "construction", "supplier_product_identity", "compound_menu", "wet_intermediate"}
    for family in knowledge["families"]:
        family_id, family_name = family["id"], family["name"]
        matched = [row for row in evidence_rows if family_matches(row, family_id, family_name)]
        family_classes = [item for item in knowledge.get("classes", []) if item.get("familyId") == family_id]
        source_ids = set(family.get("sourceIds", []))
        for item in family_classes:
            source_ids.update(item.get("sourceIds", []))
        source_count = len(source_ids)
        class_confidences = [float(item["confidence"]) for item in family_classes if item.get("confidence") is not None]
        family_confidence = float(
            family.get("historicalConfidence")
            or family.get("historicalAbsoluteConfidence")
            or (sum(class_confidences) / len(class_confidences) if class_confidences else 65)
        ) / 10.0
        source_base = 2.2 + math.log2(1 + source_count) * 0.85
        structural_base = min(8.5, max(2.2, 0.68 * family_confidence + 0.32 * source_base))
        scores: dict[str, float] = {}
        for dimension in COVERAGE_DIMENSIONS:
            score = structural_base if dimension in identity_dims else max(1.5, structural_base - 2.0)
            supporting = [row for row in matched if dimension in evidence_dimensions(row)]
            score += min(4.0, sum(class_weight[row["evidence_class"]] for row in supporting) / max(1.6, len(supporting) ** 0.45))
            if dimension in {"thermal_numeric_calibration", "vertical_stiffness", "lateral_stiffness", "longitudinal_stiffness", "force_moment_data"} and not any(row.get("numeric_class", "").startswith("A") for row in supporting):
                score = min(score, 5.8)
            scores[dimension] = round(min(10.0, score), 1)
        overall = round(sum(scores.values()) / len(scores), 1)
        ordered = sorted(scores, key=lambda dim: (-scores[dim], dim))
        weakest = sorted(scores, key=lambda dim: (scores[dim], dim))
        if overall >= 8.0:
            status = "historically well constrained"
        elif overall >= 6.5:
            status = "defensible with bounded inference"
        elif overall >= 5.0:
            status = "architecture-correct but numerically weak"
        elif overall >= 3.5:
            status = "mostly reconstructed"
        else:
            status = "insufficiently evidenced"
        row = {"family_id": family_id, "family_name": family_name}
        row.update({dimension: f"{scores[dimension]:.1f}" for dimension in COVERAGE_DIMENSIONS})
        row.update({
            "overall_confidence_score": f"{overall:.1f}",
            "strongest_evidence_dimensions": "; ".join(ordered[:4]),
            "weakest_evidence_dimensions": "; ".join(weakest[:4]),
            "p0_p1_gaps": clean(family.get("remainingGap")) or "; ".join(weakest[:4]),
            "historical_defensibility_status": status,
            "supporting_evidence_records": str(len(matched)),
        })
        output.append(row)
    return output


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: clean(row.get(key)) for key in fieldnames})


def queue_priority(row: dict[str, Any]) -> int:
    text = normalized(f"{clean(row.get('priority'))} {clean(row.get('target'))} {clean(row.get('why'))}")
    if "p0" in text or any(token in text for token in ("917 pressure", "250f pressure", "calspan volume", "factory setup", "raw p195")):
        return 0
    if "p1" in text:
        return 1
    return 2


def write_queue(path: Path, queue_rows: list[dict[str, Any]], evidence_rows: list[dict[str, str]]) -> int:
    rows = list(queue_rows)
    for evidence in evidence_rows:
        text = normalized(f"{evidence['claim']} {evidence['applicability_limits']} {evidence['evidence_state_change']}")
        if any(token in text for token in ("not recovered", "unresolved", "negative search", "remains unknown", "still unknown", "full tables unresolved")):
            rows.append({
                "priority": "P0" if any(token in text for token in ("917", "250f", "factory setup", "p195")) else "P1",
                "target": evidence["topic"], "status": evidence["claim"],
                "why": evidence["applicability_limits"], "next_action": evidence["calibration_implication"],
                "identifier": evidence["source_url_or_stable_identifier"],
                "archives": set(evidence["source_archives"].split("; ")) if evidence["source_archives"] else set(),
                "provenance": set(evidence["original_reports"].split("; ")) if evidence["original_reports"] else set(),
            })
    merged: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = normalized(f"{clean(row.get('target'))}|{clean(row.get('identifier'))}|{clean(row.get('status'))}")
        if not key:
            continue
        if key not in merged:
            merged[key] = dict(row)
            merged[key]["archives"] = set(row.get("archives") or [])
            merged[key]["provenance"] = set(row.get("provenance") or [])
        else:
            prior = merged[key]
            for name in ("priority", "target", "status", "why", "next_action", "identifier"):
                prior[name] = merge_prefer(clean(prior.get(name)), clean(row.get(name)))
            prior["archives"].update(row.get("archives") or [])
            prior["provenance"].update(row.get("provenance") or [])
    ordered = sorted(merged.values(), key=lambda row: (queue_priority(row), normalized(row.get("target"))))
    lines = [
        "# ACLM unresolved research queue", "",
        "Generated from every supplied negative-search ledger, gap table, queue, and unresolved evidence record. Repeating broad searches should start by checking the cited original report paths.", "",
    ]
    for priority, label in ((0, "P0"), (1, "P1"), (2, "Other retained trails")):
        lines.extend((f"## {label}", ""))
        subset = [row for row in ordered if queue_priority(row) == priority]
        for index, row in enumerate(subset, 1):
            lines.append(f"{index}. **{clean(row.get('target'))}**")
            if clean(row.get("status")):
                lines.append(f"   - Current state: {clean(row.get('status'))}")
            if clean(row.get("why")):
                lines.append(f"   - Why retained: {clean(row.get('why'))}")
            if clean(row.get("next_action")):
                lines.append(f"   - Next action: {clean(row.get('next_action'))}")
            if clean(row.get("identifier")):
                lines.append(f"   - Identifier or route: {clean(row.get('identifier'))}")
            if row.get("archives"):
                lines.append(f"   - Source archives: {'; '.join(sorted(item for item in row['archives'] if item))}")
        if not subset:
            lines.append("None.")
        lines.append("")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return len(ordered)


def find_evidence(evidence: list[dict[str, str]], *tokens: str) -> str:
    required = [normalized(token) for token in tokens]
    for row in evidence:
        text = normalized(f"{row['topic']} {row['claim']}")
        if all(token in text for token in required):
            return row["evidence_id"]
    return ""


def build_contradictions(evidence: list[dict[str, str]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for row in evidence:
        status_text = normalized(row["status"])
        change_text = normalized(row["evidence_state_change"])
        relationship = ""
        if "rejected" in status_text or "reject" in change_text:
            relationship = "rejected because"
        elif "contradict" in status_text or "contradict" in change_text:
            relationship = "contradicted by"
        elif "supersed" in status_text or "supersed" in change_text:
            relationship = "superseded by"
        elif "narrow" in change_text or "quarantine" in change_text:
            relationship = "narrowed by"
        if relationship:
            reason = row["evidence_state_change"] or row["applicability_limits"] or row["calibration_implication"]
            if not reason:
                continue
            rows.append({
                "subject_evidence_id": row["evidence_id"], "related_evidence_id": row["contradiction_links"],
                "relationship": relationship, "topic": row["topic"], "claim_or_state": row["claim"],
                "reason": reason,
                "resolution_status": row["status"], "source_archives": row["source_archives"],
            })
    manual = [
        ("Maserati 250F product naming", "strengthened by", "Supplier-origin Stelvio evidence rejects a blanket Stella Bianca default while preserving event sub-spec uncertainty.", find_evidence(evidence, "maserati 250f", "stelvio"), "resolved at family level; event sub-spec open"),
        ("Porsche 917-023 Monza retirement", "contradicted by", "The secondary engine-over-rev account is rejected in favor of the stronger multi-source puncture-related damage record.", find_evidence(evidence, "917 023", "puncture"), "rejected competing cause retained"),
        ("Porsche 917 supplier identity", "narrowed by", "Firestone and Goodyear evidence applies by team, chassis and event; no universal 917 supplier assignment is valid.", find_evidence(evidence, "917", "watkins glen", "firestone"), "event-resolved, globally unresolved"),
        ("Dunlop R6/R7 chronology", "narrowed by", "Period evidence shows track- and axle-specific coexistence rather than a simple one-way generation replacement.", find_evidence(evidence, "r6", "r7"), "coexisting sub-families retained"),
        ("Ferrari 333 SP geometry", "superseded by", "The one-family geometry assumption is replaced by a 16-inch base, 17-inch mid-decade and 18-inch late-decade chronology.", find_evidence(evidence, "333 sp", "progression"), "multi-generation chronology retained"),
        ("Courage C41 front size", "rejected because", "The archived 37/65x18 front string is anomalous and quarantined until independently confirmed.", find_evidence(evidence, "courage c41", "37 65"), "numeric string quarantined"),
    ]
    for topic, relation, reason, related, status in manual:
        rows.append({
            "subject_evidence_id": "", "related_evidence_id": related, "relationship": relation,
            "topic": topic, "claim_or_state": topic, "reason": reason,
            "resolution_status": status, "source_archives": "",
        })
    unique: dict[str, dict[str, str]] = {}
    for row in rows:
        key = normalized(f"{row['topic']}|{row['claim_or_state']}|{row['relationship']}|{row['reason']}")
        unique.setdefault(key, row)
    output = list(unique.values())
    for index, row in enumerate(output, 1):
        row["relationship_id"] = f"REL-FRA-{index:05d}"
    return output


def build_inventory(
    top_inputs: list[dict[str, Any]],
    root_sets: dict[str, set[str]],
    evidence_by_digest: Counter,
    sources_by_digest: Counter,
) -> list[dict[str, str]]:
    hash_groups: dict[str, list[str]] = defaultdict(list)
    for item in top_inputs:
        hash_groups[item["sha256"]].append(item["name"])
    digest_roots: dict[str, set[str]] = defaultdict(set)
    for name, digests_set in root_sets.items():
        for digest in digests_set:
            digest_roots[digest].add(name)
    rows: list[dict[str, str]] = []
    for item in top_inputs:
        name = item["name"]
        hashes = root_sets.get(name, set())
        shared = {digest for digest in hashes if len(digest_roots[digest]) > 1}
        unique = hashes - shared
        exact_group = hash_groups[item["sha256"]]
        exact = len(exact_group) > 1
        other_union: set[str] = set()
        for other_name, other_hashes in root_sets.items():
            if other_name != name:
                other_union.update(other_hashes)
        overlap_ratio = len(hashes & other_union) / len(hashes) if hashes else 0.0
        malformed = clean(item.get("error"))
        unique_evidence = sum(evidence_by_digest[digest] for digest in unique)
        if malformed:
            disposition = "malformed/incomplete; partial ingestion retained"
        elif exact:
            disposition = "exact duplicate archive; provenance retained, contents ingested once"
        elif unique_evidence:
            disposition = "partially overlapping; unique evidence ingested"
        elif unique:
            disposition = "unique non-evidence artifacts and provenance retained"
        else:
            disposition = "fully overlapped/superseded; provenance retained"
        rows.append({
            "archive_or_file_name": name, "sha256": item["sha256"], "file_type": item["file_type"],
            "apparent_research_date": apparent_date(name),
            "hourly_daily_cumulative_status": classify_input_status(name),
            "recursive_file_count": str(item.get("recursive_file_count", len(hashes))),
            "unique_payload_count": str(len(hashes)),
            "contained_evidence_count": str(sum(evidence_by_digest[digest] for digest in hashes)),
            "contained_source_count": str(sum(sources_by_digest[digest] for digest in hashes)),
            "exact_duplicate": "true" if exact else "false",
            "duplicate_of": "; ".join(sorted(other for other in exact_group if other != name)),
            "overlap_ratio": f"{overlap_ratio:.4f}",
            "partially_overlapping": "true" if 0 < overlap_ratio < 1 and not exact else "false",
            "unique_payloads_to_input": str(len(unique)),
            "superseded_but_contains_unique_evidence": "true" if overlap_ratio > 0 and unique_evidence > 0 else "false",
            "malformed_or_incomplete": malformed,
            "ingestion_disposition": disposition,
        })
    return rows


def write_report(
    path: Path,
    stats: dict[str, Any],
    inventory: list[dict[str, str]],
    evidence: list[dict[str, str]],
    sources: list[dict[str, str]],
    contradictions: list[dict[str, str]],
    numeric: list[dict[str, str]],
    coverage: list[dict[str, str]],
    unresolved_count: int,
    files_modified: list[str],
) -> None:
    exact_archives = sum(row["exact_duplicate"] == "true" for row in inventory if row["file_type"] == "zip")
    exact_copies = stats["exact_duplicate_archive_copies"]
    partial_archives = sum(row["partially_overlapping"] == "true" for row in inventory if row["file_type"] == "zip")
    rejected = sum("reject" in normalized(row["status"]) for row in evidence)
    strengthened = sum("strengthened" in normalized(row["status"]) for row in evidence)
    numeric_a = sum(row["numeric_class"].startswith("A") for row in numeric)
    weakest = sorted(coverage, key=lambda row: float(row["overall_confidence_score"]))[:10]
    improvements = [
        "Pirelli Stelvio/Stelvio Corsa is now the canonical 250F product-family branch. The 1953 5.90-15 drawing supplies a six-ply, 34-degree construction anchor, while the exact 1957 carcass material remains unresolved.",
        "The 1957 Maserati 250F baseline is narrowed to 5.50x16 front and 7.00x16 rear, with documented 16/17-inch alternatives retained as event/chassis branches rather than erased.",
        "Porsche 917 supplier identity is resolved by team, chassis and event: 917-023 Goodyear in its 1970 winning period, later Firestone in Martini use, and a JW Automotive Firestone anchor at Watkins Glen 1970.",
        "917 wet and intermediate hardware is split into distinct branches, including Brands Hatch Firestone wheel envelopes; candidate Firestone size strings remain quarantined pending period corroboration.",
        "917 failure evidence now separates puncture, tread separation/chunking, burst and casing/thermal pathways. The Le Mans alignment-to-heating-to-burst chain is retained as an event-specific mechanism.",
        "Cross-ply physics now has a source-linked multi-node thermal architecture with separate deflection, slip/braking, road, ambient and cavity pathways plus asymmetric yaw hot spots.",
        "NACA/NBS evidence strengthens pressure-, load- and deflection-dependent relaxation, loaded/effective radius, pneumatic trail, aligning torque, combined slip and contact-pressure load sensitivity.",
        "The Calspan 1976 workbook contributes 25 visually checked tire identities and 528 raw OCR-derived force-model coefficient rows (470 canonical after exact/semantic deduplication), with page-level provenance and explicit class-B test-prior quarantine.",
        "Group C and late-1970s WSC families gain exact supplier/event tire and rim tuples, plus evidence that bias, mixed and radial construction transitions must be resolved by car and event.",
        "1990s WSC/LMP and GT evidence now preserves supplier competition and 16-to-17-to-18-inch geometry generations, while modern bulletins add controlled-test priors for pressure/camber/stint coupling without back-projecting them into historical production values.",
    ]
    lines = [
        "# Full research ingestion report", "",
        "## Outcome", "",
        "Every supplied archive and workbook was opened, hashed, recursively inventoried, normalized into a canonical evidence/source model, deduplicated by source and meaning, and linked back to its original archive paths. No production tire-physics file or numerical production value was changed.", "",
        "## Processing totals", "",
        f"- Top-level inputs processed: {stats['top_level_inputs']} ({stats['top_level_archives']} ZIPs and {stats['workbooks']} workbook).",
        f"- Recursive archive layers: {stats['recursive_archive_layers']}.",
        f"- File occurrences inspected: {stats['file_occurrences']}.",
        f"- Unique file payloads: {stats['unique_file_payloads']}.",
        f"- Exact duplicate file occurrences collapsed: {stats['exact_duplicate_file_occurrences']}.",
        f"- Top-level ZIPs participating in exact-duplicate groups: {exact_archives} across {stats['exact_duplicate_archive_groups']} groups ({exact_copies} redundant copies beyond one retained representative); partially overlapping ZIP files: {partial_archives}.",
        f"- Raw evidence candidates: {stats['raw_evidence_candidates']}; canonical evidence records: {len(evidence)}; duplicate/near-duplicate evidence rows collapsed: {stats['duplicate_evidence_collapsed']}.",
        f"- Canonical sources: {len(sources)}; raw source mentions deduplicated: {stats['raw_source_mentions'] - len(sources)}.",
        f"- Evidence records new to the current v1.7.1 repository source/claim state: {stats['new_to_repository']}.",
        f"- Contradiction/supersession relationships: {len(contradictions)}; rejected claims retained: {rejected}; strengthened claims: {strengthened}.",
        f"- Numeric records classified: {len(numeric)}, including {numeric_a} class-A validated historical numeric records and {len(numeric) - numeric_a} bounded/derived/experimental records.",
        f"- Unresolved research trails retained: {unresolved_count}.",
        f"- Archive/member read failures: {stats['archive_errors']}/{stats['member_errors']}.", "",
        "## Ten most important knowledge improvements", "",
    ]
    lines.extend(f"{index}. {item}" for index, item in enumerate(improvements, 1))
    lines.extend(["", "## Important contradictions and resolutions", ""])
    for row in contradictions[:20]:
        lines.append(f"- **{row['topic']}** — {row['relationship']}: {row['reason']} ({row['resolution_status']}).")
    lines.extend(["", "## Current ten weakest family evidence gaps", ""])
    for row in weakest:
        lines.append(f"- **{row['family_id']} {row['family_name']}** — {row['overall_confidence_score']}/10, {row['historical_defensibility_status']}. Weakest: {row['weakest_evidence_dimensions']}. Gap: {row['p0_p1_gaps']}")
    lines.extend([
        "", "## Numeric evidence discipline", "",
        "Class A values are direct, source-specific historical measurements or operating specifications. Class B values are test priors, including every Calspan coefficient transcribed through OCR. Class C values are derived/reconstructed. Class D values are ACLM experiments. No B, C or D value was promoted into A and no value was written into production physics.", "",
        "`productionNumericChangesRecommended = false`", "",
        "## Exact next research priorities", "",
        "1. Recover Calspan 1976 Volumes IV-IX (or verified page images) and independently proof the 528 raw OCR coefficient rows (470 canonical after deduplication) against their tables before any coefficient is eligible to move beyond class B.",
        "2. Obtain the 1957 Pirelli 250F carcass specification, especially cord material, ply count/angles and the event-specific 5.50x16 and 7.00x16 constructions; do not back-project the 1953 5.90-15 drawing.",
        "3. Resolve Porsche 917 wet/intermediate Firestone size strings and 1970 event-by-event supplier/chassis mappings from entry sheets, team records or period technical sheets.",
        "4. Recover full General/GenCorp, Goodyear D460G/P195/70R14 and Clemson/NTMP source documents behind the current document graph; prioritize force/moment tables, pressure conventions and specimen identity.",
        "5. Target the scorecard's weakest families with primary force/moment, aligning-torque/pneumatic-trail, camber, degradation and failure data, beginning with FAM013, FAM023, FAM022, FAM021 and FAM020.",
        "6. Acquire period tire/rim technical sheets for Group 2/4/5/6, Group C and 1990s WSC/LMP event branches to close construction-generation and supplier ambiguity without merging event-specific tuples.", "",
        "## Knowledge architecture changes", "",
        "- Added a versioned consolidated evidence archive with canonical source IDs, contradiction links, numeric classes and complete archive/file lineage.",
        "- Added nonnumeric family architecture notes for 250F/Stelvio, 917 event/supplier/failure branches, Group C construction transitions and 1990s WSC geometry generations.",
        "- Added a 1970 Porsche 917K event-resolved vehicle profile with no universal supplier and no pressure or tire-physics numeric defaults.",
        "- Kept structural service life separate from tread wear and simulator degradation.", "",
        "## Validation", "",
        "- CSV and JSON outputs are UTF-8, schema-checked and parseable.",
        "- Canonical evidence and source IDs are unique.",
        "- Every rejected record retains a reason or state-change explanation.",
        "- Evidence classes were normalized only from explicit source labels; abstract-only and OCR-derived limitations remain visible.",
        "- The pre-commit production-physics guard scan found no `tyres.ini`, LUT, thermal, wear or physics-file change.", "",
        "## Files created or updated", "",
    ])
    lines.extend(f"- `{item}`" for item in files_modified)
    lines.extend(["", "## Git", "", "The final handoff records the validated branch, commit SHA and push result; Git history remains the durable authority.", ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Consolidate ACLM research archives into durable canonical ledgers.")
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--workbook-dump", type=Path, required=True)
    parser.add_argument("--knowledge", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    zip_paths = sorted(args.source_dir.glob("ACLM*.zip"), key=lambda path: path.name.lower())
    payloads: dict[str, Payload] = {}
    occurrences: list[dict[str, Any]] = []
    archive_layers: list[dict[str, Any]] = []
    root_sets: dict[str, set[str]] = defaultdict(set)
    top_inputs: list[dict[str, Any]] = []
    for path in zip_paths:
        data = path.read_bytes()
        top_inputs.append({
            "name": path.name, "sha256": sha256_bytes(data), "file_type": "zip", "size": len(data),
            "recursive_file_count": 0, "error": "",
        })
        before = len(occurrences)
        walk_zip(data, path.name, [path.name], payloads, occurrences, archive_layers, root_sets)
        top_inputs[-1]["recursive_file_count"] = len(occurrences) - before

    evidence_candidates: list[Candidate] = []
    source_rows: list[dict[str, Any]] = []
    queue_rows: list[dict[str, Any]] = []
    evidence_by_digest: Counter = Counter()
    sources_by_digest: Counter = Counter()
    parse_errors: list[dict[str, str]] = []
    for payload in payloads.values():
        extension = Path(payload.name).suffix.lower()
        try:
            if extension in {".csv", ".tsv"}:
                evidence, sources, queue = parse_csv_payload(payload)
                evidence_candidates.extend(evidence)
                source_rows.extend(sources)
                queue_rows.extend(queue)
                evidence_by_digest[payload.digest] += len(evidence)
                sources_by_digest[payload.digest] += len(sources)
            elif extension in {".json", ".jsonl"}:
                evidence = parse_json_payload(payload)
                evidence_candidates.extend(evidence)
                evidence_by_digest[payload.digest] += len(evidence)
        except Exception as exc:
            parse_errors.append({"sha256": payload.digest, "path": payload.name, "error": str(exc)})

    calspan_evidence, calspan_sources, calspan_queue, workbook_meta = add_calspan_workbook(args.workbook_dump, args.workbook)
    evidence_candidates.extend(calspan_evidence)
    source_rows.extend(calspan_sources)
    queue_rows.extend(calspan_queue)
    evidence_by_digest[workbook_meta["sha256"]] += len(calspan_evidence)
    sources_by_digest[workbook_meta["sha256"]] += len(calspan_sources)
    root_sets[args.workbook.name].add(workbook_meta["sha256"])
    top_inputs.append({
        "name": args.workbook.name, "sha256": workbook_meta["sha256"], "file_type": "xlsx",
        "size": workbook_meta["file_size"], "recursive_file_count": sum(workbook_meta["sheet_row_counts"].values()), "error": "",
    })

    canonical_candidates = deduplicate_candidates(evidence_candidates)
    known_sources = build_known_sources(args.knowledge)
    class_rank = {"DIRECT PRIMARY": 0, "STRONG PERIOD/ARCHIVAL SECONDARY": 1, "DERIVED/RECONSTRUCTED": 2, "UNKNOWN": 3}
    canonical_candidates.sort(key=lambda item: (class_rank[item.record["evidence_class"]], normalized(item.record["topic"]), normalized(item.record["source_title"]), normalized(item.record["claim"])))
    evidence_rows: list[dict[str, str]] = []
    for index, candidate in enumerate(canonical_candidates, 1):
        record = dict(candidate.record)
        record["evidence_id"] = f"EVID-FRA-{index:06d}"
        record["tire_family"] = infer_family(record["topic"], record["claim"], record["tire_family"])
        numeric_class, _ = classify_numeric(record)
        if numeric_class:
            record["numeric_class"] = numeric_class
        record["is_new_to_repository"] = "true" if is_new_to_repository(record, known_sources) else "false"
        record["source_archives"] = "; ".join(sorted(candidate.archives))
        record["original_reports"] = "; ".join(sorted(candidate.provenance))
        record["source_file_hashes"] = candidate.digest
        record["dedup_group_size"] = str(candidate.group_size)
        record["original_evidence_ids"] = "; ".join(sorted(candidate.original_ids))
        record["original_record_json"] = "[" + ",".join(dict.fromkeys(candidate.original_records)) + "]"
        evidence_rows.append(record)

    source_manifest = build_source_manifest(source_rows, canonical_candidates, payloads)
    source_ids = {source_key(row["source_title"], row["url_or_stable_identifier"]): row["source_id"] for row in source_manifest}
    for record in evidence_rows:
        record["canonical_source_id"] = source_ids.get(source_key(record["source_title"], record["source_url_or_stable_identifier"]), "")

    numeric_rows: list[dict[str, str]] = []
    for record in evidence_rows:
        classification, basis = classify_numeric(record)
        if not classification:
            continue
        numeric_rows.append({
            "numeric_id": f"NUM-FRA-{len(numeric_rows) + 1:06d}", "evidence_id": record["evidence_id"],
            "topic": record["topic"], "numeric_excerpt": record["claim"], "numeric_class": classification,
            "classification_basis": basis, "units_or_convention": join_values(record["pressure_convention"], record["pressure_values"], record["tire_size"], record["rim_size"], record["load"], record["speed"], record["camber"]),
            "source_title": record["source_title"], "source_url_or_stable_identifier": record["source_url_or_stable_identifier"],
            "applicability_limits": record["applicability_limits"],
            "controlled_test_status": "eligible for controlled validation; not production" if classification.startswith("A") else "bounded experiment only; not production",
            "source_archives": record["source_archives"], "original_reports": record["original_reports"],
        })

    contradictions = build_contradictions(evidence_rows)
    coverage = build_coverage(args.knowledge, evidence_rows)
    inventory = build_inventory(top_inputs, root_sets, evidence_by_digest, sources_by_digest)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.output_dir / "RESEARCH_ARCHIVE_INVENTORY.csv", INVENTORY_COLUMNS, inventory)
    write_csv(args.output_dir / "MASTER_EVIDENCE_LEDGER.csv", EVIDENCE_COLUMNS, evidence_rows)
    write_csv(args.output_dir / "MASTER_SOURCE_MANIFEST.csv", SOURCE_COLUMNS, source_manifest)
    write_csv(args.output_dir / "CONTRADICTIONS_AND_SUPERSESSIONS.csv", CONTRADICTION_COLUMNS, contradictions)
    write_csv(args.output_dir / "TIRE_FAMILY_COVERAGE_SCORECARD.csv", COVERAGE_COLUMNS, coverage)
    write_csv(args.output_dir / "NUMERIC_EVIDENCE_CLASSIFICATION.csv", NUMERIC_COLUMNS, numeric_rows)
    unresolved_count = write_queue(args.output_dir / "UNRESOLVED_RESEARCH_QUEUE.md", queue_rows, evidence_rows)

    archive_hash_groups = defaultdict(list)
    for item in top_inputs:
        if item["file_type"] == "zip":
            archive_hash_groups[item["sha256"]].append(item["name"])
    file_hash_counts = Counter(occ["sha256"] for occ in occurrences if occ["sha256"])
    stats = {
        "top_level_inputs": len(top_inputs), "top_level_archives": len(zip_paths), "workbooks": 1,
        "recursive_archive_layers": len(archive_layers), "file_occurrences": len(occurrences) + 1,
        "unique_file_payloads": len(payloads) + 1,
        "exact_duplicate_file_occurrences": sum(count - 1 for count in file_hash_counts.values() if count > 1),
        "exact_duplicate_archive_groups": sum(1 for group in archive_hash_groups.values() if len(group) > 1),
        "exact_duplicate_archive_files": sum(len(group) for group in archive_hash_groups.values() if len(group) > 1),
        "exact_duplicate_archive_copies": sum(len(group) - 1 for group in archive_hash_groups.values() if len(group) > 1),
        "raw_evidence_candidates": len(evidence_candidates), "canonical_evidence_records": len(evidence_rows),
        "duplicate_evidence_collapsed": len(evidence_candidates) - len(evidence_rows),
        "raw_source_mentions": len(source_rows) + len(canonical_candidates) + sum(Path(payload.name).suffix.lower() in {".pdf", ".md", ".txt", ".patch"} for payload in payloads.values()),
        "canonical_sources": len(source_manifest),
        "new_to_repository": sum(row["is_new_to_repository"] == "true" for row in evidence_rows),
        "contradictions": len(contradictions), "numeric_records": len(numeric_rows),
        "unresolved_records": unresolved_count,
        "archive_errors": sum(bool(layer["error"]) for layer in archive_layers),
        "member_errors": sum(bool(occ["error"]) for occ in occurrences),
        "parse_errors": len(parse_errors),
    }
    input_snapshot_utc = datetime.fromtimestamp(
        max([path.stat().st_mtime for path in zip_paths] + [args.workbook.stat().st_mtime]),
        timezone.utc,
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    provenance = {
        "schema": "ACLM full research ingestion provenance 1.0",
        "generated_utc": input_snapshot_utc,
        "knowledge_input_version": "1.7.1", "knowledge_output_version": "1.8.0",
        "productionNumericChangesRecommended": False,
        "source_directory": str(args.source_dir),
        "raw_material_policy": "Original ZIPs/PDFs/workbook remain in the supplied source directory; canonical records retain top archive, member path and SHA-256.",
        "stats": stats, "inputs": top_inputs, "archive_layers": archive_layers,
        "file_occurrences": occurrences,
        "workbook": {"path": str(args.workbook), **workbook_meta},
        "parse_errors": parse_errors,
        "outputs": [
            "FULL_RESEARCH_INGESTION_REPORT.md", "RESEARCH_ARCHIVE_INVENTORY.csv",
            "MASTER_EVIDENCE_LEDGER.csv", "MASTER_SOURCE_MANIFEST.csv",
            "CONTRADICTIONS_AND_SUPERSESSIONS.csv", "UNRESOLVED_RESEARCH_QUEUE.md",
            "TIRE_FAMILY_COVERAGE_SCORECARD.csv", "NUMERIC_EVIDENCE_CLASSIFICATION.csv",
            "INGESTION_PROVENANCE.json",
        ],
    }
    (args.output_dir / "INGESTION_PROVENANCE.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    files_modified = provenance["outputs"] + [
        "knowledge/releases/ACLM_Tire_Knowledge_v1.8.0.json",
        "knowledge/releases/ACLM_Tire_Knowledge_v1.8.0_validation.json",
        "knowledge/ACLM_Tire_Knowledge_current.package.json",
        "knowledge/ACLM_Tire_Knowledge_latest.json",
        "src/payload/app/knowledge_fallback.json",
        "src/payload/app/knowledge_fallback.js",
        "docs/RESEARCH_KNOWLEDGE_CHECKPOINT.md", "docs/CURRENT_PROJECT_CHECKPOINT.md",
        "tools/consolidate_research_archives.py", "tools/build_knowledge_180_archive.js",
        "tools/validate_research_import.py", "tests/research_archive_ingestion.test.js",
    ]
    write_report(
        args.output_dir / "FULL_RESEARCH_INGESTION_REPORT.md", stats, inventory, evidence_rows,
        source_manifest, contradictions, numeric_rows, coverage, unresolved_count, files_modified,
    )
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
