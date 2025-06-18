import os
import json
import re
from bs4 import BeautifulSoup

# === Configuration: boilerplate terms and minimum lengths ===
DEFAULT_BOILERPLATE_TERMS = {
    # lowercased exact matches or common substrings to filter out
    "home",
    "contact",
    "read more",
    "our story",
    "upcoming events",
    "see all",
    "javascript is off",
    # add more site-specific terms as needed
}
MIN_WORDS_TEXT_LINES = 5    # minimum words for text_lines entries
MIN_WORDS_PARAGRAPH = 0    # minimum words for article_texts and desc_divs entries


all_text = ""
def clean_text_field(value: str) -> str:
    """
    Clean a text field: handle None, strip HTML, normalize whitespace.
    """
    if not value or not isinstance(value, str):
        return ""
    soup = BeautifulSoup(value, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def is_boilerplate(text: str, boilerplate_terms: set[str]) -> bool:
    """
    Determine if `text` is boilerplate based on exact or substring matches.
    """
    low = text.strip().lower()
    if not low:
        return True
    # Exact or contained boilerplate terms
    for term in boilerplate_terms:
        if low == term or term in low:
            return True
    # Drop JSON-like artifacts
    if low.startswith("{") and low.endswith("}"):
        return True
    # Drop very short non-informative strings (e.g., single word menus)
    # But main length filtering is done separately.
    return False

def filter_paragraphs(paragraphs: list[str],
                      min_words: int,
                      boilerplate_terms: set[str]) -> list[str]:
    """
    Filter out paragraphs that are boilerplate or shorter than min_words.
    Returns a list of kept paragraphs.
    """
    filtered = []
    for p in paragraphs:
        text = p.strip()
        if not text:
            continue
        # Count words
        word_count = len(text.split())
        if word_count < min_words:
            continue
        if is_boilerplate(text, boilerplate_terms):
            continue
        filtered.append(text)
    return filtered

def assemble_paragraphs(cleaned: dict, boilerplate_terms: set[str]) -> dict:
    """
    From cleaned JSON dict, produce four paragraphs:
      - 'article_texts': combine filtered article_texts
      - 'text_lines': combine filtered text_lines
      - 'desc_divs': combine filtered desc_divs
      - 'urls': combine main URL and any links array URLs
    Returns a dict with keys: 'para_article_texts', 'para_text_lines',
    'para_desc_divs', 'para_urls'. Each value is a single string paragraph
    (or empty string if no content).
    """
    # 1. Filtered article_texts
    raw_article = cleaned.get('article_texts', []) or []
    # filtered_article = filter_paragraphs(raw_article, MIN_WORDS_PARAGRAPH, boilerplate_terms)
    para_article = " ".join(raw_article).strip()

    # 2. Filtered text_lines (short entries, so lower min length)
    raw_lines = cleaned.get('text_lines', []) or []
    # For text_lines, use MIN_WORDS_TEXT_LINES; also filter boilerplate
    filtered_lines = filter_paragraphs(raw_lines, MIN_WORDS_TEXT_LINES, boilerplate_terms)
    para_lines = " ".join(filtered_lines).strip()

    # 3. Filtered desc_divs
    raw_desc = cleaned.get('desc_divs', []) or []
    # filtered_desc = filter_paragraphs(raw_desc, MIN_WORDS_PARAGRAPH, boilerplate_terms)
    para_desc = " ".join(raw_desc).strip()

    # 4. URLs paragraph: main 'url' plus any URLs from links field
    urls = []
    main_url = cleaned.get('url')
    if main_url:
        urls.append(main_url.strip())
    # If links is a list of dicts or strings, extract URLs
    for entry in cleaned.get('links', []) or []:
        if isinstance(entry, str):
            urls.append(entry.strip())
        elif isinstance(entry, dict):
            # common key 'url' or 'href'
            u = entry.get('url') or entry.get('href')
            if isinstance(u, str) and u.strip():
                urls.append(u.strip())
    # Remove duplicates
    unique_urls = []
    for u in urls:
        if u not in unique_urls:
            unique_urls.append(u)
    para_urls = " ".join(unique_urls).strip()

    return {
        'para_article_texts': para_article,
        'para_text_lines': para_lines,
        'para_desc_divs': para_desc,
        'para_urls': para_urls
    }

def load_and_clean_json(path: str, boilerplate_terms: set[str]=DEFAULT_BOILERPLATE_TERMS) -> dict:
    """
    Load one JSON file, clean fields, filter boilerplate and length,
    assemble four paragraphs, and print them.
    Returns a dict containing:
      - cleaned fields under same keys: 'url', 'title', 'meta', 'article_texts', 'desc_divs', 'text_lines', 'links', 'images'
      - assembled paragraphs under keys: as returned by assemble_paragraphs
    """
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cleaned: dict = {}
    # URL
    cleaned['url'] = data.get('url')

    # Title
    cleaned['title'] = clean_text_field(data.get('title'))

    # Meta: only keep subfields, cleaned
    meta = data.get('meta') or {}
    cleaned_meta = {}
    if isinstance(meta, dict):
        if 'description' in meta:
            desc = clean_text_field(meta.get('description'))
            if desc:
                cleaned_meta['description'] = desc
        if 'date' in meta:
            date = meta.get('date')
            if isinstance(date, str) and date.strip():
                cleaned_meta['date'] = date.strip()
        if 'author' in meta:
            auth = clean_text_field(meta.get('author'))
            if auth:
                cleaned_meta['author'] = auth
        if 'keywords' in meta:
            kw = meta.get('keywords')
            if isinstance(kw, list):
                kws = [clean_text_field(k) for k in kw if isinstance(k, str) and clean_text_field(k)]
                if kws:
                    cleaned_meta['keywords'] = kws
            elif isinstance(kw, str):
                parts = [t.strip() for t in kw.split(',') if t.strip()]
                if parts:
                    cleaned_meta['keywords'] = parts
    cleaned['meta'] = cleaned_meta

    # article_texts: clean each entry, then filter in assemble_paragraphs
    cleaned['article_texts'] = []
    for p in data.get('article_texts') or []:
        txt = clean_text_field(p)
        if txt:
            cleaned['article_texts'].append(txt)

    # desc_divs
    cleaned['desc_divs'] = []
    for p in data.get('desc_divs') or []:
        txt = clean_text_field(p)
        if txt:
            cleaned['desc_divs'].append(txt)

    # text_lines
    cleaned['text_lines'] = []
    for line in data.get('text_lines') or []:
        txt = clean_text_field(line)
        if txt:
            cleaned['text_lines'].append(txt)

    # links/images: keep as-is
    cleaned['links'] = data.get('links') or []
    cleaned['images'] = data.get('images') or []

    print(cleaned)
    # Assemble and combine all paragraphs into a single string
    paras = assemble_paragraphs(cleaned, boilerplate_terms)
    combined_paragraphs = "\n".join([
        paras['para_article_texts'] or "",
        paras['para_text_lines'] or "",
        paras['para_desc_divs'] or "",
        paras['para_urls'] or ""
    ]).strip()

    print(f"--- Combined Paragraph for {os.path.basename(path)} ---")
    print(combined_paragraphs)
    print("--- End Combined Paragraph ---\n")

    # Store the combined paragraph in cleaned for later use
    cleaned['combined_paragraph'] = combined_paragraphs

    return combined_paragraphs

from langchain.text_splitter import SentenceTransformersTokenTextSplitter
from langchain.docstore.document import Document
from langchain.text_splitter import SentenceTransformersTokenTextSplitter
from langchain.docstore.document import Document

def create_chunks(all_text):
    global chunks  # Needed so create_db can access it

    doc = Document(page_content=all_text)
    splitter = SentenceTransformersTokenTextSplitter(chunk_size=500, chunk_overlap=50)
    docs = splitter.split_documents([doc])  # still Document objects
    chunks = [chunk.page_content for chunk in docs]  # extract text content only

    for i, chunk in enumerate(chunks):
        print(f"[Chunk {i}] {chunk[:80]}{'...' if len(chunk) > 80 else ''}")
    return chunks





import os
import json

# For Ollama Langchain Code 
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
# Also Install chromaDB
import time
from tqdm import tqdm

#Create VecDB using Ollama and Langchain with Deepseek
def create_db():
    embedding_model = OllamaEmbeddings(model="deepseek-r1")  # Change model as needed

    start_time = time.time()
    print("Splitting text and embedding.")

    vector_db = None
    batch_size = 5
    total_chunks = len(chunks)
    print("Total Chunks ",total_chunks)

    for i in tqdm(range(0, total_chunks, batch_size), desc="Processing Chunks"):
        batch = chunks[i:i+batch_size]
        if vector_db is None:
            vector_db = Chroma.from_texts(batch, embedding_model, persist_directory="./new_sit_vdb")
        else:
            vector_db.add_texts(batch)

    vector_db.persist()

    end_time = time.time()
    time_taken = end_time - start_time

    print(f"Vector DB created and persisted! ({total_chunks} chunks processed)")
    print(f"Total time taken: {time_taken:.2f} seconds")
    print("Vector database created successfully!")


from sentence_transformers import SentenceTransformer
# Custom embedding class for SentenceTransformer
class SentenceTransformerEmbedding:
    def __init__(self, model_name):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False).tolist()

    def embed_query(self, text):
        return self.model.encode([text], convert_to_numpy=True, show_progress_bar=False)[0].tolist()


# def create_db_hgface():
#     # Load a sentence transformer model from Hugging Face
#     # Small and Quick
#     embedding_model = SentenceTransformerEmbedding("sentence-transformers/all-MiniLM-L6-v2")
#     print(chunks)
#     # Good for QA and semantic search
#     # embedding_model = SentenceTransformerEmbedding("sentence-transformers/multi-qa-MiniLM-L6-cos-v1")
    

#     start_time = time.time()
#     print("Splitting text and embedding.")

#     batch_size = 250
#     total_chunks = len(chunks)

#     # Create Chroma database
#     print("Creating vector database...")
#     vector_db = Chroma(
#         collection_name="sit_collection",
#         embedding_function=embedding_model,
#         persist_directory="./new_sit_vdb_hgface"  # Use a different directory to avoid conflicts
#     )

#     # Add texts in batches
#     for i in tqdm(range(0, total_chunks, batch_size), desc="Adding texts to database"):
#         batch = chunks[i:i + batch_size]
#         vector_db.add_texts(batch)

#     vector_db.persist()

#     end_time = time.time()
#     time_taken = end_time - start_time

#     print(f"Vector DB created and saved! ({total_chunks} chunks processed)")
#     print(f"Total time taken: {time_taken:.2f} seconds")


def create_db_hgface():
    embedding_model = SentenceTransformerEmbedding("sentence-transformers/all-MiniLM-L6-v2")

    start_time = time.time()
    print("Splitting text and embedding.")
    batch_size = 250
    total_chunks = len(chunks)

    print("Creating vector database...")
    vector_db = Chroma(
        collection_name="sit_collection",
        embedding_function=embedding_model,
        persist_directory="./new_sit_vdb_hgface"
    )

    for i in tqdm(range(0, total_chunks, batch_size), desc="Adding texts to database"):
        batch = chunks[i:i + batch_size]
        vector_db.add_texts(batch)
        
    print("Stored docs:", len(vector_db.get()['documents']))

    vector_db.persist()
    end_time = time.time()
    print(f"DB creation complete in {end_time - start_time:.2f} seconds.")


if __name__ == "__main__":
    # Example usage: adjust folder path as needed
    folder = r"second_vdb/SIT_OUTPUT"

    count = 0
    for fname in os.listdir(folder):
        if not fname.lower().endswith(".json"):
            continue
        path = os.path.join(folder, fname)
        try:
            
            all_text += load_and_clean_json(path)
        except Exception as e:
            print(f"[!] Failed to process {fname}: {e}")
        # if count == 10:
        #     break
        # count +=1
    
    chunks = create_chunks(all_text)

    print("Total Chunks ", len(chunks))

    # create_db()
    create_db_hgface()