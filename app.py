# -*- coding: utf-8 -*-
"""
AIONEX Backend Server
Team Name: AIONEX
Date: 05-10-2025

This Flask application serves as the backend for the AIONEX project.
It handles PubMed article data retrieval via official APIs, performs NLP analysis
(summarization, sentiment analysis, Q&A), and provides a conversational AI
interface. It now includes a robust, real-data reputation engine for article analysis.
"""

# --- 1. Environment Variable Setup (MUST BE FIRST) ---
import os
# Suppress TensorFlow messages (1=INFO, 2=WARNING, 3=ERROR) for a cleaner console.
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ON_EDNN_OPTS'] = '0'

# --- Core Libraries ---
import re
import logging
import math
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

# --- 2. Application Configuration & Initialization ---

# TODO: For production, move API keys to a .env file and load them securely.
OPENAI_API_KEY = "YOUR_API_KEY"
# NCBI requires an email for API access. Provide a default if not set in the environment.
PUBMED_EMAIL = os.environ.get("PUBMED_EMAIL", "aionex.ai.team@gmail.com")

# Constants for external services
NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
OPENALEX_API_BASE = "https://api.openalex.org"
REQUEST_TIMEOUT = 15
# Be a good API citizen by identifying your tool to NCBI.
NCBI_TOOL_PARAMS = {"tool": "AIONEX-NASA-Competition", "email": PUBMED_EMAIL}

# Suppress library-specific logging
hf_logging.set_verbosity_error()

# Initialize Flask App
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
logging.getLogger('werkzeug').setLevel(logging.ERROR) # Silences default Flask server logs

# Global variables for shared resources
summarizer = None
sentiment_analyzer = None
question_answerer = None
chat_histories = {}
# A Lock is crucial to prevent race conditions when multiple requests
# try to use the same shared NLP model simultaneously in a threaded server like Waitress.
model_lock = Lock()

# --- 3. Model Loading ---
try:
    print("[*] AIONEX System Booting...")
    print("[*] Loading NLP models from Hugging Face...")
    # Using a lock here ensures thread-safe initialization, a good practice for concurrent environments.
    with model_lock:
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        sentiment_analyzer = pipeline('sentiment-analysis', model="distilbert-base-uncased-finetuned-sst-2-english")
        question_answerer = pipeline('question-answering', model="distilbert-base-cased-distilled-squad")
    print("  [+] All NLP models loaded successfully.")
    print("\n[*] Conversational AI is powered by OpenAI's GPT API.")
    print("[*] Reputation engine is connected to live public APIs (PubMed, OpenAlex).")

except Exception as e:
    print(f"\n[!] CRITICAL ERROR during model initialization: {e}")
    print("[!] The server cannot start without its core components.")
    exit(1) # Exit immediately if models fail to load.

# --- 4. Helper Functions ---

def get_pmid_from_url(url: str) -> str | None:
    """Extracts the PubMed ID (PMID) from a PubMed URL using regex."""
    match = re.search(r'pubmed\.ncbi\.nlm\.nih\.gov/(\d+)', url)
    return match.group(1) if match else None

def get_article_details(pmid: str) -> dict | None:
    """Fetches detailed article information (title, abstract) using PubMed's efetch utility."""
    try:
        response = requests.get(
            f"{NCBI_EUTILS_BASE}/efetch.fcgi",
            params={"db": "pubmed", "id": pmid, "retmode": "xml", **NCBI_TOOL_PARAMS},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        
        root = BeautifulSoup(response.content, 'xml')
        article = root.find('PubmedArticle')
        if not article:
            return None

        title = article.find('ArticleTitle').get_text(strip=True) if article.find('ArticleTitle') else "Title not found"
        
        # Reconstruct structured abstracts correctly by joining parts.
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

# --- 5. Flask API Routes ---

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def api_search():
    """
    API endpoint to search PubMed using the official E-utilities.
    This is more reliable and efficient than web scraping.
    """
    query = request.json.get('query')
    if not query:
        return jsonify({'error': 'Query is required.'}), 400

    try:
        # Step 1: ESearch - Get a list of PMIDs matching the query.
        search_params = {"db": "pubmed", "term": query, "retmax": "20", "retmode": "json", "sort": "relevance", **NCBI_TOOL_PARAMS}
        search_response = requests.get(f"{NCBI_EUTILS_BASE}/esearch.fcgi", params=search_params, timeout=REQUEST_TIMEOUT)
        search_response.raise_for_status()
        id_list = search_response.json().get("esearchresult", {}).get("idlist", [])

        if not id_list:
            return jsonify([])

        # Step 2: ESummary - Get summaries for the found PMIDs in a single batch.
        summary_params = {"db": "pubmed", "id": ",".join(id_list), "retmode": "json", **NCBI_TOOL_PARAMS}
        summary_response = requests.get(f"{NCBI_EUTILS_BASE}/esummary.fcgi", params=summary_params, timeout=REQUEST_TIMEOUT)
        summary_response.raise_for_status()
        summary_data = summary_response.json().get("result", {})

        # Step 3: Format results into a clean structure for the frontend.
        articles = []
        for pmid in id_list:
            article_data = summary_data.get(pmid)
            if article_data:
                # Safely parse various date formats from PubMed.
                pub_date_str = article_data.get("pubdate", "1900-01-01")
                date_str = "1900-01-01" # Default fallback
                try:
                    # Tries to parse year-only formats like "2023".
                    parsed_date = datetime.strptime(pub_date_str.split(" ")[0], "%Y")
                    date_str = parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    pass # Silently ignore if format is not just a year.

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
    
    # Use the lock to ensure only one request uses the models at a time.
    with model_lock:
        if summarizer and "not available" not in abstract:
            try:
                summary_input = abstract[:4096] # Truncate for safety
                response_data['summary'] = summarizer(summary_input, max_length=150, min_length=40, do_sample=False)[0]['summary_text']
            except Exception as e:
                print(f"[!] Summarization failed: {e}")
                response_data['summary'] = "AI summary could not be generated."
        
        if sentiment_analyzer and "not available" not in abstract:
            try:
                # Truncate abstract to 512 chars for the sentiment model to prevent errors.
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
        
    with model_lock:
        try:
            result = question_answerer(question=question, context=context)
            # If the model's confidence is low, the answer is likely irrelevant.
            # This prevents returning nonsensical answers.
            if result['score'] < 0.1: # This threshold can be tuned.
                return jsonify({'answer': "A clear answer could not be found in the text."})
            return jsonify(result)
        except Exception as e:
            print(f"[!] Question-answering model failed: {e}")
            return jsonify({'error': 'The Question & Answering service is not available.'}), 503

@app.route('/api/translate', methods=['POST'])
def api_translate():
    """Translates a list of texts to a target language using the deep-translator library."""
    payload = request.json
    texts = payload.get("texts", [])
    lang = payload.get("lang", "en")

    if not texts:
        return jsonify({"translations": []})
        
    # The library expects 'zh-CN' for Mandarin, so we correct it here.
    if lang == 'zh':
        lang = 'zh-CN'

    try:
        # The library handles API calls and fallbacks gracefully.
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
    try:
        # Step 1: Get core metadata from PubMed ESummary. This is the most critical data.
        summary_params = {"db": "pubmed", "id": pmid, "retmode": "json", **NCBI_TOOL_PARAMS}
        summary_res = requests.get(f"{NCBI_EUTILS_BASE}/esummary.fcgi", params=summary_params, timeout=REQUEST_TIMEOUT)
        summary_res.raise_for_status()
        res = summary_res.json().get("result", {}).get(pmid, {})
        
        journal_title = res.get("fulljournalname", "")
        pub_year = int((res.get("pubdate") or "1900").split(" ")[0])
        first_author = (res.get("authors")[0].get("name")) if res.get("authors") else None
        is_open_access = any(aid.get("idtype") == "pmcid" for aid in res.get("articleids", []))

        # Step 2: Get citation count from PubMed ELink.
        citations = 0
        try:
            elink_params = {"dbfrom": "pubmed", "linkname": "pubmed_pubmed_citedin", "id": pmid, "retmode": "json", **NCBI_TOOL_PARAMS}
            elink_res = requests.get(f"{NCBI_EUTILS_BASE}/elink.fcgi", params=elink_params, timeout=REQUEST_TIMEOUT)
            if elink_res.ok:
                linkset = elink_res.json().get("linksets", [])
                if linkset and linkset[0].get("linksetdbs"):
                    citations = len(linkset[0]["linksetdbs"][0].get("links", []))
        except Exception:
            pass # Fail silently, as this is an enhancement.

        # Step 3 & 4: Use OpenAlex for journal and author activity (often has richer data).
        journal_activity, author_pubs = 0, 0
        try:
            if journal_title:
                oa_res = requests.get(f"{OPENALEX_API_BASE}/venues", params={"filter": f"display_name.search:{journal_title}", "per-page": "1"}, timeout=REQUEST_TIMEOUT)
                if oa_res.ok and oa_res.json().get("results"):
                    journal_activity = oa_res.json()["results"][0].get("works_count", 0)
            if first_author:
                oa_res = requests.get(f"{OPENALEX_API_BASE}/authors", params={"filter": f"display_name.search:{first_author}", "per-page": "1"}, timeout=REQUEST_TIMEOUT)
                if oa_res.ok and oa_res.json().get("results"):
                    author_pubs = oa_res.json()["results"][0].get("works_count", 0)
        except Exception:
            pass # Also fail silently for this non-critical API.

        # --- Scoring Logic (0-100 scale) ---
        def scale_log(value, max_val):
            """Scales a value logarithmically, which is better for data with a wide range like citations."""
            if value <= 0: return 0
            return min(100, int(100 * math.log10(1 + value) / math.log10(1 + max_val)))

        citations_score = scale_log(citations, 200) # Capping at 200 recent citations is a strong signal.
        open_access_score = 100 if is_open_access else 30 # Strong bonus for open access.
        recency_score = max(10, 100 - (datetime.now().year - pub_year) * 5) # Score decays over time.
        journal_activity_score = scale_log(journal_activity, 50000) # Top journals have >50k works.
        author_activity_score = scale_log(author_pubs, 300) # Prolific authors have >300 works.

        return jsonify({
            "components": {
                "Citations": citations_score, "Open Access": open_access_score,
                "Recency": recency_score, "Journal Activity": journal_activity_score,
                "Author Activity": author_activity_score,
            }
        })
    except Exception as e:
        print(f"[Reputation Engine] Failed for PMID {pmid}: {e}")
        return jsonify({"error": "Could not retrieve full reputation data."}), 502

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Handles conversational AI requests to OpenAI."""
    payload = request.json
    user_input = payload.get('message')
    conversation_id = payload.get('conversation_id')

    # Robust check for API key and required parameters
    if not all([user_input, conversation_id]):
        return jsonify({'error': 'A message and conversation_id are required.'}), 400
    if not (OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")):
        return jsonify({'error': 'OpenAI API key is not configured on the server.'}), 503

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

        # Update and truncate conversation history
        history.extend([{'role': 'user', 'content': user_input}, {'role': 'assistant', 'content': ai_reply}])
        chat_histories[conversation_id] = history[-6:] # Keep only the last 3 turns

        return jsonify({'reply': ai_reply, 'sources': []})
        
    except requests.exceptions.RequestException as e:
        print(f"[!] OpenAI API connection error: {e}")
        return jsonify({'error': 'Sorry, I am having trouble connecting to the network.'}), 504
    except Exception as e:
        print(f"[!] An unexpected error occurred in the chat handler: {e}")
        return jsonify({'error': 'Sorry, an internal error occurred on my end.'}), 500

# --- 6. Main Execution Block ---

if __name__ == '__main__':
    print("\n[+] All systems nominal. AIONEX is fully operational.")
    print(f"[*] Access the project at: http://127.0.0.1:5000")
    serve(app, host='0.0.0.0', port=5000)
