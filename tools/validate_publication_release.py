#!/usr/bin/env python3
"""Read-only checks for the unified manuscript-associated CrossSE-TED release."""

from __future__ import annotations

import csv
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
RELEASE = REPO / "release" / "v2026.08.03"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_tsv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def main() -> None:
    index = (REPO / "index.html").read_text(encoding="utf-8")
    app = (REPO / "assets" / "app.js").read_text(encoding="utf-8")
    match = re.search(r'<script id="payload" type="application/json">(.*?)</script>', index, re.S)
    require(match is not None, "Embedded payload JSON not found")
    payload = json.loads(match.group(1))
    summary = payload["public_sra"]["summary"]
    require(payload["public_sra"]["rows"] == [], "Embedded SRA rows must be empty")
    require({key: summary[key] for key in ("runs", "species", "projects", "strategies")} ==
            {"runs": 1097, "species": 46, "projects": 82, "strategies": 1},
            f"Embedded catalog summary mismatch: {summary}")
    require(summary["embedded_fallback"] is False, "Embedded fallback flag must be false")
    require(payload["stats"]["species"] == 10, "Expression taxon count mismatch")
    require(payload["stats"]["matrices"] == 30, "Expression matrix count mismatch")
    require(payload["stats"]["samples"] == 239, "Expression sample-column count mismatch")
    require(len(payload["species"]) == 10 and len(payload["expression"]) == 30, "Expression payload size mismatch")

    with gzip.open(REPO / "datasets_data" / "sra_datasets.json.gz", "rt", encoding="utf-8") as handle:
        catalog = json.load(handle)
    require(len(catalog["rows"]) == 1097, "Catalog must contain 1,097 records")
    columns = catalog["columns"]
    idx = {name: columns.index(name) for name in ("Run", "ScientificName", "BioProject", "LibraryStrategy")}
    require(len({row[idx["Run"]] for row in catalog["rows"]}) == 1097, "Duplicate Run accession")
    require(len({row[idx["ScientificName"]] for row in catalog["rows"]}) == 46, "Taxonomic-label count mismatch")
    require(len({row[idx["BioProject"]] for row in catalog["rows"]}) == 82, "BioProject count mismatch")
    require("plant metagenome" not in {row[idx["ScientificName"]] for row in catalog["rows"]},
            "Unresolved plant metagenome label remains")
    require({row[idx["LibraryStrategy"]] for row in catalog["rows"]} == {"RNA-Seq"}, "Non-RNA-seq record remains")

    release = json.loads((RELEASE / "release.json").read_text(encoding="utf-8"))
    require(release["catalog"]["rna_seq_records"]["runs"] == 1097, "release.json run count mismatch")
    require({key: release["expression_query"][key] for key in ("taxa", "matrices", "sample_columns")} ==
            {"taxa": 10, "matrices": 30, "sample_columns": 239}, "release.json expression scope mismatch")
    require(release["publication_figures"]["count"] == 5, "release.json figure count mismatch")
    require(release["release_id"] == "v2026.08.03", "release identifier mismatch")
    require(all(release[key] == "2026-08-03" for key in ("release_date", "freeze_date", "updated_on", "manuscript_access_date", "supplementary_material_date")), "release dates are not synchronized")
    require("pending author completion" not in json.dumps(release).lower(), "obsolete S4 pending status remains")

    expression_index = json.loads((REPO / "expression_data" / "index.json").read_text(encoding="utf-8"))
    require(len(expression_index["species"]) == 10, "Expression index must contain 10 taxa")
    sample_total = 0
    matrix_total = 0
    for species in expression_index["species"]:
        counts = [len(metric["samples"]) for metric in species["metrics"].values()]
        require(len(counts) == 3 and len(set(counts)) == 1, f"Metric sample mismatch: {species['id']}")
        matrix_total += len(counts)
        sample_total += counts[0]
    require(matrix_total == 30 and sample_total == 239, "Expression index aggregate mismatch")

    publication = REPO / "assets" / "publication_figures"
    for number in range(1, 6):
        for suffix in (".svg", ".pdf", ".png", ".tif"):
            path = publication / f"Figure_{number}{suffix}"
            require(path.is_file() and path.stat().st_size > 0, f"Missing figure artifact: {path.name}")
        ET.parse(publication / f"Figure_{number}.svg")
        require((publication / f"Figure_{number}.pdf").read_bytes()[:5] == b"%PDF-", f"Invalid PDF: Figure {number}")
        for suffix in (".png", ".tif"):
            with Image.open(publication / f"Figure_{number}{suffix}") as image:
                dpi = image.info.get("dpi")
                require(dpi and all(abs(float(value) - 600) < 0.2 for value in dpi[:2]), f"Not 600 dpi: Figure_{number}{suffix} {dpi}")
    require(not any(publication.glob("Figure_6.*")), "Obsolete Figure 6 remains")
    require("Figure5_DEG_count_summary.tsv" not in app and "Figure_6" not in app, "Obsolete gallery reference remains")
    require(len(re.findall(r'group:"Publication-associated release v2026\.08\.03"', app)) == 5, "Gallery must contain five publication figures")

    deg = read_tsv(REPO / "supplementary_tables" / "S5A_DEG_counts.tsv")
    coverage = read_tsv(REPO / "supplementary_tables" / "S5B_Sample_coverage.tsv")
    require(len(deg) == 24, "Supplementary Table S5A must contain 24 gene-level contrasts")
    require(not any(row["Taxon"] == "Picea abies" for row in deg), "Picea exon-level DEG rows remain")
    require(all(row["n (later)"] == "3" and row["n (earlier)"] == "3" for row in deg), "S5A group sizes must all be three")
    require(len(coverage) == 10 and sum(int(row["Processed expression-matrix sample columns"]) for row in coverage) == 239,
            "S5B coverage mismatch")
    require((REPO / "supplementary_tables" / "Supplementary_Tables_S1-S7_revised.xlsx").is_file(), "Supplementary workbook missing")
    require((REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.xlsx").is_file(), "Catalog workbook missing")

    coexpression = REPO / "datasets_data" / "coexpression"
    edges = read_tsv(coexpression / "liriodendron_figure3_edges.tsv")
    nodes = read_tsv(coexpression / "liriodendron_figure3_nodes.tsv")
    signs = Counter(row["correlation_sign"] for row in edges)
    roles = Counter(row["node_role_corrected"] for row in nodes)
    require(len(nodes) == 167 and len(edges) == 1000, "Figure 3 network size mismatch")
    require(roles["transcription_factor"] + roles["transcription_factor_reclassified"] == 38 and roles["target_gene"] == 129,
            "Figure 3 role counts mismatch")
    require(signs["positive"] == 868 and signs["negative"] == 132, "Figure 3 edge-sign counts mismatch")

    checked = 0
    for line in (RELEASE / "SHA256SUMS.txt").read_text(encoding="ascii").splitlines():
        expected, relative = line.split("  ", 1)
        path = REPO / relative
        require(path.is_file(), f"Checksum target missing: {relative}")
        require(sha256(path) == expected, f"Checksum mismatch: {relative}")
        checked += 1

    stale_patterns = ["v2026.07", "2026-07-15", "2026-08-02", "pending author completion", "996 runs", "45 taxonomic labels", "79 BioProjects", "1,110", "1110 runs", "47 taxonomic", "89 BioProjects", "six publication figures"]
    combined = index + "\n" + app
    require(not any(pattern in combined for pattern in stale_patterns), "Stale reporting scope remains in website text")
    print(json.dumps({"status": "PASS", "RNA-seq_runs": 1097, "taxonomic_labels": 46, "BioProjects": 82,
                      "expression_taxa": 10, "matrices": 30, "sample_columns": 239,
                      "publication_figures": 5, "S5_contrasts": 24, "checksums_verified": checked}, indent=2))


if __name__ == "__main__":
    main()
