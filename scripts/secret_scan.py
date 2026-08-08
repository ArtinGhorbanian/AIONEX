"""Scan the current source tree for common high-confidence secret shapes.

Only finding labels and relative file paths are printed; matched values are never
echoed. This is a release safeguard, not a replacement for provider-side secret
scanning or credential rotation.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRECTORIES = {".git", ".aionex-private", "__pycache__", "node_modules"}
SKIP_FILES = {".env"}
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}
PATTERNS = {
    "OpenAI key": re.compile(rb"sk-[A-Za-z0-9_-]{20,}"),
    "GitHub token": re.compile(rb"(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})"),
    "AWS access key": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "Private key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}


def eligible(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if path.name in SKIP_FILES or path.stat().st_size > 5_000_000:
        return False
    if any(part in SKIP_DIRECTORIES or part.startswith(".venv") for part in relative.parts):
        return False
    return path.suffix.casefold() in TEXT_SUFFIXES


def main() -> int:
    findings: list[tuple[str, str]] = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or not eligible(path):
            continue
        content = path.read_bytes()
        for label, pattern in PATTERNS.items():
            if pattern.search(content):
                findings.append((label, path.relative_to(ROOT).as_posix()))
    if findings:
        print("Potential secrets detected (values withheld):", file=sys.stderr)
        for label, relative in findings:
            print(f"- {label}: {relative}", file=sys.stderr)
        return 1
    print("Secret scan passed: 0 matching files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
