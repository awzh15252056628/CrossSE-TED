# Operational one-to-one orthogroup audit

## Primary definition

The database set is reconstructed directly from `Orthogroups.tsv`. A row is retained only when all seven species columns contain exactly one non-empty member. This creates 504 operational one-to-one orthogroups.

The operational set is not referred to as OrthoFinder's generated single-copy set.

## Reproducibility

Run:

```bash
python filter_operational_one_to_one_orthogroups.py \
  Orthogroups.tsv \
  reconstructed_operational_504.tsv \
  --audit-json reconstructed_operational_504.audit.json
```

When the archived `Orthogroups_SingleCopyOrthologues.txt` file is available, add:

```bash
  --official-single-copy-list Orthogroups_SingleCopyOrthologues.txt
```

The script verifies that the explicit filtering rule yields 504 rows.

## Archived set-comparison result

The archived audit reports:
- 505 identifiers in the archived OrthoFinder single-copy list;
- 504 rows satisfying the explicit one-member-in-each-of-seven-species rule;
- 200 identifiers in the intersection;
- 305 archived-list-only identifiers;
- 304 operational-set-only identifiers.

The 504 operational rows, not the 505-identifier list, are used for CrossSE-TED queries and cross-species comparisons.

## Source completeness note

The current package contains the archived `Orthogroups.tsv`, the 504-member table, and the audit count summary. The original 505-ID text file and the post-processing log mentioned in the reviewer response were not among the newly uploaded source files. They should be deposited in the long-term archival repository if the journal requests direct ID-level verification of the 305 archived-list-only entries or the reported `IndexError`.
