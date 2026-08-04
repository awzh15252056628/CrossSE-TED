#!/usr/bin/env python3
"""Construct the operational one-to-one orthogroup set from OrthoFinder Orthogroups.tsv.

Retention rule:
- The table must contain one Orthogroup column and seven species columns.
- A row is retained only when every species cell contains exactly one non-empty
  member after splitting comma-delimited entries.
- The output is an operational one-to-one set defined directly from
  Orthogroups.tsv; it is not described as OrthoFinder's generated single-copy set.

Optional:
- Supply --official-single-copy-list to add a yes/no membership flag and to
  produce a set-comparison audit. The list should contain one orthogroup ID per line.
"""

from __future__ import annotations
import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def split_members(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def read_official_ids(path: Path | None) -> set[str]:
    if path is None:
        return set()
    ids = set()
    with path.open("r", encoding="utf-8-sig") as fh:
        for line in fh:
            value = line.strip().split("\t")[0]
            if value and value.lower() != "orthogroup":
                ids.add(value)
    return ids


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("orthogroups_tsv", type=Path)
    parser.add_argument("output_tsv", type=Path)
    parser.add_argument("--official-single-copy-list", type=Path)
    parser.add_argument("--audit-json", type=Path)
    args = parser.parse_args()

    official_ids = read_official_ids(args.official_single_copy_list)

    with args.orthogroups_tsv.open("r", encoding="utf-8-sig", newline="") as src:
        reader = csv.DictReader(src, delimiter="\t")
        if not reader.fieldnames or reader.fieldnames[0] != "Orthogroup":
            raise ValueError("The first column must be Orthogroup.")
        species_columns = reader.fieldnames[1:]
        if len(species_columns) != 7:
            raise ValueError(f"Expected seven species columns, found {len(species_columns)}.")

        retained = []
        for row in reader:
            counts = {col: len(split_members(row.get(col, ""))) for col in species_columns}
            if all(counts[col] == 1 for col in species_columns):
                out = {
                    "Orthogroup": row["Orthogroup"],
                    "set_definition": "exactly_one_member_in_each_of_7_species_in_current_Orthogroups.tsv",
                    "in_official_single_copy_505": (
                        "yes" if official_ids and row["Orthogroup"] in official_ids
                        else "no" if official_ids
                        else "not_assessed"
                    ),
                }
                out.update({col: split_members(row[col])[0] for col in species_columns})
                retained.append(out)

    fieldnames = [
        "Orthogroup",
        "set_definition",
        "in_official_single_copy_505",
        *species_columns,
    ]
    args.output_tsv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_tsv.open("w", encoding="utf-8", newline="") as dst:
        writer = csv.DictWriter(dst, fieldnames=fieldnames, delimiter="\t")
        writer.writeheader()
        writer.writerows(retained)

    audit = {
        "orthogroups_tsv": str(args.orthogroups_tsv),
        "orthogroups_tsv_sha256": sha256(args.orthogroups_tsv),
        "species_columns": species_columns,
        "retention_rule": "exactly one non-empty member in every one of seven species columns",
        "n_operational_one_to_one_orthogroups": len(retained),
        "official_single_copy_list_supplied": bool(official_ids),
    }
    if official_ids:
        operational_ids = {row["Orthogroup"] for row in retained}
        audit.update({
            "n_official_single_copy_ids": len(official_ids),
            "n_intersection": len(operational_ids & official_ids),
            "n_operational_only": len(operational_ids - official_ids),
            "n_official_only": len(official_ids - operational_ids),
        })
    if args.audit_json:
        args.audit_json.write_text(json.dumps(audit, indent=2), encoding="utf-8")

    if len(retained) != 504:
        raise RuntimeError(f"Expected 504 retained orthogroups, obtained {len(retained)}.")

    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
