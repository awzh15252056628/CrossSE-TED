#!/usr/bin/env python3
"""Synchronize CrossSE-TED v2026.07 to the manuscript's single RNA-seq scope."""

from __future__ import annotations

import csv
import gzip
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RELEASE_ID = "v2026.07"
RELEASE_DATE = "2026-07-15"
CATALOG_TSV = REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.tsv"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_catalog() -> tuple[list[str], list[dict[str, str]], dict[str, object]]:
    with CATALOG_TSV.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        rows = list(reader)
        columns = list(reader.fieldnames or [])
    require(len(rows) == 1097, f"Expected 1,097 RNA-seq runs, found {len(rows)}")
    require(all(row["LibraryStrategy"] == "RNA-Seq" for row in rows), "Non-RNA-seq records remain")
    require(len({row["Run"] for row in rows}) == 1097, "Duplicate Run accessions remain")
    projects = {row["BioProject"] for row in rows if row["BioProject"]}
    taxa = {row["ScientificName"] for row in rows if row["ScientificName"]}
    require(len(projects) == 82, f"Expected 82 BioProjects, found {len(projects)}")
    require(len(taxa) == 46, f"Expected 46 taxonomic labels, found {len(taxa)}")
    require("plant metagenome" not in taxa, "Unresolved plant metagenome label remains")
    require({"PRJNA862291", "PRJEB72619", "PRJNA347903", "PRJNA980588"} <= projects,
            "One or more core expression projects are absent")
    for number, row in enumerate(rows, start=1):
        row["No."] = str(number)
    total_size_gb = round(sum(float(row.get("size_MB") or 0) for row in rows) / 1024, 1)
    counts = {
        "runs": 1097,
        "species": 46,
        "projects": 82,
        "strategies": 1,
        "rna_seq_only": 1097,
        "total_size_gb": total_size_gb,
    }
    return columns, rows, counts


def write_catalog(columns: list[str], rows: list[dict[str, str]], counts: dict[str, object]) -> None:
    for path, delimiter in [
        (CATALOG_TSV, "\t"),
        (REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.csv", ","),
    ]:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns, delimiter=delimiter, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
    key_idx = {
        "run": columns.index("Run"),
        "species": columns.index("ScientificName"),
        "project": columns.index("BioProject"),
        "strategy": columns.index("LibraryStrategy"),
        "size_mb": columns.index("size_MB"),
    }
    payload = {
        "generated": "2026-08-02",
        "source": CATALOG_TSV.name,
        "note": "Publication-associated RNA-seq catalog; one valid record per Run accession.",
        "counts": counts,
        "columns": columns,
        "keyIdx": key_idx,
        "rows": [[row.get(column, "") for column in columns] for row in rows],
    }
    with gzip.open(REPO / "datasets_data" / "sra_datasets.json.gz", "wt", encoding="utf-8", newline="") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))


def expression_payload() -> tuple[list[dict[str, object]], list[dict[str, object]], dict[str, int]]:
    index = json.loads((REPO / "expression_data" / "index.json").read_text(encoding="utf-8"))
    species_index = index["species"]
    require(len(species_index) == 10, "Expression index must contain 10 taxa")
    old_text = (REPO / "index.html").read_text(encoding="utf-8")
    match = re.search(r'<script id="payload" type="application/json">(.*?)</script>', old_text, re.S)
    require(match is not None, "Embedded payload not found")
    old_payload = json.loads(match.group(1))
    old_species = {row["species"]: row for row in old_payload["species"]}
    id_map = {"Liriodendron_hybrid": "Liriodendron_chinense", "Hippeastrum_sp": "Hippeastrum"}
    species_rows: list[dict[str, object]] = []
    matrix_rows: list[dict[str, object]] = []
    sample_total = 0
    counter = 1
    for item in species_index:
        species_id = id_map.get(item["id"], item["id"])
        require(species_id in old_species, f"Missing species metadata for {species_id}")
        meta = dict(old_species[species_id])
        metrics = item["metrics"]
        sample_counts = {metric: len(info["samples"]) for metric, info in metrics.items()}
        require(len(set(sample_counts.values())) == 1, f"Metric sample mismatch for {item['id']}")
        sample_count = next(iter(sample_counts.values()))
        sample_total += sample_count
        meta["matrix_count"] = len(metrics)
        meta["data_types"] = {metric: 1 for metric in metrics}
        meta["max_columns"] = sample_count
        meta["supplementary_count"] = 0
        species_rows.append(meta)
        for metric in ("fpkm", "cpm", "readcount"):
            info = metrics[metric]
            matrix_rows.append({
                "id": f"E{counter:03d}",
                "species": species_id,
                "species_cn": meta["cn"],
                "latin": "",
                "abbr": meta["abbr"],
                "data_type": metric,
                "columns": len(info["samples"]),
                "matched": len(info["samples"]),
                "unmatched": 0,
                "file": info["file"],
                "size": f"{int(info['gzBytes']) / 1024 / 1024:.1f} MB",
                "stages": sorted({re.sub(r"[_-]?\d+$", "", sample) for sample in info["samples"]}),
                "source_path": "expression_data",
                "link": f"expression_data/{info['file']}",
            })
            counter += 1
    require(len(matrix_rows) == 30, "Expression payload must contain 30 matrices")
    require(sample_total == 239, f"Expression sample total mismatch: {sample_total}")
    return species_rows, matrix_rows, {"species": 10, "matrices": 30, "samples": 239}


def update_index(counts: dict[str, object]) -> None:
    path = REPO / "index.html"
    text = path.read_text(encoding="utf-8")
    match = re.search(r'(<script id="payload" type="application/json">)(.*?)(</script>)', text, re.S)
    require(match is not None, "Embedded payload not found")
    payload = json.loads(match.group(2))
    species_rows, matrix_rows, expression_counts = expression_payload()
    payload["species"] = species_rows
    payload["expression"] = matrix_rows
    payload["stats"]["species"] = expression_counts["species"]
    payload["stats"]["matrices"] = expression_counts["matrices"]
    payload["stats"]["samples"] = expression_counts["samples"]
    payload["public_sra"] = {
        "rows": [],
        "summary": {
            **counts,
            "source": "datasets_data/sra_datasets.json.gz",
            "embedded_fallback": False,
        },
    }
    payload["release"] = {
        "id": RELEASE_ID,
        "freeze_date": RELEASE_DATE,
        "metadata": f"release/{RELEASE_ID}/release.json",
        "changelog": f"release/{RELEASE_ID}/CHANGELOG.md",
        "checksums": f"release/{RELEASE_ID}/SHA256SUMS.txt",
    }
    text = text[:match.start(2)] + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + text[match.end(2):]
    text = re.sub(
        r'<span class="hero-eyebrow">.*?</span>',
        '<span class="hero-eyebrow">Cross-species Somatic Embryogenesis Resource · Publication-associated release v2026.07</span>',
        text,
        count=1,
    )
    text = re.sub(
        r'<div class="release-strip">.*?</div>',
        '<div class="release-strip"><strong>Publication-associated release v2026.07</strong> · RNA-seq catalog 1,097 runs / 46 taxonomic labels / 82 BioProjects · expression query 10 taxa / 30 matrices / 239 sample columns. '
        '<a href="supplementary_tables/Supplementary_Tables_S1-S7_revised.xlsx">Supplementary Tables S1–S7</a> · '
        '<a href="release/v2026.07/CHANGELOG.md">Changelog</a> · <a href="release/v2026.07/release.json">Release metadata</a> · '
        '<a href="release/v2026.07/SHA256SUMS.txt">SHA-256 checksums</a></div>',
        text,
        count=1,
        flags=re.S,
    )
    text = text.replace("Includes all six publication figures", "Includes all five publication figures")
    text = text.replace("including six publication figures", "including five publication figures")
    path.write_text(text, encoding="utf-8")


def update_app() -> None:
    path = REPO / "assets" / "app.js"
    text = path.read_text(encoding="utf-8")
    entries = [
        ("Figure 1. CrossSE-TED Architecture and Workflow", "Species coverage and the three-layer database architecture."),
        ("Figure 2. Expression Specificity and Core-TF Composition", "Four τ-based expression classes across species and core transcription-factor family composition."),
        ("Figure 3. Liriodendron hybrid Top-1,000 Coexpression Network", "Frozen 15-sample, five-stage network: 167 nodes, 38 TFs, 129 targets and 1,000 retained edges."),
        ("Figure 4. User Workflow and Core Functional Modules", "Search, comparison, candidate-prioritization, and downstream-design workflow in CrossSE-TED."),
        ("Figure 5. PsbO/OEE1 Microsynteny and Ka/Ks", "Cross-species microsynteny and evolutionary-constraint evidence for the PsbO/OEE1 candidate family."),
    ]
    rows = []
    for number, (title, description) in enumerate(entries, start=1):
        base = f"assets/publication_figures/Figure_{number}"
        data = ',data:"assets/publication_figures/Figure_5B_plot_data.tsv"' if number == 5 else ""
        rows.append(
            "  {"
            f'group:"Publication-associated release v2026.07",title:{json.dumps(title)},desc:{json.dumps(description)},'
            'size:"SVG/PDF + 600-dpi PNG/TIFF",'
            f'link:"{base}.png",file:"{base}.png",vector:"{base}.svg",pdf:"{base}.pdf",tiff:"{base}.tif"{data}'
            "}"
        )
    replacement = "DB.figures.push(\n" + ",\n".join(rows) + "\n);\nDB.stats.figures = DB.figures.length;"
    text, count = re.subn(
        r"DB\.figures\.push\(\n.*?\n\);\nDB\.stats\.figures = DB\.figures\.length;",
        lambda _match: replacement,
        text,
        count=1,
        flags=re.S,
    )
    require(count == 1, "Publication gallery block not replaced")
    text = text.replace("including all six frozen publication figures", "including all five publication-associated figures")
    path.write_text(text, encoding="utf-8")


def write_release(counts: dict[str, object]) -> None:
    release_dir = REPO / "release" / RELEASE_ID
    figure_files = sorted(path.name for path in (REPO / "assets" / "publication_figures").iterdir() if path.is_file())
    release = {
        "release_id": RELEASE_ID,
        "status": "publication-associated release",
        "freeze_date": RELEASE_DATE,
        "updated_on": "2026-08-02",
        "catalog": {
            "rna_seq_records": {
                "runs": 1097,
                "taxonomic_labels": 46,
                "bioprojects": 82,
                "library_strategy": "RNA-Seq",
                "total_size_gb": counts["total_size_gb"],
                "file": "../../datasets_data/sra_datasets.json.gz",
                "sha256": sha256(REPO / "datasets_data" / "sra_datasets.json.gz"),
            }
        },
        "expression_query": {"taxa": 10, "matrices": 30, "sample_columns": 239,
                             "matrix_manifest": "../../expression_data/core_30_matrix_manifest.tsv"},
        "publication_figures": {
            "count": 5,
            "formats": ["SVG", "PDF", "PNG (600 dpi)", "TIFF (600 dpi)"],
            "directory": "../../assets/publication_figures",
            "files": figure_files,
        },
        "supplementary_tables": {
            "workbook": "../../supplementary_tables/Supplementary_Tables_S1-S7_revised.xlsx",
            "S5_DEG_contrasts": 24,
            "S5_sample_columns": 239,
        },
        "notes": [
            "All database-scale counts use one deduplicated RNA-seq reporting scope that includes the four core expression projects.",
            "PRJNA972435 was excluded because its ScientificName is the unresolved label plant metagenome.",
            "Picea abies exon-feature DEG results are withheld pending a gene-level rerun.",
            "The DEG threshold is padj < 0.05 and |log2FoldChange| >= 1.",
            "Liriodendron experimental samples are labeled as Liriodendron hybrid; L. chinense is retained only as the reference annotation label.",
            "Coexpression relationships are associative and are not experimentally validated regulatory interactions.",
        ],
        "checksum_manifest": "SHA256SUMS.txt",
    }
    (release_dir / "release.json").write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    changelog = """# CrossSE-TED publication-associated release v2026.07

Release date: **15 July 2026**  
Scope reconciliation: **2 August 2026**

## Unified reporting scope

- RNA-seq catalog: **1,097 unique runs, 46 exact NCBI ScientificName labels, and 82 BioProjects**.
- Expression-query collection: **10 taxa, 30 downloadable matrices, and 239 unique sample columns**.
- Five manuscript figures in SVG, PDF, 600-dpi PNG, and 600-dpi TIFF formats.
- Supplementary Tables S1–S7, including 24 gene-level adjacent-stage DEG contrasts and the 239-column coverage table.

## Reconciliation changes

- Removed 114 records belonging to ncRNA-Seq, miRNA-Seq, or FL-cDNA from the manuscript-associated catalog; the source archive outside this repository remains unchanged.
- Removed the obsolete differential-expression Figure 5 from the manuscript gallery and moved its numerical content to Supplementary Table S5.
- Renumbered the PsbO/OEE1 microsynteny and Ka/Ks figure from Figure 6 to Figure 5.
- Rebuilt checksums and validation rules around the unified manuscript, supplementary-material, and website scope.

Coexpression relationships are associative and must not be interpreted as experimentally validated regulatory interactions.
"""
    (release_dir / "CHANGELOG.md").write_text(changelog, encoding="utf-8")


def write_checksums() -> None:
    release_dir = REPO / "release" / RELEASE_ID
    candidates = [
        REPO / "index.html",
        REPO / "assets" / "app.js",
        REPO / "datasets_data" / "sra_datasets.json.gz",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.tsv",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.csv",
        REPO / "datasets_data" / "Table_S1_CrossSE-TED_all_RNAseq_datasets.xlsx",
        REPO / "datasets_data" / "deg_manifest.json",
        REPO / "datasets_data" / "Picea_DEG_WITHHELD_README.txt",
        REPO / "expression_data" / "core_30_matrix_manifest.tsv",
        REPO / "supplementary_tables" / "Supplementary_Tables_S1-S7_revised.xlsx",
        REPO / "supplementary_tables" / "S5A_DEG_counts.tsv",
        REPO / "supplementary_tables" / "S5B_Sample_coverage.tsv",
        release_dir / "release.json",
        release_dir / "CHANGELOG.md",
    ]
    candidates.extend(sorted((REPO / "datasets_data" / "coexpression").glob("*")))
    candidates.extend(sorted((REPO / "datasets_data" / "psbo_oee1").glob("*")))
    candidates.extend(sorted((REPO / "assets" / "publication_figures").glob("*")))
    lines = []
    for path in sorted(set(candidates), key=lambda value: value.as_posix()):
        require(path.is_file(), f"Checksum target missing: {path}")
        lines.append(f"{sha256(path)}  {path.relative_to(REPO).as_posix()}")
    (release_dir / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="ascii")


def main() -> None:
    columns, rows, counts = load_catalog()
    write_catalog(columns, rows, counts)
    update_index(counts)
    update_app()
    write_release(counts)
    write_checksums()
    print(json.dumps({"status": "synchronized", "catalog": counts, "expression_query": {"taxa": 10, "matrices": 30, "sample_columns": 239}, "figures": 5}, indent=2))


if __name__ == "__main__":
    main()
