"""Ingest the supplied Calspan 1976 retrieval index without inventing curve data."""

from __future__ import annotations

import csv
import hashlib
import json
import pathlib
import re
import shutil
from collections import Counter
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".codex_work" / "calspan_index"
DEST = ROOT / "research_import" / "calspan_1976"
SOURCE_DEST = DEST / "source_index"
ARCHIVE_NAME = "ACLM_CALSPAN_1976_COMPLETE_INDEX.zip"


def read_csv(name: str) -> list[dict[str, str]]:
    with (SOURCE / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: pathlib.Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


STRICT_NUMBER = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$")


def strict_number(raw: str | None) -> float | None:
    value = (raw or "").strip()
    if not value or not STRICT_NUMBER.fullmatch(value):
        return None
    number = float(value)
    return number if abs(number) < 1e12 else None


def rounded(value: float | None, digits: int = 4) -> str:
    return "" if value is None else f"{value:.{digits}f}".rstrip("0").rstrip(".")


def append_rows(path: pathlib.Path, rows: list[dict[str, str]], unique_field: str) -> int:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = list(reader.fieldnames or [])
        existing = list(reader)
    known = {row.get(unique_field, "") for row in existing}
    incoming = {row.get(unique_field, ""): row for row in rows}
    additions = [row for row in rows if row.get(unique_field, "") not in known]
    existing = [incoming.get(row.get(unique_field, ""), row) for row in existing]
    for row in existing + additions:
        for field in fields:
            row.setdefault(field, "")
    write_csv(path, existing + additions, fields)
    return len(additions)


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    SOURCE_DEST.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE.iterdir()):
        if source.is_file():
            shutil.copy2(source, SOURCE_DEST / source.name)

    tires = read_csv("calspan_1976_tire_master.csv")
    packages = read_csv("calspan_1976_data_packages.csv")
    measurements = read_csv("calspan_1976_measurement_pages.csv")
    pages = read_csv("calspan_1976_page_index.csv")
    volumes = read_csv("calspan_1976_volumes.csv")
    package_by_id = {row["package_id"]: row for row in packages}
    tire_by_key = {row["tire_key"]: row for row in tires}

    series_rows: list[dict] = []
    for package in packages:
        speed = strict_number(package["road_speed_mph_raw"])
        water = strict_number(package["water_depth_mil_raw"])
        cold = strict_number(package["cold_infl_psi_raw"])
        design_load = strict_number(package["design_load_lb_raw"])
        max_load = strict_number(package["max_load_lb_raw"])
        max_infl = strict_number(package["max_infl_psi_raw"])
        rim = strict_number(package["rim_width_in_raw"])
        groove = strict_number(package["groove_depth_pct_raw"])
        series_rows.append({
            **package,
            "road_speed_mph": rounded(speed),
            "road_speed_kph": rounded(None if speed is None else speed * 1.609344),
            "water_depth_mil": rounded(water),
            "water_depth_mm": rounded(None if water is None else water * 0.0254),
            "cold_infl_psi": rounded(cold),
            "cold_infl_kpa": rounded(None if cold is None else cold * 6.8947572932),
            "design_load_lb": rounded(design_load),
            "design_load_n": rounded(None if design_load is None else design_load * 4.4482216153),
            "max_load_lb": rounded(max_load),
            "max_load_n": rounded(None if max_load is None else max_load * 4.4482216153),
            "max_infl_psi": rounded(max_infl),
            "max_infl_kpa": rounded(None if max_infl is None else max_infl * 6.8947572932),
            "rim_width_in": rounded(rim),
            "rim_width_mm": rounded(None if rim is None else rim * 25.4),
            "groove_depth_pct": rounded(groove),
            "normalization_rule": "strict numeric token only; malformed OCR remains raw and normalized fields stay blank",
            "applicability_default": "MECHANISM_ONLY",
            "production_promotion": "BLOCKED_PENDING_DIGITIZATION_AND_RACING_APPLICABILITY",
        })
    series_fields = list(series_rows[0])
    write_csv(DEST / "CALSPAN_TEST_SERIES.csv", series_rows, series_fields)

    observation_rows: list[dict] = []
    channel_map = {
        "cornering_coefficients": "lateral_force_coefficient;aligning_torque_unspecified",
        "braking_coefficients": "longitudinal_force_coefficient",
        "combined_interaction": "combined_longitudinal_lateral_interaction",
        "test_data": "unspecified_test_data",
    }
    for index, measurement in enumerate(measurements, 1):
        package = package_by_id.get(measurement["package_id"], {})
        tire = tire_by_key.get(measurement["tire_key"], {})
        speed = strict_number(package.get("road_speed_mph_raw"))
        water = strict_number(package.get("water_depth_mil_raw"))
        cold = strict_number(package.get("cold_infl_psi_raw"))
        load = strict_number(package.get("design_load_lb_raw"))
        observation_rows.append({
            "observation_id": f"CAL76-OBS-{index:04d}",
            **measurement,
            "tire_size_raw": tire.get("size_raw", package.get("master_size", "")),
            "manufacturer": tire.get("manufacturer_name", package.get("master_manufacturer", "")),
            "brand_raw": tire.get("brand_name_raw", package.get("master_brand", "")),
            "construction": tire.get("construction_name", package.get("master_construction", "")),
            "channels_indexed": channel_map.get(measurement["measurement_page_type"], "unspecified"),
            "road_speed_mph_raw": package.get("road_speed_mph_raw", ""),
            "road_speed_mph": rounded(speed),
            "road_speed_kph": rounded(None if speed is None else speed * 1.609344),
            "water_depth_mil_raw": package.get("water_depth_mil_raw", ""),
            "water_depth_mm": rounded(None if water is None else water * 0.0254),
            "cold_infl_psi_raw": package.get("cold_infl_psi_raw", ""),
            "cold_infl_psi": rounded(cold),
            "cold_infl_kpa": rounded(None if cold is None else cold * 6.8947572932),
            "design_load_lb_raw": package.get("design_load_lb_raw", ""),
            "design_load_n": rounded(None if load is None else load * 4.4482216153),
            "source_page_locator": f"{measurement['source_file']}#page={measurement['pdf_page']}",
            "digitization_status": "PAGE_LOCATOR_ONLY_NO_XY_POINTS",
            "digitized_curve_point_count": "0",
            "applicability_default": "MECHANISM_ONLY",
            "production_promotion": "BLOCKED_PENDING_DIGITIZATION_AND_RACING_APPLICABILITY",
            "normalization_rule": "strict numeric token only; raw OCR is authoritative when normalized value is blank",
        })
    observation_fields = list(observation_rows[0])
    write_csv(DEST / "CALSPAN_TEST_OBSERVATIONS.csv", observation_rows, observation_fields)

    specimen_rows = []
    for tire in tires:
        specimen_rows.append({
            **tire,
            "identity_scope": "1976 Calspan/NHTSA passenger-tire corpus",
            "racing_applicability_default": "MECHANISM_ONLY",
            "curve_digitization_status": "NOT_DIGITIZED_IN_SUPPLIED_INDEX",
        })
    write_csv(DEST / "CALSPAN_TIRE_SPECIMENS.csv", specimen_rows, list(specimen_rows[0]))

    source_rows = []
    for volume in volumes:
        source_rows.append({
            "source_id": f"SRC-CALSPAN-1976-V{int(volume['volume']):02d}",
            "source_title": volume["title"],
            "url_or_stable_identifier": f"{volume['pb_number']} / {volume['dot_report_no']}",
            "source_date": "1976",
            "publisher_origin": "U.S. Department of Transportation / NHTSA; Calspan Corporation",
            "source_type": "government technical report",
            "evidence_class": "DIRECT PRIMARY",
            "access_status": "INDEXED; source PDF hash and page-level OCR retained; source PDF binary not included in supplied ZIP",
            "summary": f"{volume['pdf_pages']} indexed pages; {volume['identification_packages']} tire-identification packages.",
            "limitations": "OCR/transcription uncertainty; supplied package contains the retrieval index and page text, not the original PDF binary or digitized curve coordinates.",
            "mention_count": "1",
            "source_archives": ARCHIVE_NAME,
            "original_reports": volume["source_file"],
            "source_file_hashes": volume["sha256"],
        })
    sources_added = append_rows(ROOT / "research_import" / "MASTER_SOURCE_MANIFEST.csv", source_rows, "source_id")

    evidence_claims = [
        ("CORPUS_COVERAGE", "The supplied index covers nine 1976 Calspan/NHTSA volumes and 3,630 pages.", "All volumes", "MECHANISM_ONLY"),
        ("IDENTITY_COUNT", "Appendix B transcription contains 380 indexed tire IDs, while Volume I reports 378 tires procured; the discrepancy remains unresolved.", "Volume I and II", "MECHANISM_ONLY"),
        ("PACKAGE_COUNT", "Volumes III-IX contain 358 indexed tire-identification data packages mapped to 306 unique master tires.", "Volumes III-IX", "CLOSE_ANALOG"),
        ("MEASUREMENT_INDEX", "The index locates 708 measurement/control pages: 348 cornering, 286 braking, 65 additional test-data, and 9 combined-interaction pages.", "Volumes III-IX", "CLOSE_ANALOG"),
        ("NO_DIGITIZED_CURVES", "The supplied archive contains zero fully digitized force-curve XY point observations; page locators and raw OCR blocks must not be treated as numeric curves.", "Complete supplied index", "NOT_APPLICABLE"),
        ("PROMOTION_BOUNDARY", "Passenger-tire Calspan evidence may inform mechanisms and controlled extraction targets but cannot override direct racing-family, chassis, event, supplier, or telemetry evidence.", "ACLM policy applied to corpus", "MECHANISM_ONLY"),
    ]
    evidence_rows = []
    for index, (topic, claim, source_title, applicability) in enumerate(evidence_claims, 1):
        evidence_rows.append({
            "evidence_id": f"EVID-CALSPAN-1976-{index:03d}",
            "first_seen_time": "2026-09-04T00:00:00-07:00",
            "latest_strengthened_time": "2026-09-04T00:00:00-07:00",
            "topic": topic,
            "claim": claim,
            "source_title": source_title,
            "source_url_or_stable_identifier": "PB263440-PB263448 / DOT HS-802 086-094",
            "canonical_source_id": "SRC-CALSPAN-1976-V01",
            "source_date": "1976",
            "source_type": "government technical report index/transcription",
            "evidence_class": "DIRECT PRIMARY" if index < 6 else "DERIVED/RECONSTRUCTED",
            "evidence_class_original": "DIRECT PRIMARY" if index < 6 else "ACLM DERIVED",
            "confidence": "HIGH" if index in (1, 3, 4, 5) else "MEDIUM",
            "year": "1976",
            "test_conditions": "See research_import/calspan_1976/CALSPAN_TEST_SERIES.csv; raw OCR retained and only unambiguous numeric tokens normalized.",
            "applicability_limits": applicability + "; 1976 passenger-tire corpus, not a supplier-exact racing calibration",
            "calibration_implication": "No production numeric change authorized.",
            "status": "active",
            "numeric_class": "NONNUMERIC / INDEX" if index != 4 else "COUNT / INDEX ONLY",
            "is_new_to_repository": "true",
            "source_archives": ARCHIVE_NAME,
            "original_reports": "research_import/calspan_1976/source_index/INDEX_MANIFEST.json",
        })
    evidence_added = append_rows(ROOT / "research_import" / "MASTER_EVIDENCE_LEDGER.csv", evidence_rows, "evidence_id")

    copied = []
    for path in sorted(SOURCE_DEST.iterdir()):
        copied.append({"path": str(path.relative_to(ROOT)).replace("\\", "/"), "bytes": path.stat().st_size, "sha256": sha256(path)})
    manifest = {
        "schema": "ACLM Calspan 1976 corpus ingest 1.0",
        "createdUtc": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": ARCHIVE_NAME,
        "scope": "Complete supplied retrieval index; original nine source PDF binaries are not present in the supplied archive.",
        "counts": {
            "sourceVolumes": len(volumes),
            "indexedPages": len(pages),
            "appendixBTireIds": len(tires),
            "reportedProcuredTiresVolumeI": 378,
            "identityCountDiscrepancy": 2,
            "testPackages": len(packages),
            "uniqueMappedMasterTires": len({row["tire_key"] for row in packages if row["tire_key"]}),
            "measurementPages": len(measurements),
            "measurementPageTypes": dict(Counter(row["measurement_page_type"] for row in measurements)),
            "mappingConfidence": dict(Counter(row["mapping_confidence"] for row in packages)),
            "fullyDigitizedForceCurvePointObservations": 0,
            "masterSourcesIntroducedByCorpus": 9,
            "masterEvidenceClaimsIntroducedByCorpus": 6,
            "masterSourceRowsNewThisRun": sources_added,
            "masterEvidenceRowsNewThisRun": evidence_added,
        },
        "evidenceBoundaries": [
            "Raw OCR and transcription are preserved; malformed values are not silently repaired.",
            "Only unambiguous numeric tokens are normalized, with raw fields retained beside them.",
            "Measurement pages are locators, not digitized force curves.",
            "Generic passenger-tire evidence defaults to MECHANISM_ONLY for racing families.",
            "No generator numeric prior is promoted from this corpus without digitization, applicability review, and regression certification.",
        ],
        "derivedArtifacts": [
            "research_import/calspan_1976/CALSPAN_TIRE_SPECIMENS.csv",
            "research_import/calspan_1976/CALSPAN_TEST_SERIES.csv",
            "research_import/calspan_1976/CALSPAN_TEST_OBSERVATIONS.csv",
        ],
        "copiedSourceIndexFiles": copied,
    }
    (DEST / "CALSPAN_CORPUS_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
