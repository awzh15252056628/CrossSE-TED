Liriodendron core top-1000 Cytoscape export with explicit original gene IDs

No Pearson correlations were recalculated. The 1,000-edge table was copied byte-for-byte
from the validated 2026-07-13 result.

FILES
1. Liriodendron_core_top1000_nodes_with_original_gene_id.tsv
   Complete Cytoscape node attribute table (167 rows).
2. Liriodendron_core_top1000_node_id_mapping.tsv
   Compact ID and label mapping table.
3. Liriodendron_core_top1000_geneID_annotation_explicit.tsv
   Gene ID and annotation table with explicit ID columns.
4. Liriodendron_core_top1000_edges.tsv
   Original 1,000-edge Cytoscape edge table, unchanged.

GENE ID COLUMNS
- id: Cytoscape node-table primary key.
- gene_id: explicit copy of the original Lchi gene ID.
- original_gene_id: explicit copy of the original Lchi gene ID.
- display_label: TF standardized name plus original gene ID; target nodes use the original gene ID.

CYTOSCAPE IMPORT
1. Import Liriodendron_core_top1000_edges.tsv as a network using source and target.
2. Import Liriodendron_core_top1000_nodes_with_original_gene_id.tsv into the Node Table.
3. Match the file column id to the network node key (name/shared name, depending on Cytoscape version).
4. Map Node Label to display_label, or to original_gene_id if only raw gene IDs are desired.
5. Map Node Fill Color to color_hex using Passthrough Mapping.
