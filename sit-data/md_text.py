# requirements: pip install langchain

import re
from langchain.text_splitter import RecursiveCharacterTextSplitter

INPUT_MD   = "singaporetech_main.md"
CLEAN_MD   = "singaporetech_clean.md"
OUTPUT_TXT = "singaporetech_chunks.txt"

def clean_markdown(md: str) -> str:
    # 1. remove images entirely
    md = re.sub(r'!\[.*?\]\(.*?\)', '', md)
    # 2. turn [label](url) → label
    md = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', md)
    # 3. strip any “Skip to main content” or nav fragments
    md = re.sub(r'Skip to main content.*', '', md, flags=re.IGNORECASE)
    # 4. collapse 3+ newlines → 2
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()

def chunk_text(text: str, **split_args) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(**split_args)
    return splitter.split_text(text)

def main():
    # load raw markdown
    with open(INPUT_MD, encoding="utf-8") as f:
        raw = f.read()

    # clean it up
    clean = clean_markdown(raw)
    with open(CLEAN_MD, "w", encoding="utf-8") as f:
        f.write(clean)
    print(f"✅ Cleaned markdown saved to {CLEAN_MD}")

    # split into ~1k-char chunks with 200-char overlap
    chunks = chunk_text(clean, chunk_size=1000, chunk_overlap=200)
    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks, 1):
            f.write(f"=== CHUNK {i} ===\n{chunk}\n\n")
    print(f"✅ {len(chunks)} chunks written to {OUTPUT_TXT}")

if __name__ == "__main__":
    main()
