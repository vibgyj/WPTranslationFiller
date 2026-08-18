#!/usr/bin/env python3
"""
build_locale.py — keep the WP Translation Filler options-page locale files in sync.

The options page is translated at runtime by walking the DOM and looking up each
string (visible text, button values, and data-tooltip attributes) in
locales/options/<lang>.json. The JSON keys ARE the English source strings, so the
keys must match what the browser sees exactly — including the whitespace inside
multi-line tooltips.

This script parses the HTML the same way the runtime walker does, so the keys it
produces are guaranteed to match. It filters out strings that should never be
translated (provider names, model identifiers, API-key placeholders, emoji button
glyphs, bare numbers/punctuation), leaving only genuine UI text.

Typical workflow after you edit the options HTML:

    # 1. See what changed (which translatable strings are new vs already covered)
    python build_locale.py candidates --html wptf-options.html

    # 2. Refresh the English master (identity map) from the current HTML
    python build_locale.py build-en

    # 3. Propagate the key set to every locale: adds new keys (with the English
    #    string as a placeholder), drops stale keys, keeps existing translations,
    #    and reorders to match. Existing translations are never overwritten.
    python build_locale.py sync --all

    # 4. Translate the new placeholder values in each <lang>.json.

Other handy commands:

    python build_locale.py new pt          # scaffold a brand-new locale (pt.json)
    python build_locale.py sync de es fr    # sync only specific locales
    python build_locale.py sync --all --check   # CI: report drift, write nothing,
                                                #     exit 1 if any locale is stale

No third-party dependencies — standard library only.
"""

from __future__ import annotations

import argparse
import json
import sys
from html.parser import HTMLParser
from pathlib import Path

# --------------------------------------------------------------------------- #
# Configuration — adjust here if the HTML structure changes.
# --------------------------------------------------------------------------- #

# <select> ids whose <option> text SHOULD be translated. Every other <select>
# holds provider names or model identifiers, whose option text is left alone.
TRANSLATABLE_SELECTS = {"langselect", "ToneSelect"}

# Option text outside the translatable selects that we still want (dynamic
# placeholders shown before a live list loads, etc.).
OPTION_ALLOWLIST = {"Loading models..."}

# <input> types whose `value` is a user-facing label (translate it). Other input
# values are data (API keys, numbers, defaults) and are ignored.
BUTTON_INPUT_TYPES = {"button", "submit", "reset"}

# Elements whose text content is never UI copy.
SKIP_PARENTS = {"script", "style", "textarea", "title", "head"}

# Void elements never get pushed on the tag stack.
VOID = {"input", "br", "img", "meta", "link", "hr", "source"}

DEFAULT_HTML = "wptf-options.html"
DEFAULT_LOCALES_DIR = "locales/options"
REF_LANG = "en"  # the identity/master file used as the key source-of-truth


# --------------------------------------------------------------------------- #
# Parser: mirrors the runtime translateElement() walk.
# --------------------------------------------------------------------------- #

class Extractor(HTMLParser):
    """Collects (kind, key, translatable) tuples in document order."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []          # list of dicts: {"tag": str, "id": str|None}
        self.items = []          # (kind, key, translatable_bool)

    # -- helpers ----------------------------------------------------------- #
    def _nearest_select_id(self):
        for el in reversed(self.stack):
            if el["tag"] == "select":
                return el.get("id")
        return None

    def _add(self, kind, key, translatable):
        key = key.strip()
        if key:
            self.items.append((kind, key, translatable))

    def _handle_attrs(self, tag, attrs):
        d = dict(attrs)
        if tag == "input":
            itype = (d.get("type") or "").lower()
            if "value" in d:
                self._add("input", d["value"], itype in BUTTON_INPUT_TYPES)
        if "data-tooltip" in d:
            # Attribute values arrive already entity-decoded, matching what
            # getAttribute("data-tooltip") returns in the browser. Tooltips are
            # always real UI copy.
            self._add("tooltip", d["data-tooltip"], True)

    # -- HTMLParser hooks -------------------------------------------------- #
    def handle_starttag(self, tag, attrs):
        self._handle_attrs(tag, attrs)
        if tag not in VOID:
            self.stack.append({"tag": tag, "id": dict(attrs).get("id")})

    def handle_startendtag(self, tag, attrs):
        self._handle_attrs(tag, attrs)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        parent = self.stack[-1]["tag"] if self.stack else None
        if parent in SKIP_PARENTS:
            return
        text = data.strip()
        if not text:
            return
        self._add("text", text, self._text_is_translatable(text, parent))

    # -- translatability rules -------------------------------------------- #
    def _text_is_translatable(self, text, parent):
        # Must contain at least one letter — drops "?", ",", "90", emoji glyphs.
        if not any(ch.isalpha() for ch in text):
            return False
        if parent == "option":
            sid = self._nearest_select_id()
            if sid in TRANSLATABLE_SELECTS:
                return True
            return text in OPTION_ALLOWLIST
        return True


def extract(html_text):
    """Return (translatable_keys_in_order, skipped_keys_in_order), de-duplicated."""
    ex = Extractor()
    ex.feed(html_text)
    translatable, skipped = [], []
    seen = set()
    for kind, key, ok in ex.items:
        if key in seen:
            continue
        seen.add(key)
        (translatable if ok else skipped).append((kind, key))
    return translatable, skipped


# --------------------------------------------------------------------------- #
# JSON helpers
# --------------------------------------------------------------------------- #

def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write("\n")


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #

def cmd_candidates(args):
    html_text = Path(args.html).read_text(encoding="utf-8")
    translatable, skipped = extract(html_text)

    ref_path = Path(args.locales_dir) / f"{REF_LANG}.json"
    ref_keys = set(load_json(ref_path).keys())

    def preview(k):
        one = " ".join(k.split())
        return one if len(one) <= 70 else one[:67] + "..."

    print(f"Translatable strings: {len(translatable)}")
    print("-" * 70)
    for kind, key in translatable:
        flag = "" if not ref_keys else ("  NEW" if key not in ref_keys else "")
        print(f"[{kind:7}] {preview(key)!r}{flag}")

    if ref_keys:
        new = [k for _, k in translatable if k not in ref_keys]
        gone = [k for k in ref_keys if k not in {kk for _, kk in translatable}]
        print("-" * 70)
        print(f"NEW keys not in {REF_LANG}.json: {len(new)}")
        print(f"Stale keys in {REF_LANG}.json but not in HTML: {len(gone)}")

    print("-" * 70)
    print(f"Skipped (never translated): {len(skipped)}")
    if args.show_skipped:
        for kind, key in skipped:
            print(f"  [{kind:7}] {preview(key)!r}")


def cmd_build_en(args):
    html_text = Path(args.html).read_text(encoding="utf-8")
    translatable, _ = extract(html_text)
    out = {key: key for _, key in translatable}  # identity map
    path = Path(args.out) if args.out else Path(args.locales_dir) / f"{REF_LANG}.json"
    dump_json(path, out)
    print(f"Wrote {path} — {len(out)} keys (identity map).")


def _reference_keys(args):
    """Ordered translatable keys from the HTML (the source of truth)."""
    html_text = Path(args.html).read_text(encoding="utf-8")
    translatable, _ = extract(html_text)
    return [key for _, key in translatable]


def _sync_one(lang, ref_keys, locales_dir, blank, check):
    path = Path(locales_dir) / f"{lang}.json"
    existing = load_json(path)

    merged = {}
    added, kept = [], []
    for key in ref_keys:
        if key in existing:
            merged[key] = existing[key]
            kept.append(key)
        else:
            merged[key] = "" if blank else key
            added.append(key)
    removed = [k for k in existing if k not in set(ref_keys)]

    drift = bool(added or removed)
    status = "OK " if not drift else "DRIFT"
    print(f"[{status}] {lang}.json  kept={len(kept)} added={len(added)} "
          f"removed={len(removed)}")
    if added:
        print(f"        + {len(added)} new key(s) need translation")
    if removed:
        print(f"        - {len(removed)} stale key(s) dropped")

    if not check:
        dump_json(path, merged)
    return drift


def cmd_sync(args):
    ref_keys = _reference_keys(args)
    locales_dir = Path(args.locales_dir)

    if args.all:
        langs = sorted(p.stem for p in locales_dir.glob("*.json"))
    else:
        langs = args.langs
    if not langs:
        print("No locales to sync. Pass language codes or --all.", file=sys.stderr)
        return 2

    print(f"Reference: {len(ref_keys)} translatable keys from {args.html}")
    print(f"Mode: {'check (no writes)' if args.check else 'write'}, "
          f"placeholder={'blank' if args.blank else 'English source'}")
    print("-" * 70)

    any_drift = False
    for lang in langs:
        any_drift |= _sync_one(lang, ref_keys, locales_dir, args.blank, args.check)

    if args.check and any_drift:
        print("-" * 70)
        print("Drift detected.", file=sys.stderr)
        return 1
    return 0


def cmd_new(args):
    ref_keys = _reference_keys(args)
    path = Path(args.locales_dir) / f"{args.lang}.json"
    if path.exists() and not args.force:
        print(f"{path} already exists. Use `sync {args.lang}` to update it, "
              f"or pass --force to overwrite.", file=sys.stderr)
        return 2
    out = {key: ("" if args.blank else key) for key in ref_keys}
    dump_json(path, out)
    print(f"Created {path} — {len(out)} keys "
          f"({'blank' if args.blank else 'English placeholders'}).")
    print(f"Now translate the values, then re-run `sync {args.lang}` "
          f"whenever the HTML changes.")
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def build_parser():
    p = argparse.ArgumentParser(
        description="Build and sync options-page locale JSON files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--html", default=DEFAULT_HTML,
                   help=f"path to the options HTML (default: {DEFAULT_HTML})")
    p.add_argument("--locales-dir", default=DEFAULT_LOCALES_DIR,
                   help=f"locale directory (default: {DEFAULT_LOCALES_DIR})")
    sub = p.add_subparsers(dest="command", required=True)

    c = sub.add_parser("candidates",
                       help="list translatable strings found in the HTML")
    c.add_argument("--show-skipped", action="store_true",
                   help="also print the strings that were filtered out")
    c.set_defaults(func=cmd_candidates)

    e = sub.add_parser("build-en",
                       help="write en.json as an identity map from the HTML")
    e.add_argument("--out", help="output path (default: <locales-dir>/en.json)")
    e.set_defaults(func=cmd_build_en)

    s = sub.add_parser("sync",
                       help="align locale file(s) to the HTML key set")
    s.add_argument("langs", nargs="*", help="language codes, e.g. de es fr")
    s.add_argument("--all", action="store_true",
                   help="sync every *.json in the locale dir")
    s.add_argument("--check", action="store_true",
                   help="report drift, write nothing, exit 1 if stale (for CI)")
    s.add_argument("--blank", action="store_true",
                   help="use empty strings for new keys instead of the English source")
    s.set_defaults(func=cmd_sync)

    n = sub.add_parser("new", help="scaffold a brand-new locale file")
    n.add_argument("lang", help="language code, e.g. pt")
    n.add_argument("--blank", action="store_true",
                   help="empty values instead of English placeholders")
    n.add_argument("--force", action="store_true",
                   help="overwrite if the file already exists")
    n.set_defaults(func=cmd_new)

    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    rc = args.func(args)
    return rc or 0


if __name__ == "__main__":
    sys.exit(main())