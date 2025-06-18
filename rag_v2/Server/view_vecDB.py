from langchain_community.vectorstores import Chroma
from sentence_transformers import SentenceTransformer
# Custom embedding class for SentenceTransformer
class SentenceTransformerEmbedding:
    def __init__(self, model_name):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False).tolist()

    def embed_query(self, text):
        return self.model.encode([text], convert_to_numpy=True, show_progress_bar=False)[0].tolist()



def inspect_db():
    embedding_model = SentenceTransformerEmbedding("sentence-transformers/all-MiniLM-L6-v2")
    vector_db = Chroma(
        collection_name="sit_collection",
        embedding_function=embedding_model,
        persist_directory="./new_sit_vdb_hgface"
    )

    raw_docs = vector_db.get()
    print(f"Total documents stored: {len(raw_docs['documents'])}")
    if raw_docs['documents']:
        print("Sample doc:", raw_docs['documents'][0])
    else:
        print("⚠️ No documents found. Check your DB creation logic.")

if __name__ == "__main__":
    inspect_db()
