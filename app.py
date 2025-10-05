# -*- coding: utf-8 -*-
"""
AIONEX Backend Server
Team Name: AIONEX
Date: 05-10-2025

This Flask application serves as the backend for the AIONEX project.
It handles PubMed article scraping, NLP analysis (summarization, sentiment analysis),
and provides a conversational AI interface powered by OpenAI's GPT models.
It now includes a robust, real-data reputation engine for article analysis.
"""

# --- 1. Environment Variable Setup (MUST BE FIRST) ---
import os

# Suppress TensorFlow messages (1=INFO, 2=WARNING, 3=ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ON_EDNN_OPTS'] = '0'

# --- Core Libraries ---
import re
import logging
from datetime import datetime
from threading import Lock

# --- Third-party Libraries ---
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline, logging as hf_logging
from waitress import serve
from deep_translator import GoogleTranslator

# --- Application Configuration & Initialization ---

OPENAI_API_KEY = "YOUR_API_KEY"
NCBI_EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
REQUEST_TIMEOUT = 15
# Be a good API citizen by identifying your tool.
TOOL_PARAMS = {"tool": "AIONEX-NASA-Competition"}
PUBMED_EMAIL = os.environ.get("PUBMED_EMAIL", "").strip()
if PUBMED_EMAIL:
    TOOL_PARAMS["email"] = PUBMED_EMAIL


hf_logging.set_verbosity_error()
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

# Global variables, initialized at startup
summarizer = None
sentiment_analyzer = None
question_answerer = None
chat_histories = {}
model_lock = Lock()  # To prevent race conditions on NLP models

# --- 2. Model Loading ---

try:
    print("[*] AIONEX System Booting...")
    print("[*] Loading NLP models from Hugging Face...")
    # Using with model_lock to ensure thread-safe initialization
    with model_lock:
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        sentiment_analyzer = pipeline('sentiment-analysis', model="distilbert-base-uncased-finetuned-sst-2-english")
        question_answerer = pipeline('question-answering', model="distilbert-base-cased-distilled-squad")
    print("  [+] All NLP models loaded successfully.")
    print("\n[*] Conversational AI is powered by OpenAI's GPT API.")
    print("[*] Reputation engine is connected to live public APIs (PubMed, OpenAlex).")

except Exception as e:
    print(f"\n[!] CRITICAL ERROR during model initialization: {e}")
    print("[!] The server cannot start without all its core components.")
    exit(1) # Exit if models fail to load

# --- 3. Helper Functions ---

def get_pmid_from_url(url: str) -> str | None:
    """Extracts the PubMed ID (PMID) from a PubMed URL."""
    match = re.search(r'pubmed\.ncbi\.nlm\.nih\.gov/(\d+)', url)
    return match.group(1) if match else None

def get_article_details(pmid: str) -> dict | None:
    """Fetches detailed article information (title, abstract) using PubMed's efetch utility."""
    try:
        response = requests.get(
            f"{NCBI_EUTILS}/efetch.fcgi",
            params={"db": "pubmed", "id": pmid, "retmode": "xml", **TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        
        root = BeautifulSoup(response.content, 'xml')
        article = root.find('PubmedArticle')
        if not article:
            return None

        title = article.find('ArticleTitle').get_text(strip=True) if article.find('ArticleTitle') else "Title not found"
        
        abstract_parts = []
        for abstract_text in article.find_all('AbstractText'):
            label = abstract_text.get('Label')
            text = abstract_text.get_text(strip=True)
            if label:
                abstract_parts.append(f"**{label}:** {text}")
            else:
                abstract_parts.append(text)
        
        abstract = "\n\n".join(abstract_parts) if abstract_parts else "Abstract not available."
        
        return {'title': title, 'abstract': abstract}
    except requests.exceptions.RequestException as e:
        print(f"[!] Network error fetching details for PMID {pmid}: {e}")
        return None
    except Exception as e:
        print(f"[!] Error parsing details for PMID {pmid}: {e}")
        return None

# --- 4. Flask API Routes ---

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def api_search():
    """API endpoint to search PubMed using E-utilities for reliability."""
    query = request.json.get('query')
    if not query:
        return jsonify({'error': 'Query is required.'}), 400

    try:
        # 1. ESearch: Get a list of PMIDs matching the query
        search_response = requests.get(
            f"{NCBI_EUTILS}/esearch.fcgi",
            params={"db": "pubmed", "term": query, "retmax": "20", "retmode": "json", "sort": "relevance", **TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        search_response.raise_for_status()
        search_data = search_response.json()
        id_list = search_data.get("esearchresult", {}).get("idlist", [])

        if not id_list:
            return jsonify([])

        # 2. ESummary: Get summaries for the found PMIDs
        summary_response = requests.get(
            f"{NCBI_EUTILS}/esummary.fcgi",
            params={"db": "pubmed", "id": ",".join(id_list), "retmode": "json", **TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        summary_response.raise_for_status()
        summary_data = summary_response.json().get("result", {})

        # 3. Format results
        articles = []
        for pmid in id_list:
            article_data = summary_data.get(pmid)
            if article_data:
                pub_date_str = article_data.get("pubdate", "1900-01-01")
                # Ensure date is in YYYY-MM-DD format
                try:
                    parsed_date = datetime.strptime(pub_date_str.split(" ")[0], "%Y")
                    date_str = parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    try:
                        parsed_date = datetime.strptime(pub_date_str, "%Y %b %d")
                        date_str = parsed_date.strftime('%Y-%m-%d')
                    except:
                        date_str = "1900-01-01"

                articles.append({
                    'title': article_data.get("title", "No Title Available"),
                    'link': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    'date': date_str,
                })
        return jsonify(articles)

    except requests.exceptions.RequestException as e:
        print(f"[!] PubMed search network error: {e}")
        return jsonify({'error': 'The PubMed search service is currently unavailable.'}), 503
    except Exception as e:
        print(f"[!] An unexpected error occurred during search: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """Analyzes a single article: gets abstract, summarizes, and checks sentiment."""
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'URL is required.'}), 400

    pmid = get_pmid_from_url(url)
    if not pmid:
        return jsonify({'error': 'Invalid PubMed URL provided.'}), 400

    details = get_article_details(pmid)
    if not details:
        return jsonify({'error': 'Failed to retrieve article details.'}), 500
        
    response_data = {**details, 'link': url}
    abstract = details['abstract']
    
    with model_lock:
        if summarizer and "not available" not in abstract:
            try:
                response_data['summary'] = summarizer(abstract, max_length=150, min_length=40, do_sample=False)[0]['summary_text']
            except Exception as e:
                print(f"[!] Summarization failed: {e}")
                response_data['summary'] = "AI summary could not be generated."
        
        if sentiment_analyzer and "not available" not in abstract:
            try:
                # Truncate for sentiment analysis to avoid model limits
                sentiment_result = sentiment_analyzer(abstract[:512])[0]
                response_data['sentiment'] = sentiment_result['label']
            except Exception as e:
                print(f"[!] Sentiment analysis failed: {e}")
                response_data['sentiment'] = "UNKNOWN"
            
    return jsonify(response_data)

@app.route('/api/ask', methods=['POST'])
def api_ask():
    """Handles question-answering over a given context, with improved error handling."""
    payload = request.json
    question = payload.get('question', '').strip()
    context = payload.get('context', '').strip()

    if not all([question, context, question_answerer]):
        return jsonify({'error': 'Both "question" and "context" are required.'}), 400
        
    # Basic check for off-topic questions (heuristic)
    if len(question.split()) < 3:
        return jsonify({'answer': "Please ask a more specific question about the text."})

    with model_lock:
        try:
            result = question_answerer(question=question, context=context)
            # Check the confidence score. If it's very low, the answer is likely irrelevant.
            if result['score'] < 0.1: # Threshold can be tuned
                return jsonify({'answer': "A clear answer could not be found in the text."})
            return jsonify(result)
        except Exception as e:
            print(f"[!] Question-answering model failed: {e}")
            return jsonify({'error': 'The Question & Answering service is not available.'}), 503

@app.route('/api/translate', methods=['POST'])
def api_translate():
    """Translates a list of texts to a target language using a robust library."""
    payload = request.json
    texts = payload.get("texts", [])
    lang = payload.get("lang", "en")

    if not texts:
        return jsonify({"translations": []})
        
    # Fix for Mandarin Chinese: the library expects 'zh-CN'
    if lang == 'zh':
        lang = 'zh-CN'

    try:
        # The deep_translator library handles API calls and fallbacks gracefully.
        translated_texts = GoogleTranslator(source="auto", target=lang).translate_batch(texts)
        return jsonify({"translations": translated_texts})
    except Exception as e:
        print(f"[!] Translation to '{lang}' failed: {e}")
        # If translation fails, return the original texts so the UI doesn't break.
        return jsonify({"translations": texts})

@app.route('/api/reputation/<pmid>')
def api_reputation(pmid: str):
    """
    Provides a real reputation score based on public data signals from PubMed and OpenAlex.
    This is a pragmatic proxy for article impact, not an official metric.
    """
    # 1. Get core metadata from PubMed ESummary (authors, journal, year, PMCID)
    try:
        summary_res = requests.get(
            f"{NCBI_EUTILS}/esummary.fcgi",
            params={"db": "pubmed", "id": pmid, "retmode": "json", **TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        summary_res.raise_for_status()
        res = summary_res.json().get("result", {}).get(pmid, {})
        journal_title = res.get("fulljournalname") or ""
        pub_year = int((res.get("pubdate") or "1900").split(" ")[0])
        first_author = (res.get("authors")[0].get("name")) if res.get("authors") else None
        pmcid_present = any(aid.get("idtype") == "pmcid" for aid in res.get("articleids", []))
    except Exception:
        # If this basic call fails, we can't proceed.
        return jsonify({"error": "Could not retrieve basic article metadata from PubMed."}), 502

    # 2. Get citation count from PubMed ELink
    citations = 0
    try:
        elink_res = requests.get(
            f"{NCBI_EUTILS}/elink.fcgi",
            params={"dbfrom": "pubmed", "linkname": "pubmed_pubmed_citedin", "id": pmid, "retmode": "json", **TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        elink_res.raise_for_status()
        linkset = elink_res.json().get("linksets", [])
        if linkset and linkset[0].get("linksetdbs"):
            citations = len(linkset[0]["linksetdbs"][0].get("links", []))
    except Exception as e:
        print(f"[Reputation Engine] Could not get citation count for {pmid}: {e}")

    # 3. Get Journal Activity from OpenAlex
    journal_activity = 0
    if journal_title:
        try:
            # OpenAlex is better for this than PubMed search
            oa_res = requests.get(
                "https://api.openalex.org/venues",
                params={"filter": f"display_name.search:{journal_title}", "per-page": "1"},
                timeout=REQUEST_TIMEOUT,
            )
            oa_res.raise_for_status()
            venue_data = oa_res.json().get("results", [])
            if venue_data:
                journal_activity = venue_data[0].get("works_count", 0)
        except Exception as e:
            print(f"[Reputation Engine] Could not get journal activity for '{journal_title}': {e}")

    # 4. Get Author Activity from OpenAlex
    author_pubs = 0
    if first_author:
        try:
            oa_res = requests.get(
                "https://api.openalex.org/authors",
                params={"filter": f"display_name.search:{first_author}", "per-page": "1"},
                timeout=REQUEST_TIMEOUT,
            )
            oa_res.raise_for_status()
            author_data = oa_res.json().get("results", [])
            if author_data:
                author_pubs = author_data[0].get("works_count", 0)
        except Exception as e:
            print(f"[Reputation Engine] Could not get author activity for '{first_author}': {e}")
            
    # --- Scoring Logic (0-100 scale) ---
    def scale_log(value, max_val):
        if value <= 0: return 0
        import math
        # Logarithmic scale feels more natural for citations/publications
        return min(100, int(100 * math.log10(1 + value) / math.log10(1 + max_val)))

    citations_score = scale_log(citations, 200) # Capping at 200 for a reasonable scale
    open_access_score = 100 if pmcid_present else 30 # Strong bonus for being open
    
    years_ago = max(0, datetime.now().year - pub_year)
    recency_score = max(10, 100 - years_ago * 5) # Slower decay rate

    journal_activity_score = scale_log(journal_activity, 50000) # Top journals have >50k works
    author_activity_score = scale_log(author_pubs, 300) # Prolific authors

    return jsonify({
        "components": {
            "Citations": citations_score,
            "Open Access": open_access_score,
            "Recency": recency_score,
            "Journal Activity": journal_activity_score,
            "Author Activity": author_activity_score,
        }
    })

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Handles conversational AI requests to OpenAI."""
    payload = request.json
    user_input = payload.get('message')
    conversation_id = payload.get('conversation_id')

    # Robust check for API key and required parameters
    if not all([user_input, conversation_id, OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")]):
        error_msg = "A message and conversation_id are required."
        if not (OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")):
            error_msg = "OpenAI API key is not configured on the server."
        return jsonify({'error': error_msg}), 400 if 'key' not in error_msg else 503

    history = chat_histories.get(conversation_id, [])
    
    system_prompt = (
        "You are AIONEX, a friendly and enthusiastic AI assistant specializing in space, astronomy, and NASA. "
        "Your knowledge is strictly limited to these topics. If asked about anything else, you MUST politely refuse to answer. "
        "Default to English, but if the user writes in another language, you must respond in that same language."
    )
    
    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_input}]
    
    headers = { "Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json" }
    api_payload = { "model": "gpt-3.5-turbo", "messages": messages }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=api_payload, timeout=30)
        response.raise_for_status()
        
        api_response = response.json()
        ai_reply = api_response['choices'][0]['message']['content'].strip()

        history.extend([{'role': 'user', 'content': user_input}, {'role': 'assistant', 'content': ai_reply}])
        chat_histories[conversation_id] = history[-6:] # Keep last 3 turns

        return jsonify({'reply': ai_reply, 'sources': []})
        
    except requests.exceptions.RequestException as e:
        print(f"[!] OpenAI API connection error: {e}")
        return jsonify({'error': 'Sorry, I am having trouble connecting to the network.'}), 504
    except Exception as e:
        print(f"[!] An unexpected error occurred in the chat handler: {e}")
        return jsonify({'error': 'Sorry, an internal error occurred on my end.'}), 500

# --- 5. Main Execution Block ---

if __name__ == '__main__':
    print("[+] All systems nominal. AIONEX is fully operational.")
    print(f"[*] Access the project at: http://127.0.0.1:5000")
    serve(app, host='0.0.0.0', port=5000)
