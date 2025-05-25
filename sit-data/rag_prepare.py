#!/usr/bin/env python3
"""
rag_prepare.py

Post-process a Firecrawl-scraped Markdown file for RAG:
 1. Cleans out noise (images, raw links, share/read-more blurbs, etc.)
 2. Uses a Markdown-aware splitter to produce semantic chunks
 3. Filters out tiny and duplicate chunks
 4. Writes both the cleaned Markdown and the chunk file

Usage:
    pip install langchain
    python rag_prepare.py
"""

import re
from langchain.text_splitter import MarkdownTextSplitter

# ─── CONFIG ──────────────────────────────────────────────────────────
INPUT_MD         = "singaporetech_main.md"    # raw Firecrawl output
CLEAN_MD         = "singaporetech_clean.md"   # cleaned markdown
OUTPUT_CHUNKS    = "singaporetech_chunks.txt" # chunked text
MIN_CHUNK_LENGTH = 150                        # drop shorter than this
CHUNK_SIZE       = 800
CHUNK_OVERLAP    = 100
# ─────────────────────────────────────────────────────────────────────

def clean_md(md: str) -> str:
    """Remove images, raw links, share/read-more lines, collapse blanks."""
    # 1) remove image markdown
    md = re.sub(r'!\[.*?\]\(.*?\)', '', md)
    # 2) collapse escaped line-breaks
    md = md.replace('\\\n', '\n')
    # 3) drop pure-link or share/read-more lines
    lines = []
    for line in md.splitlines():
        if re.match(r'^\s*(Read more|Share|https?://|\- \[)', line):
            continue
        lines.append(line)
    md = "\n".join(lines)
    # 4) unroll [text](url) → text
    md = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', md)
    # 5) strip nav fragments
    md = re.sub(r'Skip to main content.*', '', md, flags=re.IGNORECASE)
    # 6) collapse 3+ blank lines → 2
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()

def split_md(cleaned_md: str) -> list[str]:
    """Chunk by markdown structure, then filter tiny & duplicate chunks."""
    splitter = MarkdownTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    raw_chunks = splitter.split_text(cleaned_md)
    final_chunks: list[str] = []
    seen = set()
    for c in raw_chunks:
        if len(c) < MIN_CHUNK_LENGTH:
            continue
        if c in seen:
            continue
        seen.add(c)
        final_chunks.append(c)
    return final_chunks

def main():
    # Read the Firecrawl Markdown
    with open(INPUT_MD, encoding="utf-8") as f:
        raw = f.read()

    # Clean and save
    cleaned = clean_md(raw)
    with open(CLEAN_MD, "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"✅ Cleaned Markdown saved to {CLEAN_MD}")

    # Split into chunks and save
    chunks = split_md(cleaned)
    with open(OUTPUT_CHUNKS, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks, start=1):
            f.write(f"=== CHUNK {i} ===\n{chunk}\n\n")
    print(f"✅ {len(chunks)} chunks written to {OUTPUT_CHUNKS}")

if __name__ == "__main__":
    main()
