# -*- coding: utf-8 -*-
"""
AIONEX Project :: Backend Server
Written by: AIONEX Team
Date: October 5, 2025

This Flask server powers the AIONEX application. It provides a suite of APIs to:
- Search and retrieve scientific articles from PubMed.
- Perform NLP tasks (summarization, sentiment analysis, Q&A) using Hugging Face models.
- Calculate real-time article reputation scores using PubMed and OpenAlex data.
- Offer a conversational AI assistant via the OpenAI API.
"""

# 1. SETUP & IMPORTS
# ==============================================================================

# Standard Library Imports
import os
import re
import math
import logging
from datetime import datetime
from threading import Lock

# Third-party Imports
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline, logging as hf_logging
from waitress import serve
from deep_translator import GoogleTranslator

# Suppress excessive TensorFlow/Hugging Face logging before they are used.
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
hf_logging.set_verbosity_error()


# 2. CONFIGURATION & GLOBAL STATE
# ==============================================================================

# --- API Keys & Endpoints ---
# IMPORTANT: In a real production environment, this key should be loaded securely,
# for example, from environment variables or a secret management service.
OPENAI_API_KEY = "api-key"

NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
REQUEST_TIMEOUT_SECONDS = 15

# --- NCBI API Usage Policy ---
# To be a good API citizen, we identify our tool and provide an email if available.
# See: https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.E-utilities_and_Fair_Usage_Polici
TOOL_IDENTITY_PARAMS = {"tool": "aionex-nasa-hackathon"}
EMAIL_ADDRESS = os.environ.get("PUBMED_EMAIL", "").strip()
if EMAIL_ADDRESS:
    TOOL_IDENTITY_PARAMS["email"] = EMAIL_ADDRESS

# --- Flask App Initialization ---
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
# Hide standard Flask server logs for a cleaner console output with Waitress.
logging.getLogger('werkzeug').setLevel(logging.ERROR)

# --- Global NLP Models & State ---
# These are loaded once at startup to avoid reloading on every API call.
summarizer = None
sentiment_analyzer = None
question_answerer = None
chat_histories = {}  # In-memory cache for chat sessions.
model_lock = Lock()  # A thread-safe lock for accessing the shared NLP models.


# 3. UTILITY & HELPER FUNCTIONS
# ==============================================================================

def get_pmid_from_url(url: str) -> str | None:
    """Extracts the PubMed ID (PMID) from a pubmed.ncbi.nlm.nih.gov URL."""
    match = re.search(r'pubmed\.ncbi\.nlm\.nih\.gov/(\d+)', url)
    return match.group(1) if match else None

def parse_pubmed_date(date_str: str) -> str:
    """Attempts to parse various PubMed date formats into a standard YYYY-MM-DD."""
    # Common formats: "2023", "2023 Sep", "2023 Sep 15"
    date_part = date_str.split(" ")[0]
    formats_to_try = ["%Y", "%Y %b", "%Y %b %d"]
    for fmt in formats_to_try:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return "1900-01-01" # Return a fallback date if all parsing fails.

def scale_logarithmically(value: int, max_val_cap: int) -> int:
    """Scales a value onto a 0-100 logarithmic scale. Useful for metrics like citations."""
    if value <= 0:
        return 0
    # A log scale makes the score feel more natural for data with a wide distribution.
    scaled_score = 100 * math.log10(1 + value) / math.log10(1 + max_val_cap)
    return min(100, int(scaled_score))


# 4. CORE API SERVICES
# ==============================================================================

@app.route('/')
def serve_app():
    """Serves the main single-page application (index.html)."""
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def search_pubmed():
    """
    Searches PubMed for a given query.
    This uses a two-step process (ESearch -> ESummary) for efficiency.
    """
    query = request.json.get('query')
    if not query:
        return jsonify({'error': 'A search query is required.'}), 400

    try:
        # Step 1: ESearch to get a list of PubMed IDs (PMIDs) for the query.
        esearch_params = {"db": "pubmed", "term": query, "retmax": "20", "retmode": "json", "sort": "relevance", **TOOL_IDENTITY_PARAMS}
        search_res = requests.get(f"{NCBI_EUTILS_BASE}/esearch.fcgi", params=esearch_params, timeout=REQUEST_TIMEOUT_SECONDS)
        search_res.raise_for_status()
        id_list = search_res.json().get("esearchresult", {}).get("idlist", [])

        if not id_list:
            return jsonify([]) # No results found.

        # Step 2: ESummary to fetch brief details for all found PMIDs in one call.
        esummary_params = {"db": "pubmed", "id": ",".join(id_list), "retmode": "json", **TOOL_IDENTITY_PARAMS}
        summary_res = requests.get(f"{NCBI_EUTILS_BASE}/esummary.fcgi", params=esummary_params, timeout=REQUEST_TIMEOUT_SECONDS)
        summary_res.raise_for_status()
        summary_data = summary_res.json().get("result", {})

        # Step 3: Format the results into a clean list for the frontend.
        articles = []
        for pmid in id_list:
            article_data = summary_data.get(pmid)
            if article_data:
                articles.append({
                    'title': article_data.get("title", "No Title Available"),
                    'link': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    'date': parse_pubmed_date(article_data.get("pubdate", "1900")),
                })
        return jsonify(articles)

    except requests.exceptions.RequestException as e:
        print(f"[API ERROR] PubMed search failed: {e}")
        return jsonify({'error': 'The PubMed search service is currently unavailable.'}), 503
    except Exception as e:
        print(f"[SERVER ERROR] An unexpected error occurred during search: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_article():
    """
    Fetches full article details, then runs summarization and sentiment analysis.
    """
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'Article URL is required.'}), 400

    pmid = get_pmid_from_url(url)
    if not pmid:
        return jsonify({'error': 'Invalid PubMed URL provided.'}), 400

    # Fetch the full abstract and title.
    details = get_article_details(pmid)
    if not details:
        return jsonify({'error': 'Failed to retrieve article details from PubMed.'}), 500

    response_data = {**details, 'link': url}
    abstract = details['abstract']
    
    # Run NLP models if an abstract is available.
    if "not available" not in abstract:
        with model_lock:
            try:
                # Summarization
                summary_output = summarizer(abstract, max_length=150, min_length=40, do_sample=False)
                response_data['summary'] = summary_output[0]['summary_text']
                
                # Sentiment Analysis
                # Truncate abstract to the model's max input size (~512 tokens).
                sentiment_output = sentiment_analyzer(abstract[:512])
                response_data['sentiment'] = sentiment_output[0]['label']

            except Exception as e:
                print(f"[NLP ERROR] Model inference failed for PMID {pmid}: {e}")
                response_data['summary'] = "AI summary could not be generated for this article."
                response_data['sentiment'] = "UNKNOWN"
            
    return jsonify(response_data)

@app.route('/api/ask', methods=['POST'])
def answer_question():
    """
    Uses a question-answering model to find an answer within a given text context.
    """
    payload = request.json
    question = payload.get('question', '').strip()
    context = payload.get('context', '').strip()

    if not all([question, context]):
        return jsonify({'error': 'Both "question" and "context" are required.'}), 400
        
    # A small heuristic to avoid processing very short/nonsensical questions.
    if len(question.split()) < 3:
        return jsonify({'answer': "Please ask a more specific question about the text."})

    with model_lock:
        try:
            result = question_answerer(question=question, context=context)
            # If the model's confidence score is very low, the answer is likely irrelevant.
            if result['score'] < 0.1: # This threshold can be fine-tuned.
                return jsonify({'answer': "A clear answer could not be found in the text."})
            return jsonify(result)
        except Exception as e:
            print(f"[NLP ERROR] Question-answering model failed: {e}")
            return jsonify({'error': 'The Q&A service is currently unavailable.'}), 503

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """
    Translates a batch of texts to a specified target language.
    """
    payload = request.json
    texts = payload.get("texts", [])
    lang = payload.get("lang", "en")

    if not texts:
        return jsonify({"translations": []})
        
    # The 'deep_translator' library expects 'zh-CN' for Mandarin, not just 'zh'.
    if lang == 'zh':
        lang = 'zh-CN'

    try:
        translated_texts = GoogleTranslator(source="auto", target=lang).translate_batch(texts)
        return jsonify({"translations": translated_texts})
    except Exception as e:
        print(f"[TRANSLATE ERROR] Translation to '{lang}' failed: {e}")
        # On failure, return the original texts so the UI doesn't break.
        return jsonify({"translations": texts})

@app.route('/api/reputation/<pmid>')
def get_reputation_score(pmid: str):
    """
    Calculates a multi-faceted reputation score for an article.

    This is not an official academic metric but a pragmatic proxy based on live,
    public data signals from PubMed and OpenAlex.
    """
    # 1. Fetch core metadata from PubMed (authors, journal, year, open access status)
    try:
        summary_res = requests.get(
            f"{NCBI_EUTILS_BASE}/esummary.fcgi",
            params={"db": "pubmed", "id": pmid, "retmode": "json", **TOOL_IDENTITY_PARAMS},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        summary_res.raise_for_status()
        res = summary_res.json().get("result", {}).get(pmid, {})
        journal_title = res.get("fulljournalname", "")
        pub_year = int((res.get("pubdate") or "1900").split(" ")[0])
        first_author = res.get("authors")[0].get("name") if res.get("authors") else None
        # Check for PMCID, a good indicator of being in an open access repository.
        is_open_access = any(aid.get("idtype") == "pmcid" for aid in res.get("articleids", []))
    except Exception:
        return jsonify({"error": "Could not retrieve basic metadata from PubMed."}), 502

    # 2. Fetch citation count from PubMed
    citations = 0
    try:
        elink_res = requests.get(
            f"{NCBI_EUTILS_BASE}/elink.fcgi",
            params={"dbfrom": "pubmed", "linkname": "pubmed_pubmed_citedin", "id": pmid, "retmode": "json", **TOOL_IDENTITY_PARAMS},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        elink_res.raise_for_status()
        linkset = elink_res.json().get("linksets", [])
        if linkset and linkset[0].get("linksetdbs"):
            citations = len(linkset[0]["linksetdbs"][0].get("links", []))
    except Exception as e:
        print(f"[REPUTATION] Failed to get citation count for {pmid}: {e}")

    # 3. Fetch journal and author activity from OpenAlex (often has better coverage)
    journal_activity = 0
    if journal_title:
        try:
            oa_res = requests.get(
                "https://api.openalex.org/venues",
                params={"filter": f"display_name.search:{journal_title}", "per-page": "1"},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            oa_res.raise_for_status()
            venue_data = oa_res.json().get("results", [])
            if venue_data:
                journal_activity = venue_data[0].get("works_count", 0)
        except Exception as e:
            print(f"[REPUTATION] Failed to get journal activity for '{journal_title}': {e}")

    author_pubs = 0
    if first_author:
        try:
            oa_res = requests.get(
                "https://api.openalex.org/authors",
                params={"filter": f"display_name.search:{first_author}", "per-page": "1"},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            oa_res.raise_for_status()
            author_data = oa_res.json().get("results", [])
            if author_data:
                author_pubs = author_data[0].get("works_count", 0)
        except Exception as e:
            print(f"[REPUTATION] Failed to get author activity for '{first_author}': {e}")
            
    # 4. Calculate final scores on a 0-100 scale.
    citations_score = scale_logarithmically(citations, 200) # Capped at 200 for a reasonable scale.
    open_access_score = 100 if is_open_access else 30 # Strong bonus for open access.
    
    years_ago = max(0, datetime.now().year - pub_year)
    recency_score = max(10, 100 - (years_ago * 5)) # Score decays over time.

    journal_activity_score = scale_logarithmically(journal_activity, 50000) # Top journals have >50k works.
    author_activity_score = scale_logarithmically(author_pubs, 300) # Prolific authors have ~300+ papers.

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
def handle_chat():
    """Manages the conversational AI assistant logic with OpenAI."""
    payload = request.json
    user_input = payload.get('message')
    conversation_id = payload.get('conversation_id')

    if not all([user_input, conversation_id, OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")]):
        error_msg = "A message and conversation_id are required."
        if not (OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")):
            error_msg = "The OpenAI API key is not configured on the server."
        return jsonify({'error': error_msg}), 400 if 'key' not in error_msg else 503

    history = chat_histories.get(conversation_id, [])
    
    # This prompt guides the AI's personality and knowledge domain.
    system_prompt = (
        "You are AIONEX, a friendly and enthusiastic AI assistant specializing in space, astronomy, and NASA. "
        "Your knowledge is strictly limited to these topics. If asked about anything else, you MUST politely refuse to answer. "
        "Default to English, but if the user writes in another language, you must respond in that same language."
    )
    
    # Construct the message history for the API call.
    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_input}]
    
    headers = { "Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json" }
    api_payload = { "model": "gpt-3.5-turbo", "messages": messages }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=api_payload, timeout=30)
        response.raise_for_status()
        
        api_response = response.json()
        ai_reply = api_response['choices'][0]['message']['content'].strip()

        # Update the conversation history.
        history.extend([{'role': 'user', 'content': user_input}, {'role': 'assistant', 'content': ai_reply}])
        # Keep only the last 3 turns (6 messages) to manage token limits.
        chat_histories[conversation_id] = history[-6:]

        return jsonify({'reply': ai_reply})
        
    except requests.exceptions.RequestException as e:
        print(f"[API ERROR] OpenAI connection failed: {e}")
        return jsonify({'error': 'Sorry, the AI assistant is having trouble connecting to the network.'}), 504
    except Exception as e:
        print(f"[SERVER ERROR] Chat handler failed: {e}")
        return jsonify({'error': 'Sorry, an internal error occurred with the AI assistant.'}), 500

def get_article_details(pmid: str) -> dict | None:
    """
    Fetches the title and full abstract for a given PMID using the efetch utility.
    This is a separate, more detailed call than ESummary.
    """
    try:
        response = requests.get(
            f"{NCBI_EUTILS_BASE}/efetch.fcgi",
            params={"db": "pubmed", "id": pmid, "retmode": "xml", **TOOL_IDENTITY_PARAMS},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'xml')
        article = soup.find('PubmedArticle')
        if not article:
            return None

        title = article.find('ArticleTitle').get_text(strip=True) if article.find('ArticleTitle') else "Title not found"
        
        # Handle structured abstracts (e.g., BACKGROUND, METHODS, RESULTS) by joining parts.
        abstract_parts = []
        for abstract_text in article.find_all('AbstractText'):
            label = abstract_text.get('Label')
            text = abstract_text.get_text(strip=True)
            if label:
                abstract_parts.append(f"**{label.title()}:** {text}")
            else:
                abstract_parts.append(text)
        
        abstract = "\n\n".join(abstract_parts) if abstract_parts else "Abstract not available."
        
        return {'title': title, 'abstract': abstract}
        
    except requests.exceptions.RequestException as e:
        print(f"[API ERROR] Failed to fetch details for PMID {pmid}: {e}")
        return None
    except Exception as e:
        print(f"[SERVER ERROR] Failed to parse details for PMID {pmid}: {e}")
        return None


# 5. SERVER STARTUP
# ==============================================================================
def load_nlp_models():
    """Loads all Hugging Face models into memory. Called once at startup."""
    global summarizer, sentiment_analyzer, question_answerer
    print("Booting AIONEX backend...")
    print("Loading NLP models from Hugging Face (this may take a moment)...")
    with model_lock:
        # This explicitly tells Transformers to load the PyTorch weights,
        # resolving the framework mismatch error.
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", from_pt=True)
        sentiment_analyzer = pipeline('sentiment-analysis', model="distilbert-base-uncased-finetuned-sst-2-english", from_pt=True)
        question_answerer = pipeline('question-answering', model="distilbert-base-cased-distilled-squad", from_pt=True)
    print("  -> All models loaded successfully.")

if __name__ == '__main__':
    try:
        load_nlp_models()
        print("\n[OK] AIONEX is fully operational.")
        print(f" -> Access the application at http://12-7.0.0.1:5000")
        # Use Waitress, a production-quality WSGI server.
        serve(app, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"\n[FATAL] A critical error occurred during startup: {e}")
        print("[FATAL] The server cannot continue. Please check the logs.")
        exit(1)
