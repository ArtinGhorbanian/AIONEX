# -*- coding: utf-8 -*-
"""
AIONEX Backend Server
Team Name: AIONEX
Date: 05-10-2025

This Flask application serves as the backend for the AIONEX project.
It handles PubMed article scraping, NLP analysis (summarization, sentiment analysis),
and provides a conversational AI interface powered by OpenAI's GPT models.
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

# --- Third-party Libraries ---
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from transformers import pipeline, logging as hf_logging
from googlesearch import search
from waitress import serve # Using Waitress for a clean, production-ready server

# --- Application Configuration & Initialization ---

# Best practice: move this to an environment variable in a real-world scenario
OPENAI_API_KEY = "my_api_key" 

# Suppress verbose logging from libraries to keep console clean
hf_logging.set_verbosity_error()

# Initialize Flask App
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app) # Enable Cross-Origin Resource Sharing for the frontend

# Silence default Flask server logs for a cleaner startup message
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Global variables for models and browser driver
# We initialize them as None and load them in a try-except block
summarizer = None
sentiment_analyzer = None
question_answerer = None
driver = None
chat_histories = {} # Simple in-memory cache for conversation histories

# --- 2. Model & Browser Engine Loading ---
# This block attempts to load all necessary components at startup.
# If any part fails, the application will print an error and refuse to start.

try:
    print("[*] AIONEX System Booting...")
    
    # Load Hugging Face NLP models
    print("[*] Loading NLP models from Hugging Face...")
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    print("  [+] Summarization model loaded successfully.")
    sentiment_analyzer = pipeline('sentiment-analysis', model="distilbert-base-uncased-finetuned-sst-2-english")
    print("  [+] Sentiment Analysis model loaded successfully.")
    question_answerer = pipeline('question-answering', model="distilbert-base-cased-distilled-squad")
    print("  [+] Question Answering model loaded successfully.")
    
    print("\n[*] Conversational AI is now powered by OpenAI's GPT API.")

    # Configure and initialize a headless Selenium Chrome browser
    print("[*] Initializing stealth headless browser engine...")
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu") # Necessary for some headless environments
    options.add_argument("--window-size=1920,1080")
    # This user agent helps to avoid bot detection
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
    
    # Further attempts to appear as a regular user and suppress logs
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument('--log-level=3') # Suppress most browser console logs

    # Redirect the service's own logs to the null device to ensure silence
    service = Service(ChromeDriverManager().install(), log_output=os.devnull)
    driver = webdriver.Chrome(service=service, options=options)
    print("[+] Browser engine is online and ready.\n")

except Exception as e:
    print(f"\n[!] CRITICAL ERROR during initialization: {e}")
    print("[!] The server cannot start without all its core components. Please check your connection and dependencies.")

# --- 3. Helper Functions & Core Logic ---

def get_web_snippet(url: str) -> str | None:
    """
    Fetches a brief snippet from a given URL.
    It first tries to get the meta description, then falls back to the first paragraph.
    
    Args:
        url (str): The URL to fetch content from.

    Returns:
        str or None: The extracted snippet text, or None if fetching fails.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Prioritize the meta description tag for a concise summary
        meta_description = soup.find('meta', attrs={'name': 'description'})
        if meta_description and meta_description.get('content'):
            return meta_description.get('content').strip()

        # Fallback: grab the first paragraph if no meta description is found
        first_paragraph = soup.find('p')
        if first_paragraph and first_paragraph.get_text():
            return first_paragraph.get_text().strip()

        return "Could not retrieve a meaningful snippet from the page."
    except requests.exceptions.RequestException as e:
        # Don't crash, just log and return None
        print(f"    - Could not fetch {url}: {e}")
        return None

def parse_pubmed_date(date_str: str) -> str:
    """
    Parses a date string from PubMed's citation format into 'YYYY-MM-DD'.
    Handles various formats like '2023', '2023 Oct', '2023 Oct 15'.

    Args:
        date_str (str): The raw date string from the citation.

    Returns:
        str: A formatted date string. Defaults to '1900-01-01' if parsing fails.
    """
    if not date_str:
        return "1900-01-01"
    
    # Regex to capture year, month (optional), and day (optional)
    match = re.search(r'(\d{4})(?: (\w{3}))?(?: (\d{1,2}))?', date_str)
    if not match:
        return "1900-01-01" # Fallback for unexpected formats
        
    year, month_str, day = match.groups()
    month_map = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    }
    
    month = month_map.get(month_str, 1) # Default to January if no month
    day = int(day) if day else 1       # Default to the 1st if no day
    
    try:
        return datetime(int(year), month, day).strftime('%Y-%m-%d')
    except ValueError:
        # Handles cases like '2023 Feb 30'
        return f"{year}-01-01"

def search_pubmed(query: str) -> list | None:
    """
    Uses Selenium to search PubMed and scrape the first page of results.
    
    Args:
        query (str): The search term.
        
    Returns:
        list or None: A list of article dictionaries, or None on failure.
    """
    if not driver:
        return None
    
    url = f'https://pubmed.ncbi.nlm.nih.gov/?term={query}'
    try:
        driver.get(url)
        # Wait for the search results to actually load on the page
        WebDriverWait(driver, 20).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "section.search-results-list article"))
        )
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        scraped_articles = []
        article_elements = soup.find_all('article', class_='full-docsum')

        for article in article_elements:
            title_tag = article.find('a', class_='docsum-title')
            citation_tag = article.find('span', class_='docsum-journal-citation')
            
            if title_tag and citation_tag:
                scraped_articles.append({
                    'title': title_tag.get_text(strip=True),
                    'link': f"https://pubmed.ncbi.nlm.nih.gov{title_tag['href']}",
                    'date': parse_pubmed_date(citation_tag.get_text(strip=True))
                })
        return scraped_articles
    except Exception as e:
        print(f"[!] Error during PubMed search for '{query}': {e}")
        return None

def get_article_details(url: str) -> dict | None:
    """
    Scrapes the title and abstract from a specific PubMed article page.
    
    Args:
        url (str): The URL of the PubMed article.

    Returns:
        dict or None: A dictionary with title and abstract, or None on failure.
    """
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('h1', class_='heading-title').get_text(strip=True) if soup.find('h1', class_='heading-title') else "Title not found"
        abstract_div = soup.find('div', class_='abstract-content')
        
        if abstract_div:
            # Join all paragraphs and subheadings within the abstract
            abstract_text = "\n\n".join(p.get_text(strip=True) for p in abstract_div.find_all(['p', 'h4']))
        else:
            abstract_text = "Abstract not available."
            
        return {'title': title, 'abstract': abstract_text}
    except Exception as e:
        print(f"[!] Failed to get article details from {url}: {e}")
        return None

# --- 4. Flask API Routes ---

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def api_search():
    """API endpoint to search PubMed."""
    payload = request.json
    query = payload.get('query')
    
    if not query:
        return jsonify({'error': 'Query is required.'}), 400
        
    articles = search_pubmed(query)
    if articles is not None:
        return jsonify(articles)
        
    return jsonify({'error': 'The PubMed search service is currently unavailable.'}), 503

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """API endpoint to analyze a single article (summary, sentiment)."""
    payload = request.json
    url = payload.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required.'}), 400
        
    details = get_article_details(url)
    if not details:
        return jsonify({'error': 'Failed to retrieve article details from the provided URL.'}), 500
        
    abstract = details['abstract']
    response_data = {**details, 'link': url}
    
    # Only run analysis if the abstract is actually available
    if summarizer and "not available" not in abstract:
        response_data['summary'] = summarizer(abstract, max_length=150, min_length=40, do_sample=False)[0]['summary_text']
    
    if sentiment_analyzer and "not available" not in abstract:
        response_data['sentiment'] = sentiment_analyzer(abstract)[0]['label']
        
    return jsonify(response_data)

@app.route('/api/ask', methods=['POST'])
def api_ask():
    """API endpoint for question-answering over a given context."""
    payload = request.json
    if not payload or 'question' not in payload or 'context' not in payload:
        return jsonify({'error': 'Both "question" and "context" are required fields.'}), 400
        
    if question_answerer:
        result = question_answerer(question=payload['question'], context=payload['context'])
        return jsonify(result)
        
    return jsonify({'error': 'The Question & Answering service is not available.'}), 503

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """API endpoint for the conversational AI chat."""
    payload = request.json
    user_input = payload.get('message')
    conversation_id = payload.get('conversation_id')
    search_web_enabled = payload.get('search_web', False)

    if not user_input or not conversation_id:
        return jsonify({'error': 'A message and a conversation_id are required.'}), 400
        
    if not OPENAI_API_KEY or "my_api_key" in OPENAI_API_KEY:
        return jsonify({'reply': "I can't connect to the AI brain. The OpenAI API key is missing on the server."}), 503

    # Retrieve or initialize conversation history
    history = chat_histories.get(conversation_id, [])
    sources = []
    web_context = ""

    if search_web_enabled:
        print(f"[*] Performing web search for: '{user_input}'")
        try:
            search_results_urls = list(search(user_input, num_results=3, lang="en"))
            
            if search_results_urls:
                web_context_parts = ["You MUST use the following web search results to answer the user's question:\n"]
                for url in search_results_urls:
                    print(f"  -> Fetching snippet from: {url}")
                    snippet = get_web_snippet(url)
                    if snippet:
                        sources.append(url)
                        web_context_parts.append(f"Source URL: {url}\nContent: {snippet}\n")
                web_context = "\n".join(web_context_parts)
            else:
                web_context = "Web search returned no results. You must answer based on your own knowledge.\n\n"
        except Exception as e:
            print(f"[!] Web search failed: {e}")
            web_context = "An error occurred during the web search. Rely on your internal knowledge.\n\n"

    # Define the AI's persona and rules
    system_prompt = (
        "You are AIONEX, a friendly and enthusiastic AI assistant specializing in space, astronomy, and NASA. "
        "1. Your knowledge is strictly limited to these topics. "
        "2. If asked about any other topic (like Bitcoin, cooking, etc.), you MUST politely refuse to answer. "
        "3. If web search results are provided, you MUST base your answer on them and only them. "
        "4. Default to English, but if the user writes in another language, you should respond in that same language."
    )
    
    # Construct the message payload for OpenAI
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn['role'].lower(), "content": turn['content']})
    
    # Add web context if it exists
    if web_context:
        messages.append({"role": "system", "content": web_context})

    messages.append({"role": "user", "content": user_input})
    
    headers = { "Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json" }
    api_payload = { "model": "gpt-3.5-turbo", "messages": messages }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=api_payload, timeout=30)
        response.raise_for_status()
        
        api_response = response.json()
        ai_reply = api_response['choices'][0]['message']['content'].strip()

        # Update and truncate conversation history
        history.append({'role': 'User', 'content': user_input})
        history.append({'role': 'Assistant', 'content': ai_reply})
        chat_histories[conversation_id] = history[-6:] # Keep only the last 3 turns

        return jsonify({'reply': ai_reply, 'sources': sources})
        
    except requests.exceptions.RequestException as e:
        print(f"[!] OpenAI API connection error: {e}")
        return jsonify({'reply': 'Sorry, I am having trouble connecting to the network. Please try again.', 'sources': []}), 504
    except Exception as e:
        print(f"[!] An unexpected error occurred in the chat handler: {e}")
        return jsonify({'reply': 'Sorry, an internal error occurred on my end. Please try again.', 'sources': []}), 500


# --- 5. Main Execution Block ---
if __name__ == '__main__':
    # Final check before starting the server
    if not all([summarizer, sentiment_analyzer, question_answerer, driver]):
        print("[!] SERVER SHUTDOWN: A critical component failed to load during initialization.")
    else:
        print("[+] All systems nominal. AIONEX is fully operational.")
        print(f"[*] Access the project at: http://127.0.0.1:5000")
        try:
            # Use waitress for a clean and professional server start
            serve(app, host='0.0.0.0', port=5000)
        finally:
            # Ensure the browser driver is properly closed on exit
            print("\n[*] Shutting down browser engine...")
            if driver:
                driver.quit()
            print("[+] Shutdown complete.")