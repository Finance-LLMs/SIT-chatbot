from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from sentence_transformers import SentenceTransformer

# Custom embedding wrapper (same as your working one)
class SentenceTransformerEmbedding:
    def __init__(self, model_name):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False).tolist()

    def embed_query(self, text):
        return self.model.encode([text], convert_to_numpy=True, show_progress_bar=False)[0].tolist()

def retrieve_top_k_chunks(
    query: str,
    k: int = 5,
    persist_dir: str = "./new_sit_vdb_hgface",
    collection_name: str = "sit_collection",
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
) -> list[Document]:
    """
    Retrieve the top-k relevant documents from Chroma based on a user's query.

    Returns a list of LangChain `Document` objects.
    """
    # Initialize embedding model
    embedding_model = SentenceTransformerEmbedding(model_name)

    # Load vector DB
    vector_db = Chroma(
        persist_directory=persist_dir,
        collection_name=collection_name,
        embedding_function=embedding_model
    )

    # Use Chroma as retriever
    retriever = vector_db.as_retriever(search_kwargs={"k": k})
    results = retriever.get_relevant_documents(query)

    print(f"✅ Retrieved {len(results)} documents for query: {query!r}")
    return results

def retrieve_top_k_chunks_as_strings(
    query: str,
    k: int = 5,
    persist_dir: str = "./new_sit_vdb_hgface",
    collection_name: str = "sit_collection",
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
) -> list[str]:
    """
    Retrieve the top-k relevant document chunks as strings from Chroma based on a user's query.

    Returns a list of strings (the text content of each chunk).
    """
    docs = retrieve_top_k_chunks(
        query=query,
        k=k,
        persist_dir=persist_dir,
        collection_name=collection_name,
        model_name=model_name
    )
    return [doc.page_content for doc in docs]


if __name__ == "__main__":
    query = "Tell me about the 10th Anniversary of SIT?"
    top_docs = retrieve_top_k_chunks(query, k=5)

    for i, doc in enumerate(top_docs, 1):
        print(f"\n--- Chunk #{i} ---")
        print(doc.page_content)
        if doc.metadata:
            print("Metadata:", doc.metadata)
