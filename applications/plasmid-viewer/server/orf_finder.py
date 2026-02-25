from __future__ import annotations
"""ORF detection across all 6 reading frames."""

from Bio.Seq import Seq

STOP_CODONS = {"TAA", "TAG", "TGA"}
STANDARD_START = {"ATG"}
ALTERNATIVE_STARTS = {"GTG", "TTG"}

# Color palette for ORF frames
FRAME_COLORS = {
    (1, 0): "#66B2FF",   # forward frame 1
    (1, 1): "#3399FF",   # forward frame 2
    (1, 2): "#0066CC",   # forward frame 3
    (-1, 0): "#FF9966",  # reverse frame 1
    (-1, 1): "#FF6633",  # reverse frame 2
    (-1, 2): "#CC3300",  # reverse frame 3
}


def find_orfs(
    sequence: str,
    min_length: int = 300,
    start_codons: list[str] | None = None,
    include_reverse: bool = True,
) -> list[dict]:
    """Find ORFs in all 6 reading frames.

    Args:
        sequence: DNA sequence string
        min_length: minimum ORF length in base pairs (default 300 = 100 aa)
        start_codons: list of start codons to use (default ["ATG"])
        include_reverse: whether to scan reverse complement

    Returns:
        List of ORF dicts with keys:
            start, end (0-based, relative to forward strand),
            strand (1 or -1),
            frame (0, 1, or 2),
            length (bp),
            protein (translated sequence),
            color
    """
    if start_codons is None:
        start_codons = ["ATG"]

    starts = set(c.upper() for c in start_codons)
    seq_len = len(sequence)
    sequence = sequence.upper()
    orfs = []

    # Forward strand
    for frame in range(3):
        orfs.extend(
            _scan_strand(sequence, frame, 1, starts, min_length, seq_len)
        )

    # Reverse complement
    if include_reverse:
        rev_seq = str(Seq(sequence).reverse_complement())
        for frame in range(3):
            rev_orfs = _scan_strand(rev_seq, frame, -1, starts, min_length, seq_len)
            # Convert reverse-strand coordinates back to forward-strand positions
            for orf in rev_orfs:
                orig_start = seq_len - orf["end"]
                orig_end = seq_len - orf["start"]
                orf["start"] = orig_start
                orf["end"] = orig_end
            orfs.extend(rev_orfs)

    # Sort by start position
    orfs.sort(key=lambda o: o["start"])
    return orfs


def _scan_strand(
    seq: str, frame: int, strand: int, starts: set, min_length: int, seq_len: int
) -> list[dict]:
    """Scan one reading frame for ORFs."""
    orfs = []
    i = frame

    while i + 3 <= len(seq):
        codon = seq[i : i + 3]
        if codon in starts:
            # Found a start codon — scan for the stop
            j = i + 3
            while j + 3 <= len(seq):
                stop = seq[j : j + 3]
                if stop in STOP_CODONS:
                    orf_len = j + 3 - i
                    if orf_len >= min_length:
                        protein = str(Seq(seq[i:j + 3]).translate())
                        orfs.append({
                            "start": i,
                            "end": j + 3,
                            "strand": strand,
                            "frame": frame,
                            "length": orf_len,
                            "protein": protein,
                            "color": FRAME_COLORS.get((strand, frame), "#888888"),
                        })
                    break
                j += 3
            # Move past this start codon
            i += 3
        else:
            i += 3

    return orfs
