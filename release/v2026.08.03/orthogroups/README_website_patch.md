# CrossSE-TED website orthogroup-definition patch

The website source was not included in the uploaded materials, so this directory provides the exact content changes to apply.

## Required terminology

Replace any wording that calls the database 504-group set:
- "strict single-copy orthogroups"
- "OrthoFinder-generated single-copy orthogroups"
- "505 single-copy orthogroups, of which 504 were retained"

with:
- "504 operational one-to-one orthogroups"

## Required method/help text

For database queries and cross-species comparisons, the operational one-to-one orthogroup set was constructed directly from the archived Orthogroups.tsv file. A row was retained only when each of the seven species columns contained exactly one non-empty member. This reproducible filtering rule yielded 504 operational one-to-one orthogroups. The set is not described as the OrthoFinder-generated single-copy set.

## Required result/summary text

The ortholog-comparison module contains 504 operational one-to-one orthogroups, each comprising exactly one member from each of seven reference gene sets.

## Data file

Use:
`Supplementary_File_1_504_operational_1to1_orthogroups.tsv`

## Audit/download links to expose

- complete 504-member membership table;
- archived Orthogroups.tsv;
- reproducible filtering script;
- source-file SHA-256 checksums;
- set-comparison audit summary.

After deployment, update the release change log and recalculate any website-hosted checksums.
