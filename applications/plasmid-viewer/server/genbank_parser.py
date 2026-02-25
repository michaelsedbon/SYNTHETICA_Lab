"""Parse GenBank files using BioPython and convert to our internal format."""

from Bio import SeqIO
from io import StringIO

# Default color palette by feature type (syn bio conventions)
FEATURE_COLORS = {
    "CDS":              "#4A90D9",   # blue
    "gene":             "#4A90D9",   # blue
    "promoter":         "#5CB85C",   # green
    "terminator":       "#D9534F",   # red
    "RBS":              "#F0AD4E",   # orange
    "rep_origin":       "#9B59B6",   # purple
    "ori":              "#9B59B6",   # purple
    "primer_bind":      "#1ABC9C",   # teal
    "misc_feature":     "#95A5A6",   # gray
    "regulatory":       "#E67E22",   # dark orange
    "sig_peptide":      "#3498DB",   # light blue
    "misc_binding":     "#16A085",   # dark teal
    "protein_bind":     "#8E44AD",   # dark purple
    "source":           "#BDC3C7",   # light gray
    "5'UTR":            "#27AE60",   # dark green
    "3'UTR":            "#C0392B",   # dark red
}

DEFAULT_COLOR = "#95A5A6"


def parse_genbank(content: str) -> dict:
    """Parse a GenBank format string and return structured data.

    Returns:
        {
            "name": str,
            "description": str,
            "sequence": str,
            "topology": "circular" | "linear",
            "length": int,
            "organism": str,
            "features": [
                {
                    "type": str,
                    "label": str,
                    "start": int,      # 0-based
                    "end": int,        # exclusive
                    "strand": 1 | -1,
                    "color": str,
                    "qualifiers": dict,
                }
            ]
        }
    """
    handle = StringIO(content)
    record = SeqIO.read(handle, "genbank")

    # Determine topology
    topology = "linear"
    if hasattr(record, "annotations"):
        topo = record.annotations.get("topology", "")
        if topo.lower() == "circular":
            topology = "circular"

    # Extract organism
    organism = ""
    if hasattr(record, "annotations"):
        organism = record.annotations.get("organism", "")

    # Extract features
    features = []
    for feat in record.features:
        if feat.type == "source":
            continue  # Skip the source feature (whole sequence)

        # Get label from qualifiers
        label = ""
        for key in ("label", "gene", "product", "note", "locus_tag"):
            vals = feat.qualifiers.get(key, [])
            if vals:
                label = vals[0]
                break

        # Get color if specified in qualifiers (ApE / SnapGene convention)
        color = FEATURE_COLORS.get(feat.type, DEFAULT_COLOR)
        for key in ("ApEinfo_fwdcolor", "color", "colour"):
            vals = feat.qualifiers.get(key, [])
            if vals:
                color = vals[0]
                break

        # Clean qualifiers — flatten single-item lists
        qualifiers = {}
        for k, v in feat.qualifiers.items():
            if k.startswith("ApEinfo_"):
                continue  # Skip ApE internal metadata
            qualifiers[k] = v[0] if len(v) == 1 else v

        strand = 1 if feat.location.strand is None or feat.location.strand >= 0 else -1

        features.append({
            "type": feat.type,
            "label": label,
            "start": int(feat.location.start),
            "end": int(feat.location.end),
            "strand": strand,
            "color": color,
            "qualifiers": qualifiers,
        })

    return {
        "name": record.name,
        "description": record.description,
        "sequence": str(record.seq),
        "topology": topology,
        "length": len(record.seq),
        "organism": organism,
        "features": features,
    }
