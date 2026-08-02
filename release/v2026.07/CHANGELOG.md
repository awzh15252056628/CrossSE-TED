# CrossSE-TED publication-associated release v2026.07

Release date: **15 July 2026**  
Scope reconciliation: **2 August 2026**

## Unified reporting scope

- RNA-seq catalog: **1,097 unique runs, 46 exact NCBI ScientificName labels, and 82 BioProjects**.
- Expression-query collection: **10 taxa, 30 downloadable matrices, and 239 unique sample columns**.
- Five manuscript figures in SVG, PDF, 600-dpi PNG, and 600-dpi TIFF formats.
- Supplementary Tables S1–S7, including 24 gene-level adjacent-stage DEG contrasts from six taxa, the 239-column coverage table, the 30-matrix checksum manifest, and the catalog audit.

## Reconciliation changes

- Removed 114 records belonging to ncRNA-Seq, miRNA-Seq, or FL-cDNA from the manuscript-associated catalog; the source archive outside this repository remains unchanged.
- Added the four core expression projects previously absent from the catalog: PRJNA862291, PRJEB72619, PRJNA347903, and PRJNA980588.
- Excluded the three PRJNA972435 records labeled only as `plant metagenome` because the actual plant species could not be verified from public metadata.
- Withheld the Picea abies exon-feature DEG payload and removed its feature-level counts from the reported DEG set pending a gene-level DESeq2 rerun.
- Unified the DEG rule as `padj < 0.05` and `|log2FoldChange| ≥ 1` in the manuscript, supplementary files, and website.
- Removed the obsolete differential-expression Figure 5 from the manuscript gallery and moved its numerical content to Supplementary Table S5.
- Renumbered the PsbO/OEE1 microsynteny and Ka/Ks figure from Figure 6 to Figure 5.
- Rebuilt checksums and validation rules around the unified manuscript, supplementary-material, and website scope.

Coexpression relationships are associative and must not be interpreted as experimentally validated regulatory interactions.
