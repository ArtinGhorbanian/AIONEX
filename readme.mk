# AIONEX: Cosmic Knowledge Gateway

<p align="center">
  <img src="static/AIONEX.jpg" alt="AIONEX Logo" width="150"/>
</p>

<p align="center">
  <em>An AI-powered web application designed for the <b>NASA Space Apps Challenge 2025</b> to make space biology and astronomy research more accessible and engaging.</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-technology-stack">Technology Stack</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-quickstart-guide">Quickstart</a> •
  <a href="#-license">License</a>
</p>

---

AIONEX is an intelligent interface for exploring the vast universe of scientific literature on PubMed. By leveraging modern AI models and a dynamic user interface, it transforms the dense, text-heavy world of research into an interactive, insightful, and multi-lingual experience. Our goal is to empower students, researchers, and enthusiasts to discover and understand complex scientific topics with unprecedented ease.

## 🚀 Features

AIONEX is packed with features designed to streamline the research process:

-   🧠 Intelligent Search & Analysis:
    -   Live PubMed Search: Directly queries the PubMed database using a stealth, automated browser engine.
    -   AI-Powered Summarization: Uses a distilbart-cnn model to generate concise, readable summaries of complex abstracts.
    -   Sentiment Analysis: Quickly gauges the tone and sentiment of the research abstract (Positive/Negative).
    -   Interactive Q&A: Ask questions directly about an article's abstract and get answers from an AI model trained on SQuAD.

-   🤖 Conversational AI Assistant:
    -   An integrated chatbot powered by OpenAI's GPT-3.5-Turbo API.
    -   Specialized in answering questions about space, astronomy, and NASA.
    -   Features an optional Web Search mode to pull in real-time information from the internet to answer questions.

-   📊 Advanced Data Visualization:
    -   Article Metrics (Demonstration): Displays beautiful, animated bar graphs for simulated metrics like *Citations, Recency, and Journal Activity*. This feature demonstrates how real-world data could be visualized to show article impact.
    -   *Disclaimer: These metrics are randomly generated for demonstration purposes and do not reflect real data.*

-   🌐 Multi-Language Support:
    -   Full UI Translation: The entire user interface can be switched between English, Chinese, Spanish, Hindi, and French.
    -   On-the-Fly Translation (Simulated): Article titles, summaries, and abstracts can be "translated" to the selected language, demonstrating the architecture for a fully localized experience.

-   ✨ Immersive User Experience:
    -   A stunning Three.js animated starfield background that reacts to mouse movement.
    -   A smooth, fluid UI powered by the GSAP animation library.
    -   A custom glowing cursor and a futuristic design aesthetic to make research feel like an exploration.

---

## 🛠️ Technology Stack

AIONEX is built with a modern stack, combining a powerful Python backend with a dynamic, interactive frontend.

| Backend                                                                                                | Frontend                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 🐍 Python 3.10+ | ✨ JavaScript (ES6+) |
| 🌐 Flask & Waitress (for API and serving)                                                      | 🎨 HTML5 & CSS3 |
| 🤖 Hugging Face Transformers (for NLP tasks)                                                       | 🌌 Three.js (for the 3D starfield background)
| 🕷️ Selenium & BeautifulSoup4 (for web scraping)                                                | 🎬 GSAP (GreenSock) (for high-performance animations)                                                |
| 🧠 OpenAI API (for the conversational AI)                                                          |                                                                                                          |

---

## ⚙️ How It Works

The application follows a simple yet powerful data flow:

1.  Search: The user enters a query on the frontend.
2.  Scraping: The request is sent to the Flask backend, which uses Selenium to perform a live search on PubMed and scrape the results.
3.  Analysis: When the user clicks an article, its abstract is sent to the backend. Hugging Face Transformers models then perform summarization, sentiment analysis, and prepare for Q&A.
4.  Display: The processed data, along with simulated metrics, is returned to the frontend and displayed in a clean, interactive view.
5.  Conversation: The AIONEX AI Assistant communicates directly with the OpenAI API, using a system prompt to maintain its persona as a space expert.

---

## 🏁 Quickstart Guide

Get AIONEX running on your local machine in a few simple steps.

### 1. Prerequisites

-   Python 3.10 or newer.
-   git for cloning the repository.
-   A modern web browser (like Chrome or Firefox).

### 2. Clone the Repository

Open your terminal and run the following command:

`bash
git clone [https://github.com/](https://github.com/)<your-username>/aionex-project.git
cd aionex-project

3. Set Up a Virtual Environment (Recommended)
It's best practice to create a virtual environment to manage project dependencies.
 * On macOS/Linux:
   python3 -m venv venv
source venv/bin/activate

 * On Windows:
   python -m venv venv
.\venv\Scripts\activate

4. Install Dependencies
Install all the required Python packages using the requirements.txt file.
pip install -r requirements.txt

5. Configure API Key
For the conversational AI to work, you need an OpenAI API key.
 * Open the app.py file.
 * Find the line OPENAI_API_KEY = "my-api-key".
 * Replace "my-api-key" with your actual OpenAI API key.
6. Run the Application
Start the server with this simple command:
python app.py

You should see output indicating the server is running.
7. Access the App
Open your web browser and navigate to:
http://127.0.0.1:5000
You should now see the AIONEX application live!
📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.                                                        |