# Atopile Picker Bug Patch

## Problem
`ato build` crashes with `AttributeError: 'str' object has no attribute '__cause__'` in atopile v0.12.5 when `api.atopile.io` is unreachable.

**Bug location:** `faebryk/libs/picker/api/picker_lib.py` line 218-229

## What was patched
The `RequestError` handler in `_find_modules()` assumes `e.args[0]` is an exception chain with `__cause__`, but it can be a plain string. The patch checks `isinstance(cause, BaseException)` before traversing the chain.

**Patched file:**
```
~/.cache/uv/archive-v0/9QoasOUISs_4lMx2Wd6-e/lib/python3.13/site-packages/faebryk/libs/picker/api/picker_lib.py
```

## How to revert
This patch lives in uv's cache and will be automatically overwritten when atopile is upgraded:
```bash
# Force reinstall to revert:
uv tool install --force atopile
```

Or upgrade atopile (the bug is likely fixed in newer versions):
```bash
uv tool upgrade atopile
```

## Date: 2026-03-13
