#!/usr/bin/env python3
"""Reproduce the committed browser grid with Python's standard library."""
from pathlib import Path
import hashlib
import lzma
root = Path(__file__).resolve().parents[1]
raw = (root / 'conformal.lzma').read_bytes()
assert hashlib.sha256(raw).hexdigest() == '296d33faf7f49fb3b9ba097ffa9f35a335f23efa3cf2e75569bfd21766b30823'
data = lzma.decompress(raw)
assert len(data) == 530448
(root / 'public/conformal.bin').write_bytes(data)
print('Grille conforme générée : 530448 octets big-endian')
