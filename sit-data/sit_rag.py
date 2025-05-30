from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import Ollama




def load_db():
    embedding_model = OllamaEmbeddings(model="deepseek-r1")
    vector_db = Chroma(persist_directory="./sit_db", embedding_function=embedding_model)

    print("Vector database loaded successfully!")
    return vector_db


def query_llm(vector_db,query):
    llm = Ollama(model="deepseek-r1")  # Use Ollama model

    qa_chain = RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=vector_db.as_retriever())

    response = qa_chain.run(query)
    print("\nLLM Response:")
    print(response)
    
  
vector_db = load_db()

query = "You are a RAG model and I have given you a vector DB as context, What can you tell me from the context provided"
query_llm(vector_db,query)