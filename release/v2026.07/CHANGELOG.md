# CrossSE-TED publication freeze v2026.07

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
