#!/usr/bin/env python3
"""Synchronize the GitHub Pages repository with the v2026.07 publication freeze.

This script intentionally leaves the authoritative compressed SRA catalog unchanged.
It removes the obsolete embedded fallback, updates release-facing metadata, validates
or copies frozen figure/source artifacts, and writes a reproducible checksum manifest.
Optional CROSSSE_FIGURE_SOURCE and CROSSSE_FIGURE3_SOURCE environment variables may
point to newly generated artifacts; otherwise the checked-in frozen files are used.
"""

from __future__ import annotations

import csv
import gzip
import hashlib
import json
import math
import os
import re
import shutil
from collections import Counter
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
FIGURE_SOURCE = Path(
    os.environ.get(
        "CROSSSE_FIGURE_SOURCE",
        str(REPO / "assets" / "publication_figures"),
    )
)
CYTOSCAPE_SOURCE = Path(
    os.environ.get(
        "CROSSSE_FIGURE3_SOURCE",
        str(REPO / "datasets_data" / "coexpression"),
    )
)

FREEZE_ID = "v2026.07"
FREEZE_DATE = "2026-07-15"

EXPECTED_CATALOG = {
    "runs": 1110,
    "species": 47,
    "projects": 89,
    "strategies": 4,
    "rna_seq_only": 996,
    "total_size_gb": 2445.4,
}
EXPECTED_RNA_SUBSET = {"runs": 996, "species": 45, "projects": 79}
EXPECTED_UI = {"species": 11, "matrices": 72, "sample_columns": 1387}
EXPECTED_EXPRESSION_QUERY = {"taxa": 10, "sample_columns": 239}
EXPECTED_FIGURE3 = {
    "nodes": 167,
    "transcription_factors": 38,
    "target_genes": 129,
    "edges": 1000,
    "positive_edges": 868,
    "negative_edges": 132,
    "samples": 15,
    "stages": 5,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load_authoritative_catalog() -> dict:
    catalog_path = REPO / "datasets_data" / "sra_datasets.json.gz"
    before_hash = sha256(catalog_path)
    with gzip.open(catalog_path, "rt", encoding="utf-8") as handle:
        data = json.load(handle)
    counts = data.get("counts", {})
    for key, expected in EXPECTED_CATALOG.items():
        actual = counts.get(key)
        require(actual == expected, f"SRA catalog {key}: expected {expected!r}, got {actual!r}")
    require(len(data.get("rows", [])) == EXPECTED_CATALOG["runs"], "SRA row count is not 1110")
    require(sha256(catalog_path) == before_hash, "Authoritative SRA catalog changed while reading")
    return {"data": data, "sha256": before_hash}


def synchronize_figure3_sources() -> dict:
    out_dir = REPO / "datasets_data" / "coexpression"
    out_dir.mkdir(parents=True, exist_ok=True)
    mapping = {
        "Liriodendron_core_top1000_edges.tsv": "liriodendron_figure3_edges.tsv",
        "Liriodendron_core_top1000_nodes_with_original_gene_id.tsv": "liriodendron_figure3_nodes.tsv",
        "Liriodendron_core_top1000_geneID_annotation_explicit.tsv": "liriodendron_figure3_gene_annotations.tsv",
        "Liriodendron_core_top1000_node_id_mapping.tsv": "liriodendron_figure3_node_id_mapping.tsv",
        "README_Cytoscape_gene_IDs.txt": "README_liriodendron_figure3.txt",
    }
    for source_name, target_name in mapping.items():
        source = (
            CYTOSCAPE_SOURCE / target_name
            if CYTOSCAPE_SOURCE.resolve() == out_dir.resolve()
            else CYTOSCAPE_SOURCE / source_name
        )
        require(source.is_file(), f"Missing Figure 3 source: {source}")
        target = out_dir / target_name
        if source.resolve() != target.resolve():
            shutil.copy2(source, target)

    edge_path = out_dir / "liriodendron_figure3_edges.tsv"
    node_path = out_dir / "liriodendron_figure3_nodes.tsv"
    with edge_path.open("r", encoding="utf-8", newline="") as handle:
        edges = list(csv.DictReader(handle, delimiter="\t"))
    with node_path.open("r", encoding="utf-8", newline="") as handle:
        nodes = list(csv.DictReader(handle, delimiter="\t"))

    signs = Counter(row["correlation_sign"].strip().lower() for row in edges)
    roles = Counter(row["node_role_corrected"].strip().lower() for row in nodes)
    tf_count = roles["transcription_factor"] + roles["transcription_factor_reclassified"]
    target_count = roles["target_gene"]
    observed = {
        "nodes": len(nodes),
        "transcription_factors": tf_count,
        "target_genes": target_count,
        "edges": len(edges),
        "positive_edges": signs["positive"],
        "negative_edges": signs["negative"],
        "samples": 15,
        "stages": 5,
    }
    require(observed == EXPECTED_FIGURE3, f"Figure 3 frozen source mismatch: {observed}")

    # Recompute the documented score from the exported columns as a validation only.
    for row_number, row in enumerate(edges, start=2):
        expected_score = (
            abs(float(row["pearson_r"]))
            * math.sqrt(float(row["source_degree"]) * float(row["target_degree"]))
        )
        require(
            abs(expected_score - float(row["core_score"])) < 1e-5,
            f"Figure 3 score mismatch at TSV line {row_number}",
        )

    summary = {
        "release": FREEZE_ID,
        "freeze_date": FREEZE_DATE,
        "organism": "Liriodendron hybrid",
        "reference_annotation": "Liriodendron chinense",
        "analysis_scope": {
            "samples": 15,
            "developmental_stages": 5,
            "stage_labels": ["Callus", "Globular", "Heart", "Torpedo", "Cotyledon"],
            "correlation_method": "Pearson",
            "retained_relationship_threshold": "|r| >= 0.90",
        },
        "publication_network": {
            "nodes": 167,
            "transcription_factors": 38,
            "target_genes": 129,
            "edges": 1000,
            "positive_edges": 868,
            "negative_edges": 132,
            "selection_rule": "Top 1,000 edges ranked by core_score in descending order",
            "core_score_formula": "abs(r) * sqrt(source_TF_degree * target_gene_degree)",
        },
        "files": {
            "edges": "liriodendron_figure3_edges.tsv",
            "nodes": "liriodendron_figure3_nodes.tsv",
            "gene_annotations": "liriodendron_figure3_gene_annotations.tsv",
            "node_id_mapping": "liriodendron_figure3_node_id_mapping.tsv",
        },
        "interpretation": (
            "These are coexpression relationships and must not be interpreted as "
            "experimentally validated regulatory interactions."
        ),
    }
    (out_dir / "liriodendron_figure3_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return observed


def copy_publication_figures() -> list[str]:
    out_dir = REPO / "assets" / "publication_figures"
    out_dir.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for figure_number in range(1, 7):
        for suffix in (".svg", ".pdf", ".png", ".tif"):
            name = f"Figure_{figure_number}{suffix}"
            source = FIGURE_SOURCE / name
            require(source.is_file(), f"Missing publication figure: {source}")
            target = out_dir / name
            if source.resolve() != target.resolve():
                shutil.copy2(source, target)
            copied.append(name)
    for name in (
        "Figure_5_data.tsv",
        "Figure5_DEG_count_summary.tsv",
        "Figure_6A_background_anchors.tsv",
        "Figure_6A_highlighted_loci.tsv",
        "Figure_6B_plot_data.tsv",
    ):
        source = FIGURE_SOURCE / name
        require(source.is_file(), f"Missing publication figure data: {source}")
        target = out_dir / name
        if source.resolve() != target.resolve():
            shutil.copy2(source, target)
        copied.append(name)
    return copied


def update_deg_manifest() -> None:
    path = REPO / "datasets_data" / "deg_manifest.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    matches = [row for row in data["species"] if row.get("key") == "Lc"]
    require(len(matches) == 1, "Expected exactly one Lc entry in deg_manifest.json")
    matches[0]["label"] = "Liriodendron hybrid (L. chinense reference annotation)"
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def update_index_html() -> None:
    path = REPO / "index.html"
    text = path.read_text(encoding="utf-8")
    match = re.search(
        r'(<script id="payload" type="application/json">)(.*?)(</script>)',
        text,
        flags=re.DOTALL,
    )
    require(match is not None, "Could not find embedded payload JSON")
    payload = json.loads(match.group(2))
    payload["public_sra"] = {
        "rows": [],
        "summary": {
            **EXPECTED_CATALOG,
            "rna_subset_species": EXPECTED_RNA_SUBSET["species"],
            "rna_subset_projects": EXPECTED_RNA_SUBSET["projects"],
            "source": "datasets_data/sra_datasets.json.gz",
            "embedded_fallback": False,
        },
    }
    payload["release"] = {
        "id": FREEZE_ID,
        "freeze_date": FREEZE_DATE,
        "metadata": f"release/{FREEZE_ID}/release.json",
        "changelog": f"release/{FREEZE_ID}/CHANGELOG.md",
        "checksums": f"release/{FREEZE_ID}/SHA256SUMS.txt",
    }
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    text = text[: match.start(2)] + payload_json + text[match.end(2) :]

    if ".figure-downloads{" not in text:
        text = text.replace(
            ".fig-body { padding:12px; } .fig-body h3",
            ".fig-body { padding:12px; } "
            ".figure-downloads{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}"
            ".figure-downloads a{font-size:11px;font-weight:800;color:var(--blue);"
            "text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:3px 8px}"
            ".figure-downloads a:hover{background:var(--soft-blue)} "
            ".fig-body h3",
        )
    if ".release-strip{" not in text:
        text = text.replace(
            ".hero-cta{ display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }",
            ".hero-cta{ display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }"
            "\n.release-strip{margin-top:18px;padding:12px 14px;border:1px solid rgba(255,255,255,.28);"
            "border-radius:14px;background:rgba(255,255,255,.10);color:#d9f5ec;font-size:12px;line-height:1.55}"
            "\n.release-strip strong{color:#fff}.release-strip a{color:#fff;font-weight:800}",
        )
    text = text.replace(
        '<span class="hero-eyebrow">Cross-species Somatic Embryogenesis Resource</span>',
        '<span class="hero-eyebrow">Cross-species Somatic Embryogenesis Resource · '
        'Publication freeze v2026.07</span>',
        1,
    )
    old_cta = (
        '          <button class="btn ghost" type="button" data-view="gene-family">'
        "Browse gene families</button>\n"
        "        </div>"
    )
    new_cta = (
        '          <button class="btn ghost" type="button" data-view="gene-family">'
        "Browse gene families</button>\n"
        "        </div>\n"
        '        <div class="release-strip"><strong>Publication freeze v2026.07</strong> '
        "· frozen 15 July 2026 · catalog 1,110 runs / 47 taxa / 89 BioProjects · "
        "RNA analytical subset 996 runs. "
        f'<a href="release/{FREEZE_ID}/CHANGELOG.md">Changelog</a> · '
        f'<a href="release/{FREEZE_ID}/release.json">Release metadata</a> · '
        f'<a href="release/{FREEZE_ID}/SHA256SUMS.txt">SHA-256 checksums</a></div>'
    )
    if 'class="release-strip"' not in text:
        require(old_cta in text, "Hero CTA insertion point not found")
        text = text.replace(old_cta, new_cta, 1)
    text = text.replace(
        '<div class="hero-stat"><b>30</b><span>Integrated figures</span></div>',
        '<div class="hero-stat"><b>33</b><span>Integrated figures</span></div>',
        1,
    )
    text = text.replace(
        '<div class="stat"><b>30</b><span>Integrated figures</span></div>',
        '<div class="stat"><b>33</b><span>Integrated figures</span></div>',
    )
    text = text.replace(
        "Includes the manuscript expression-specificity, coexpression-network and "
        "PsbO/OEE1 Ka/Ks figures, cross-species shared OG results, Cunninghamia "
        "lanceolata PSK results, reference-guided trends and stage plots. Click a "
        "thumbnail to enlarge it.",
        "Includes all six publication figures in vector (SVG/PDF) and 600-dpi "
        "raster (PNG/TIFF) formats, together with database exploration figures. "
        "Use the format links on each publication card to download submission-ready files.",
    )
    text = text.replace(
        "30 result figures, 10 species-level gene-search indexes",
        "33 result figures (including six publication figures), 10 species-level gene-search indexes",
    )
    path.write_text(text, encoding="utf-8")


def update_app_js() -> None:
    path = REPO / "assets" / "app.js"
    text = path.read_text(encoding="utf-8")
    push_pattern = re.compile(
        r"DB\.figures\.push\(\n.*?\n\);\nDB\.stats\.figures = DB\.figures\.length;",
        flags=re.DOTALL,
    )
    entries = [
        (
            "Figure 1. CrossSE-TED Architecture and Workflow",
            "Species coverage and the three-layer database architecture.",
        ),
        (
            "Figure 2. Expression Specificity and Core-TF Composition",
            "Four τ-based expression classes across species and core transcription-factor family composition.",
        ),
        (
            "Figure 3. Liriodendron hybrid Top-1,000 Coexpression Network",
            "Frozen 15-sample, five-stage network: 167 nodes, 38 TFs, 129 targets and 1,000 retained edges.",
        ),
        (
            "Figure 4. User Workflow and Core Functional Modules",
            "Search, comparison, candidate-prioritization, and downstream-design workflow in CrossSE-TED.",
        ),
        (
            "Figure 5. Adjacent-Stage Differential Expression",
            "DESeq2-defined upregulated and downregulated gene counts for representative angiosperm, gymnosperm, and monocot datasets, plus sample coverage.",
        ),
        (
            "Figure 6. PsbO/OEE1 Microsynteny and Ka/Ks",
            "Cross-species microsynteny and evolutionary-constraint evidence for the PsbO/OEE1 candidate family.",
        ),
    ]
    js_rows = []
    for number, (title, description) in enumerate(entries, start=1):
        base = f"assets/publication_figures/Figure_{number}"
        group = "Publication freeze v2026.07"
        data_field = (
            ',data:"assets/publication_figures/Figure5_DEG_count_summary.tsv"'
            if number == 5
            else ""
        )
        js_rows.append(
            "  {"
            f'group:{json.dumps(group)},title:{json.dumps(title)},desc:{json.dumps(description)},'
            'size:"SVG/PDF + 600-dpi PNG/TIFF",'
            f'link:"{base}.png",file:"{base}.png",vector:"{base}.svg",'
            f'pdf:"{base}.pdf",tiff:"{base}.tif"{data_field}'
            "}"
        )
    replacement = (
        "DB.figures.push(\n"
        + ",\n".join(js_rows)
        + "\n);\nDB.stats.figures = DB.figures.length;"
    )
    if 'group:"Publication freeze v2026.07"' not in text:
        text, count = push_pattern.subn(lambda _: replacement, text, count=1)
        require(count == 1, "Could not replace publication-figure gallery entries")

    old_render = (
        '    <img src="${x.link}" alt="${x.title}" loading="lazy"><div class="fig-body">'
        "<h3>${x.title}</h3><p>${x.desc}</p><div class=\"tags\" style=\"margin-top:8px\">"
        '<span class="tag">${x.group}</span><span class="tag">${x.size}</span></div></div>\n'
        "  </article>`).join(\"\");\n"
        '  document.querySelectorAll(".figure-card").forEach(card => '
        'card.addEventListener("click", () => openFigure(Number(card.dataset.i))));'
    )
    new_render = (
        '    <img src="${x.link}" alt="${x.title}" loading="lazy"><div class="fig-body">'
        "<h3>${x.title}</h3><p>${x.desc}</p><div class=\"tags\" style=\"margin-top:8px\">"
        '<span class="tag">${x.group}</span><span class="tag">${x.size}</span></div>'
        '${x.vector ? `<div class="figure-downloads">'
        '<a href="${x.vector}" download>SVG</a><a href="${x.pdf}" download>PDF</a>'
        '<a href="${x.link}" download>PNG · 600 dpi</a><a href="${x.tiff}" download>TIFF · 600 dpi</a>'
        '${x.data ? `<a href="${x.data}" download>Source TSV</a>` : ``}'
        "</div>` : ``}</div>\n"
        "  </article>`).join(\"\");\n"
        '  document.querySelectorAll(".figure-card").forEach(card => '
        'card.addEventListener("click", (event) => { if (event.target.closest("a")) return; '
        "openFigure(Number(card.dataset.i)); }));"
    )
    if "PNG · 600 dpi" not in text:
        require(old_render in text, "Figure-card rendering block not found")
        text = text.replace(old_render, new_render, 1)
    text = text.replace(
        'desc:"30 integrated result figures, including expression-specificity, coexpression and Ka/Ks results."',
        'desc:"33 integrated result figures, including all six frozen publication figures in vector and 600-dpi raster formats."',
    )
    text = text.replace(
        'Curated catalog not loaded (showing built-in data). Open via a local server or GitHub Pages to load datasets_data/sra_datasets.json.gz. ',
        'Curated catalog not loaded. No run-level fallback is embedded in the page; open via a local server or GitHub Pages to load the authoritative datasets_data/sra_datasets.json.gz file. ',
    )
    path.write_text(text, encoding="utf-8")


def write_release_files(
    catalog_sha: str, copied_figure_files: list[str], figure3_summary: dict
) -> None:
    release_dir = REPO / "release" / FREEZE_ID
    release_dir.mkdir(parents=True, exist_ok=True)
    release = {
        "release_id": FREEZE_ID,
        "status": "publication freeze",
        "freeze_date": FREEZE_DATE,
        "prepared_on": "2026-07-30",
        "catalog": {
            "all_curated_records": {
                "runs": 1110,
                "taxonomic_labels": 47,
                "bioprojects": 89,
                "library_strategies": 4,
                "total_size_gb": 2445.4,
                "file": "../../datasets_data/sra_datasets.json.gz",
                "sha256": catalog_sha,
            },
            "rna_seq_analytical_subset": {
                "runs": 996,
                "taxonomic_labels": 45,
                "bioprojects": 79,
            },
        },
        "expression_query": EXPECTED_EXPRESSION_QUERY,
        "ui_index": EXPECTED_UI,
        "publication_figures": {
            "count": 6,
            "formats": ["SVG", "PDF", "PNG (600 dpi)", "TIFF (600 dpi)"],
            "directory": "../../assets/publication_figures",
            "files": copied_figure_files,
        },
        "figure3_frozen_network": figure3_summary,
        "notes": [
            "The run-level SRA catalog is loaded from the external compressed JSON; no stale run-level fallback is embedded in index.html.",
            "Liriodendron experimental samples are labeled as Liriodendron hybrid; L. chinense is retained only as the reference annotation label.",
            "Coexpression relationships are associative and are not experimentally validated regulatory interactions.",
        ],
        "checksum_manifest": "SHA256SUMS.txt",
    }
    release_path = release_dir / "release.json"
    release_path.write_text(
        json.dumps(release, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    changelog = f"""# CrossSE-TED publication freeze {FREEZE_ID}

Freeze date: **15 July 2026**

## Frozen content

- Curated public catalog: **1,110 runs, 47 taxonomic labels, 89 BioProjects, 4 library strategies** (2,445.4 GB).
- RNA-seq analytical subset: **996 runs, 45 taxonomic labels, 79 BioProjects**.
- Expression-query collection: **10 taxa and 239 sample columns**.
- User-interface index: **11 species/datasets, 72 matrices, and 1,387 sample columns**.
- Six manuscript figures in SVG, PDF, 600-dpi PNG, and 600-dpi TIFF formats.

## Corrections and reproducibility additions

- Removed the obsolete 1,144-row embedded `public_sra` fallback, including corrupted duplicated records. The browser now loads the authoritative `datasets_data/sra_datasets.json.gz` catalog, while the embedded fallback contains summary metadata only.
- Clarified the differential-expression label as **Liriodendron hybrid (L. chinense reference annotation)**.
- Added frozen Figure 3 node/edge/source tables. The publication network comprises 167 nodes (38 transcription factors and 129 target genes) and 1,000 edges (868 positive and 132 negative), selected by `abs(r) * sqrt(source_TF_degree * target_gene_degree)` from 15 samples spanning five stages.
- Added a machine-generated Figure 5 DEG count summary with contrast direction, per-group sample sizes, software versions, thresholds, counts, and source payloads; also added Figure 6 source tables and direct download links for all publication-quality figure formats.
- Added this machine-readable release record and SHA-256 checksum manifest.

## Scope note

The 1,110-run catalog is the complete curated public-data catalog and contains four library strategies. The 996-run subset is the RNA-seq subset used for the analytical inventory. Coexpression relationships are associative and must not be interpreted as experimentally validated regulatory interactions.
"""
    (release_dir / "CHANGELOG.md").write_text(changelog, encoding="utf-8")

    checksum_candidates = [
        REPO / "index.html",
        REPO / "assets" / "app.js",
        REPO / "datasets_data" / "sra_datasets.json.gz",
        REPO / "datasets_data" / "deg_manifest.json",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.tsv",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.csv",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.xlsx",
        REPO / "datasets_data" / "psbo_oee1" / "members.tsv",
        REPO / "datasets_data" / "psbo_oee1" / "pairwise_kaks.tsv",
        REPO / "datasets_data" / "psbo_oee1" / "summary.json",
        release_path,
        release_dir / "CHANGELOG.md",
    ]
    checksum_candidates.extend(
        sorted((REPO / "datasets_data" / "coexpression").glob("*"))
    )
    checksum_candidates.extend(
        sorted((REPO / "assets" / "publication_figures").glob("*"))
    )
    lines = []
    for path in sorted(set(checksum_candidates), key=lambda item: item.as_posix()):
        require(path.is_file(), f"Checksum target is missing: {path}")
        relative = path.relative_to(REPO).as_posix()
        lines.append(f"{sha256(path)}  {relative}")
    (release_dir / "SHA256SUMS.txt").write_text(
        "\n".join(lines) + "\n",
        encoding="ascii",
    )


def main() -> None:
    catalog = load_authoritative_catalog()
    figure3 = synchronize_figure3_sources()
    copied = copy_publication_figures()
    update_deg_manifest()
    update_index_html()
    update_app_js()
    require(
        sha256(REPO / "datasets_data" / "sra_datasets.json.gz") == catalog["sha256"],
        "Authoritative SRA catalog was modified",
    )
    write_release_files(catalog["sha256"], copied, figure3)
    print(
        json.dumps(
            {
                "release": FREEZE_ID,
                "sra_catalog_sha256": catalog["sha256"],
                "publication_files": len(copied),
                "figure3": figure3,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
