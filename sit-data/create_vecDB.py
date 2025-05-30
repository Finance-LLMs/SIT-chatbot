import os
import json

# For Ollama Langchain Code 
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
# Also Install chromaDB
import time
from tqdm import tqdm

# For Huggingface Code 
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle  # for saving index 

# Change Folder path to the Jsons folder 
folder_path = r"\SIT_scraped_JSON_data" 

all_texts = []

for filename in os.listdir(folder_path):
    if filename.endswith(".json"):
        print("Opening File")
        file_path = os.path.join(folder_path, filename)
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                text = json.dumps(data, ensure_ascii=False, indent=2)
                all_texts.append(text)
            except json.JSONDecodeError as e:
                print(f"Error reading {filename}: {e}")

full_text = "\n".join(all_texts)

# Chunking
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
chunks = splitter.split_text(full_text)

print(f"Total chunks: {len(chunks)}")
print(chunks[:2])

#Create VecDB using Ollama and LAngchain with Deepseek
def create_db():
    embedding_model = OllamaEmbeddings(model="deepseek-r1")  # Change model as needed

    start_time = time.time()
    print("Splitting text and embedding.")

    vector_db = None
    batch_size = 1000
    total_chunks = len(chunks)

    for i in tqdm(range(0, total_chunks, batch_size), desc="Processing Chunks"):
        batch = chunks[i:i+batch_size]
        if vector_db is None:
            vector_db = Chroma.from_texts(batch, embedding_model, persist_directory="./sit_vdb")
        else:
            vector_db.add_texts(batch)

    vector_db.persist()

    end_time = time.time()
    time_taken = end_time - start_time

    print(f"Vector DB created and persisted! ({total_chunks} chunks processed)")
    print(f"Total time taken: {time_taken:.2f} seconds")
    print("Vector database created successfully!")


#Create VecDB using hugging face (FASTER & SMALLER)
def create_db_hgface():
    embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    start_time = time.time()
    print("Splitting text and embedding.")

    batch_size = 1000
    total_chunks = len(chunks)
    embeddings = []

    for i in tqdm(range(0, total_chunks, batch_size), desc="Processing Chunks"):
        batch = chunks[i:i+batch_size]
        batch_embeddings = embedding_model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
        embeddings.extend(batch_embeddings)

    embeddings = np.array(embeddings).astype("float32")

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    faiss.write_index(index, "sit_faiss.index")
    with open("sit_faiss_chunks.pkl", "wb") as f:
        pickle.dump(chunks, f)

    end_time = time.time()
    time_taken = end_time - start_time

    print(f"Vector DB created and saved! ({total_chunks} chunks processed)")
    print(f"Total time taken: {time_taken:.2f} seconds")



# Call whichever fucniton you need, comment the other 


create_db() 
# create_db_hgface() 