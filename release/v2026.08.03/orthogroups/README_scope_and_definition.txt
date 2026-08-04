Supplementary File 1 scope and definition

This archive contains the 504-member operational one-to-one orthogroup set used by CrossSE-TED for database queries and cross-species comparisons.

Construction rule
After retaining the longest protein isoform per gene and assigning species-prefixed identifiers, OrthoFinder v3.1.2 was applied to seven reference protein sets. The operational set was then constructed directly from the archived Orthogroups.tsv table. A row was retained only when each of the seven species columns contained exactly one non-empty member. This explicit, reproducible rule yielded 504 orthogroups.

Terminology
The 504-member set is termed the "operational one-to-one orthogroup set." It is not described as the OrthoFinder-generated single-copy set.

Seven reference gene sets
- Castanea mollissima
- Cunninghamia lanceolata
- Liquidambar formosana
- Liriodendron chinense
- Picea abies
- Quercus suber
- Vitis vinifera

Contents
- Supplementary_File_1_504_operational_1to1_orthogroups.tsv: complete 504-group membership table.
- Supplementary_File_1_504_operational_1to1_orthogroups.xlsx: spreadsheet version of the membership table.
- operational_set_validation_summary.json: validation result for the explicit seven-column filtering rule.
- audit_source_files/Orthogroups.tsv: archived flat OrthoFinder orthogroup table used for reconstruction.
- audit_source_files/filter_operational_one_to_one_orthogroups.py: reproducible standard-library filtering script.
- audit_source_files/set_comparison_audit_summary.tsv: comparison summary for the operational 504-member set and archived 505-identifier list.
- audit_source_files/SOURCE_FILE_SHA256SUMS.txt: SHA-256 checksums for the source and audit files.

Set comparison
The archived audit reports 505 identifiers in Orthogroups_SingleCopyOrthologues.txt and an intersection of 200 with the 504 operational groups. Thus, 305 identifiers were unique to the archived list and 304 groups were unique to the explicit one-member-per-species set. These counts are provided for audit purposes only and do not change the set used by the database.

Numbering note
This archive is Supplementary File 1 in the current continuous numbering. It was Supplementary File 3 in an earlier draft.

Liriodendron chinense reference identifiers were used to annotate the Liriodendron hybrid transcriptome dataset.
