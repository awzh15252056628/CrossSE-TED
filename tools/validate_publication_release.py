#!/usr/bin/env python3
"""Read-only integrity checks for the v2026.07 GitHub Pages release."""

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
RELEASE = REPO / "release" / "v2026.07"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    index = (REPO / "index.html").read_text(encoding="utf-8")
    app = (REPO / "assets" / "app.js").read_text(encoding="utf-8")
    payload_match = re.search(
        r'<script id="payload" type="application/json">(.*?)</script>',
        index,
        flags=re.DOTALL,
    )
    require(payload_match is not None, "Embedded payload JSON not found")
    payload = json.loads(payload_match.group(1))
    summary = payload["public_sra"]["summary"]
    require(payload["public_sra"]["rows"] == [], "Embedded SRA fallback still contains rows")
    require(summary["runs"] == 1110, "Embedded summary run count mismatch")
    require(summary["species"] == 47, "Embedded summary taxon count mismatch")
    require(summary["projects"] == 89, "Embedded summary BioProject count mismatch")
    require(summary["rna_seq_only"] == 996, "Embedded summary RNA-seq count mismatch")
    require(summary["embedded_fallback"] is False, "Embedded fallback flag is not false")
    require("curl: (56)" not in index, "Corrupted curl output remains in index.html")
    require('"runs":1144' not in index, "Obsolete 1,144-run count remains in index.html")

    with gzip.open(
        REPO / "datasets_data" / "sra_datasets.json.gz", "rt", encoding="utf-8"
    ) as handle:
        catalog = json.load(handle)
    require(len(catalog["rows"]) == 1110, "Authoritative SRA file does not contain 1,110 rows")
    require(
        catalog["counts"]
        == {
            "runs": 1110,
            "species": 47,
            "projects": 89,
            "strategies": 4,
            "total_size_gb": 2445.4,
            "rna_seq_only": 996,
        },
        f"Unexpected authoritative SRA counts: {catalog['counts']}",
    )

    deg = json.loads(
        (REPO / "datasets_data" / "deg_manifest.json").read_text(encoding="utf-8")
    )
    lc = [row for row in deg["species"] if row["key"] == "Lc"]
    require(
        len(lc) == 1
        and lc[0]["label"]
        == "Liriodendron hybrid (L. chinense reference annotation)",
        "Liriodendron DEG label is not hybrid-aware",
    )

    release = json.loads((RELEASE / "release.json").read_text(encoding="utf-8"))
    require(release["release_id"] == "v2026.07", "Release ID mismatch")
    require(release["freeze_date"] == "2026-07-15", "Freeze date mismatch")
    require(release["expression_query"] == {"taxa": 10, "sample_columns": 239}, "Expression-query summary mismatch")
    require(
        release["ui_index"] == {"species": 11, "matrices": 72, "sample_columns": 1387},
        "UI index summary mismatch",
    )

    publication_dir = REPO / "assets" / "publication_figures"
    for number in range(1, 7):
        for suffix in (".svg", ".pdf", ".png", ".tif"):
            path = publication_dir / f"Figure_{number}{suffix}"
            require(path.is_file() and path.stat().st_size > 0, f"Missing publication artifact: {path}")
        ET.parse(publication_dir / f"Figure_{number}.svg")
        require(
            (publication_dir / f"Figure_{number}.pdf").read_bytes()[:5] == b"%PDF-",
            f"Figure {number} PDF header is invalid",
        )
        for suffix in (".png", ".tif"):
            with Image.open(publication_dir / f"Figure_{number}{suffix}") as image:
                dpi = image.info.get("dpi")
                require(dpi is not None, f"Figure {number}{suffix} lacks DPI metadata")
                require(
                    abs(float(dpi[0]) - 600) < 0.1 and abs(float(dpi[1]) - 600) < 0.1,
                    f"Figure {number}{suffix} is not 600 dpi: {dpi}",
                )

    publication_entries = re.findall(r'group:"Publication freeze v2026\.07"', app)
    require(len(publication_entries) == 6, "App gallery does not contain exactly six frozen publication entries")
    require("PNG · 600 dpi" in app and ">SVG<" in app and ">PDF<" in app, "Gallery download links are incomplete")
    for number in range(1, 7):
        for suffix in ("svg", "pdf", "png", "tif"):
            link = f"assets/publication_figures/Figure_{number}.{suffix}"
            require(link in app, f"Gallery omits {link}")
            require((REPO / link).is_file(), f"Gallery link is broken: {link}")

    figure5_summary_path = (
        REPO / "assets" / "publication_figures" / "Figure5_DEG_count_summary.tsv"
    )
    require(figure5_summary_path.is_file(), "Figure 5 DEG count summary is missing")
    require(
        "assets/publication_figures/Figure5_DEG_count_summary.tsv" in app,
        "Figure 5 gallery card omits its source table",
    )
    with figure5_summary_path.open("r", encoding="utf-8", newline="") as handle:
        figure5_rows = list(csv.DictReader(handle, delimiter="\t"))
    require(len(figure5_rows) == 31, "Figure 5 summary must contain 31 contrasts")
    require(
        all(row["n_later"] == "3" and row["n_preceding"] == "3" for row in figure5_rows),
        "Figure 5 per-group sample sizes are inconsistent",
    )
    figure5_lookup = {
        (row["species_key"], row["comparison"]): (
            int(row["upregulated_in_later_group"]),
            int(row["downregulated_in_later_group"]),
        )
        for row in figure5_rows
    }
    require(
        figure5_lookup[("Cula", "CK_1d_vs_Callus_0d")] == (1663, 1758)
        and figure5_lookup[("Pa", "S7_S6")] == (19164, 10969)
        and figure5_lookup[("Hip", "L10_L0")] == (18091, 13184)
        and figure5_lookup[("Zma", "SE_EC")] == (250, 1694),
        "Figure 5 frozen DEG counts do not match the authoritative source",
    )

    required_release_links = [
        "release/v2026.07/CHANGELOG.md",
        "release/v2026.07/release.json",
        "release/v2026.07/SHA256SUMS.txt",
    ]
    for link in required_release_links:
        require(link in index, f"Visible page omits release link: {link}")
        require((REPO / link).is_file(), f"Release link is broken: {link}")

    coexpression_dir = REPO / "datasets_data" / "coexpression"
    with (coexpression_dir / "liriodendron_figure3_edges.tsv").open(
        "r", encoding="utf-8", newline=""
    ) as handle:
        edges = list(csv.DictReader(handle, delimiter="\t"))
    with (coexpression_dir / "liriodendron_figure3_nodes.tsv").open(
        "r", encoding="utf-8", newline=""
    ) as handle:
        nodes = list(csv.DictReader(handle, delimiter="\t"))
    signs = Counter(row["correlation_sign"] for row in edges)
    roles = Counter(row["node_role_corrected"] for row in nodes)
    require(len(nodes) == 167, "Figure 3 node count mismatch")
    require(
        roles["transcription_factor"] + roles["transcription_factor_reclassified"] == 38,
        "Figure 3 TF count mismatch",
    )
    require(roles["target_gene"] == 129, "Figure 3 target count mismatch")
    require(len(edges) == 1000, "Figure 3 edge count mismatch")
    require(signs["positive"] == 868 and signs["negative"] == 132, "Figure 3 edge-sign counts mismatch")

    checksum_rows = []
    for line in (RELEASE / "SHA256SUMS.txt").read_text(encoding="ascii").splitlines():
        expected, relative = line.split("  ", 1)
        path = REPO / relative
        require(path.is_file(), f"Checksum target is missing: {relative}")
        require(sha256(path) == expected, f"Checksum mismatch: {relative}")
        checksum_rows.append(relative)
    require(len(checksum_rows) >= 40, "Checksum manifest is unexpectedly short")
    require(
        sha256(REPO / "datasets_data" / "sra_datasets.json.gz")
        == release["catalog"]["all_curated_records"]["sha256"],
        "release.json SRA checksum mismatch",
    )

    print(
        json.dumps(
            {
                "status": "PASS",
                "embedded_public_sra_rows": 0,
                "authoritative_catalog": catalog["counts"],
                "publication_figures": 6,
                "raster_dpi": 600,
                "figure3": {
                    "nodes": len(nodes),
                    "transcription_factors": 38,
                    "targets": 129,
                    "edges": len(edges),
                    "positive": signs["positive"],
                    "negative": signs["negative"],
                },
                "checksum_entries_verified": len(checksum_rows),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
