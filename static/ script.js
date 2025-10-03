/* ============================================= */
/* AIONEX TEAM - Advanced JS Logic               */
/* Version: 8.0 (Final Polish)                   */
/* Author: AIONEX                                */
/* ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & STATE MANAGEMENT ---

    gsap.registerPlugin(); // Initialize GSAP for animations
    const API_BASE_URL = 'http://127.0.0.1:5000/api';
    
    // Application state variables
    let lastResults = []; // Caches the most recent search results for sorting
    let searchHistory = JSON.parse(localStorage.getItem('aionexHistory')) || [];
    let savedArticles = JSON.parse(localStorage.getItem('aionexSaves')) || [];
    let conversationId = `conv_${Date.now()}_${Math.random()}`; // Unique ID for this session's chat
    let currentArticleData = null; // Holds the original, untranslated data of the currently viewed article summary

    // --- 2. DOM ELEMENT SELECTION ---
    // Grouping DOM queries makes it easier to find elements later.
    
    // Core Layout & Background
    const splashScreen = document.getElementById('splash-screen');
    const introVideo = document.getElementById('intro-video');
    const contentArea = document.getElementById('content-area');
    const cursorGlow = document.getElementById('cursor-glow');
    const welcomePopup = document.getElementById('welcome-popup');
    const closePopupBtn = document.getElementById('close-popup-btn');

    // Search & Filter
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const filterContainer = document.getElementById('filter-container');
    const sortSelect = document.getElementById('sort-select');

    // Side Panel (Dashboard)
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidePanel = document.getElementById('side-panel');
    const panelOverlay = document.getElementById('panel-overlay');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const historyList = document.getElementById('history-list');
    const savesList = document.getElementById('saves-list');
    const panelNav = document.querySelector('.panel-nav');

    // AI Chat Modal
    const aiChatButton = document.getElementById('ai-chat-button');
    const chatModal = document.getElementById('chat-modal');
    const chatOverlay = document.getElementById('chat-overlay');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    const webSearchCheckbox = document.getElementById('web-search-checkbox');
    
    // Language Selector
    const languageSelector = document.getElementById('language-selector');

    // --- 3. CORE UI, ANIMATIONS & SPEECH SYNTHESIS ---

    /**
     * Handles the initial animation sequence after the splash video ends.
     */
    const startMainApplication = () => {
        const tl = gsap.timeline();
        tl.to(splashScreen, { opacity: 0, duration: 1.5, ease: 'power2.inOut' })
          .set(splashScreen, { display: 'none' })
          .set("#hamburger-menu, #main-header, #search-container, #ai-chat-button, #language-selector-container", { visibility: 'visible' })
          .to("#hamburger-menu, #ai-chat-button, #language-selector-container", { opacity: 1, duration: 1, ease: "power3.out" }, "-=0.5")
          .to("#main-header", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=1")
          .to("#search-container", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=0.7")
          .to(welcomePopup, { 
              delay: 1, 
              opacity: 1, 
              y: 0, 
              duration: 0.5, 
              ease: "power3.out",
              onStart: () => welcomePopup.classList.remove('hidden')
          });
    };

    // Attempt to play the intro video, with a fallback if it fails (e.g., on mobile).
    try {
        introVideo.play().catch(() => startMainApplication());
        introVideo.addEventListener('ended', startMainApplication);
    } catch (error) {
        console.warn("Intro video could not be played. Starting app immediately.");
        startMainApplication();
    }
    
    // Initialize Three.js starfield background
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xbbd1ff, size: 0.025 });
    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', event => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        gsap.to(cursorGlow, { x: event.clientX, y: event.clientY, duration: 0.15 });
    });

    const animate = () => {
        requestAnimationFrame(animate);
        stars.rotation.x += 0.00005;
        stars.rotation.y += 0.00005;
        // Parallax effect for the camera
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
        camera.position.y += (mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    };
    animate();

    // Handle window resizing for the canvas
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Speech Synthesis setup
    const synth = window.speechSynthesis;
    let voices = [];
    function loadVoices() { voices = synth.getVoices(); }
    // The 'voiceschanged' event is crucial. Some browsers load voices asynchronously.
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    setTimeout(loadVoices, 200); // Also poll just in case, for older browsers.
    
    /**
     * Checks if a specific language is supported by the browser's TTS engine.
     * @param {string} langCode - The language code (e.g., 'en', 'es', 'zh').
     * @returns {boolean} - True if a voice for the language is available.
     */
    const isLangSupportedForTTS = (langCode) => {
        if (!voices || voices.length === 0) loadVoices(); // Re-check if voices aren't loaded yet
        return voices.some(v => v.lang.startsWith(langCode));
    };

    /**
     * Speaks a given text using the browser's Speech Synthesis API.
     * @param {string} textToSpeak - The text to be read aloud.
     * @param {function} onStart - Callback function when speech starts.
     * @param {function} onEnd - Callback function when speech ends or is stopped.
     */
    const speakText = (textToSpeak, onStart, onEnd) => {
        if (synth.speaking) {
            synth.cancel();
            if(onEnd) onEnd(); // Ensure UI resets if speaking is cancelled.
            return;
        }
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Simple regex to guess the language for better voice selection.
        const langCode = textToSpeak.match(/[一-龠]/) ? 'zh' : 
                         textToSpeak.match(/[áéíóúÁÉÍÓÚñÑ]/) ? 'es' : 
                         textToSpeak.match(/[àèéìòùÀÈÉÌÒÙ]/) ? 'fr' : 
                         textToSpeak.match(/[\u0900-\u097F]/) ? 'hi' : 'en';
        
        utterance.lang = langCode;
        
        // Try to find a high-quality, language-specific voice
        let bestVoice = voices.find(v => v.lang.startsWith(langCode) && (v.name.includes('Google') || v.name.includes('Natural'))) ||
                        voices.find(v => v.lang.startsWith(langCode) && v.localService) ||
                        voices.find(v => v.lang.startsWith(langCode));
        
        if (bestVoice) utterance.voice = bestVoice;

        utterance.onstart = onStart;
        utterance.onend = onEnd;
        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            onEnd(); // Treat error as end
        };

        synth.speak(utterance);
    };

    // --- 4. INTERNATIONALIZATION (i18n) ---
    const translations = {
        en: {
            mainHeader: "AIONEX", searchPlaceholder: "Search for articles...", dashboardTitle: "Dashboard",
            historyTab: "History", savesTab: "Saves", sortByLabel: "Sort by:", sortBestMatch: "Best Match",
            sortNewest: "Newest", sortOldest: "Oldest", sortTitleAZ: "Title (A-Z)", chatTitle: "AIONEX AI Assistant",
            chatPlaceholder: "Ask about space and NASA...", webSearchLabel: "Web Search",
            welcomePopupBody: "Hello! I'm AIONEX, your guide to space and NASA. How can I help you explore the cosmos today?",
            analysisMetrics: "Article Metrics", citations: "Citations", openAccess: "Open Access", recency: "Recency",
            journalActivity: "Journal Activity", authorActivity: "Author Activity", sentimentAnalysis: "Sentiment Analysis",
            aiSummary: "AI Summary", askQuestion: "Ask a Question", askPlaceholder: "Ask about the abstract...",
            askButton: "Ask", answerPlaceholder: "The answer will appear here.", originalAbstract: "Original Abstract",
            readButton: "Read", saveButton: "Save Article", unsaveButton: "Unsave",
        },
        zh: {
            mainHeader: "AIONEX", searchPlaceholder: "搜索文章...", dashboardTitle: "仪表板",
            historyTab: "历史记录", savesTab: "已保存", sortByLabel: "排序方式:", sortBestMatch: "最佳匹配",
            sortNewest: "最新", sortOldest: "最旧", sortTitleAZ: "标题 (A-Z)", chatTitle: "AIONEX 人工智能助手",
            chatPlaceholder: "询问有关太空和NASA的问题...", webSearchLabel: "网络搜索",
            welcomePopupBody: "你好！我是 AIONEX，你的太空和 NASA 指南。今天我能如何帮助你探索宇宙？",
            analysisMetrics: "文章指标", citations: "引用次数", openAccess: "开放获取", recency: "时效性",
            journalActivity: "期刊活跃度", authorActivity: "作者活跃度", sentimentAnalysis: "情感分析",
            aiSummary: "AI 摘要", askQuestion: "提问", askPlaceholder: "就摘要提问...",
            askButton: "提问", answerPlaceholder: "答案将显示在这里。", originalAbstract: "原文摘要",
            readButton: "朗读", saveButton: "保存文章", unsaveButton: "取消保存",
        },
        es: {
            mainHeader: "AIONEX", searchPlaceholder: "Buscar artículos...", dashboardTitle: "Panel",
            historyTab: "Historial", savesTab: "Guardados", sortByLabel: "Ordenar por:", sortBestMatch: "Mejor resultado",
            sortNewest: "Más reciente", sortOldest: "Más antiguo", sortTitleAZ: "Título (A-Z)", chatTitle: "Asistente de IA de AIONEX",
            chatPlaceholder: "Pregunta sobre el espacio y la NASA...", webSearchLabel: "Búsqueda Web",
            welcomePopupBody: "¡Hola! Soy AIONEX, tu guía sobre el espacio y la NASA. ¿Cómo puedo ayudarte a explorar el cosmos hoy?",
            analysisMetrics: "Métricas del Artículo", citations: "Citas", openAccess: "Acceso Abierto", recency: "Reciente",
            journalActivity: "Actividad de la Revista", authorActivity: "Actividad del Autor", sentimentAnalysis: "Análisis de Sentimiento",
            aiSummary: "Resumen de IA", askQuestion: "Haz una Pregunta", askPlaceholder: "Pregunta sobre el resumen...",
            askButton: "Preguntar", answerPlaceholder: "La respuesta aparecerá aquí.", originalAbstract: "Resumen Original",
            readButton: "Leer", saveButton: "Guardar Artículo", unsaveButton: "No Guardar",
        },
        hi: {
            mainHeader: "AIONEX", searchPlaceholder: "लेख खोजें...", dashboardTitle: "डैशबोर्ड",
            historyTab: "इतिहास", savesTab: "सहेजे गए", sortByLabel: "इसके अनुसार क्रमबद्ध करें:", sortBestMatch: "सर्वश्रेष्ठ मिलान",
            sortNewest: "नवीनतम", sortOldest: "सबसे पुराना", sortTitleAZ: "शीर्षक (A-Z)", chatTitle: "AIONEX एआई सहायक",
            chatPlaceholder: "अंतरिक्ष और नासा के बारे में पूछें...", webSearchLabel: "वेब खोज",
            welcomePopupBody: "नमस्ते! मैं AIONEX हूँ, आपका अंतरिक्ष और नासा का गाइड। मैं आज ब्रह्मांड का अन्वेषण करने में आपकी कैसे मदद कर सकता हूँ?",
            analysisMetrics: "लेख मेट्रिक्स", citations: "उद्धरण", openAccess: "ओपन एक्सेस", recency: "नवीनता",
            journalActivity: "जर्नल गतिविधि", authorActivity: "लेखक गतिविधि", sentimentAnalysis: "भावना विश्लेषण",
            aiSummary: "एआई सारांश", askQuestion: "एक सवाल पूछें", askPlaceholder: "सार के बारे में पूछें...",
            askButton: "पूछें", answerPlaceholder: "उत्तर यहाँ दिखाई देगा।", originalAbstract: "मूल सार",
            readButton: "पढ़ें", saveButton: "लेख सहेजें", unsaveButton: "असंरक्षित करें",
        },
        fr: {
            mainHeader: "AIONEX", searchPlaceholder: "Rechercher des articles...", dashboardTitle: "Tableau de bord",
            historyTab: "Historique", savesTab: "Enregistrements", sortByLabel: "Trier par :", sortBestMatch: "Meilleure correspondance",
            sortNewest: "Le plus récent", sortOldest: "Le plus ancien", sortTitleAZ: "Titre (A-Z)", chatTitle: "Assistant IA AIONEX",
            chatPlaceholder: "Posez des questions sur l'espace et la NASA...", webSearchLabel: "Recherche Web",
            welcomePopupBody: "Bonjour ! Je suis AIONEX, votre guide sur l'espace et la NASA. Comment puis-je vous aider à explorer le cosmos aujourd'hui ?",
            analysisMetrics: "Métrique de l'article", citations: "Citations", openAccess: "Accès Ouvert", recency: "Récence",
            journalActivity: "Activité du journal", authorActivity: "Activité de l'auteur", sentimentAnalysis: "Analyse des sentiments",
            aiSummary: "Résumé par IA", askQuestion: "Poser une question", askPlaceholder: "Posez une question sur le résumé...",
            askButton: "Demander", answerPlaceholder: "La réponse apparaîtra ici.", originalAbstract: "Résumé original",
            readButton: "Lire", saveButton: "Sauvegarder l'article", unsaveButton: "Désenregistrer",
        }
    };
    
    /**
     * Applies the selected language strings to all relevant DOM elements.
     * @param {string} lang - The language code (e.g., 'en', 'zh').
     */
    const setLanguage = async (lang) => {
        const langStrings = translations[lang] || translations.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (langStrings[key]) el.textContent = langStrings[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (langStrings[key]) el.placeholder = langStrings[key];
        });
        localStorage.setItem('aionexLanguage', lang);
        
        // If an article is currently displayed, re-render it with the new language.
        // This makes the UI feel dynamic.
        if (currentArticleData) {
            await renderSummaryView();
        }
    };

    // --- 5. TEMPLATE & RENDER FUNCTIONS ---
    // These functions generate HTML strings to be injected into the DOM.

    const createLoader = () => `<div class="status-message">Navigating the data cosmos...</div>`;
    const createError = msg => `<div class="status-message" style="color:#e0245e;">Error: ${msg}</div>`;
    const createResultsHTML = articles => articles.map(article => `
        <div class="result-card" data-link="${article.link}" data-title="${article.title}">
            <h4>${article.title}</h4>
        </div>`).join('');

    /**
     * Generates a plausible but random set of analysis data for an article.
     * @returns {object} An object with scores for different metrics.
     */
    const generateAnalysisData = () => {
        const getScore = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        return {
            citations: getScore(30, 95), openAccess: Math.random() > 0.3 ? 100 : 10,
            recency: getScore(20, 98), journalActivity: getScore(40, 85),
            authorActivity: getScore(35, 90)
        };
    };
    
    /**
     * Determines the color and label for a given score.
     * @param {number} score - The score from 0 to 100.
     * @returns {{color: string, text: string}} An object with color and text label.
     */
    const getScoreCategory = (score) => {
        if (score <= 25) return { color: 'var(--graph-bar-low)', text: 'Low' };
        if (score <= 50) return { color: 'var(--graph-bar-medium)', text: 'Medium' };
        if (score <= 75) return { color: 'var(--graph-bar-high)', text: 'High' };
        return { color: 'var(--graph-bar-very-high)', text: 'Very High' };
    };

    /**
     * Creates the HTML for the analysis graphs section.
     * @param {object} analysisData - The generated data from generateAnalysisData.
     * @param {object} langStrings - The current language translation object.
     * @returns {string} The HTML string for the graphs.
     */
    const createGraphsHTML = (analysisData, langStrings) => {
        const metrics = {
            citations: analysisData.citations, openAccess: analysisData.openAccess,
            recency: analysisData.recency, journalActivity: analysisData.journalActivity,
            authorActivity: analysisData.authorActivity
        };

        let graphsHTML = `<div class="analysis-graphs"><h3><i class="fas fa-chart-bar"></i> ${langStrings.analysisMetrics}</h3>`;

        for (const [key, score] of Object.entries(metrics)) {
            const category = getScoreCategory(score);
            graphsHTML += `
                <div class="graph-item">
                    <div class="graph-label">
                        <span data-i18n="${key}">${langStrings[key]}</span>
                        <span style="color: ${category.color}">${category.text}</span>
                    </div>
                    <div class="graph-bar-bg">
                        <div class="graph-bar" style="width: ${score}%; background-color: ${category.color};"></div>
                    </div>
                </div>
            `;
        }
        
        graphsHTML += `<div class="graph-scale"><span>Low</span><span>Medium</span><span>High</span><span>Very High</span></div></div>`;
        return graphsHTML;
    };
    
    const createSummaryHTML = data => {
        const lang = languageSelector.value || 'en';
        const langStrings = translations[lang] || translations.en;
        const isSaved = savedArticles.some(article => article.link === data.link);
        const saveButtonText = isSaved ? langStrings.unsaveButton : langStrings.saveButton;
        const saveButtonClass = isSaved ? 'saved' : '';
        const analysisData = generateAnalysisData(); // Generate fresh data for each view

        return `
        <div class="summary-card" data-abstract="${encodeURIComponent(data.abstract)}">
            <div class="summary-header">
                <h2>${data.title}</h2>
                <button id="save-article-btn" class="${saveButtonClass}" data-link="${data.link}" data-title="${data.title}">
                    <i class="fas ${isSaved ? 'fa-trash-alt' : 'fa-save'}"></i> ${saveButtonText}
                </button>
            </div>
            ${createGraphsHTML(analysisData, langStrings)}
            <h3><i class="fas fa-poll"></i> ${langStrings.sentimentAnalysis}</h3>
            <p><span class="sentiment-badge ${data.sentiment || 'UNKNOWN'}">${data.sentiment || 'UNKNOWN'}</span></p>
            <h3><i class="fas fa-brain"></i> ${langStrings.aiSummary} <button id="read-aloud-btn" data-summary="${encodeURIComponent(data.summary)}"><i class="fas fa-play"></i> ${langStrings.readButton}</button></h3>
            <p>${data.summary || 'Not available.'}</p>
            <div class="qa-section">
                <h3><i class="fas fa-question-circle"></i> ${langStrings.askQuestion}</h3>
                <form class="qa-form" id="qa-form">
                    <input type="text" id="qa-input" placeholder="${langStrings.askPlaceholder}" required>
                    <button type="submit">${langStrings.askButton}</button>
                </form>
                <div class="qa-answer" id="qa-answer-box">${langStrings.answerPlaceholder}</div>
            </div>
            <h3><i class="fas fa-file-alt"></i> ${langStrings.originalAbstract}</h3>
            <p>${data.abstract}</p>
        </div>`;
    }

    /**
     * Renders the main content area with a fade-in animation.
     * @param {string} html - The HTML string to render.
     */
    const renderContent = (html) => {
        contentArea.innerHTML = html;
        gsap.fromTo(contentArea.children, 
            { opacity: 0, y: -50 }, 
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
        );
    };

    /**
     * Renders the summary view, translating content if necessary.
     */
    const renderSummaryView = async () => {
        if (!currentArticleData) return;

        const lang = languageSelector.value;
        // Create a deep copy to avoid modifying the original untranslated data
        let displayData = JSON.parse(JSON.stringify(currentArticleData));

        if (lang !== 'en') {
            renderContent(createLoader()); // Show loader during translation
            const [translatedTitle, translatedSummary, translatedAbstract] = await Promise.all([
                translateText(displayData.title, lang),
                translateText(displayData.summary, lang),
                translateText(displayData.abstract, lang)
            ]);
            displayData.title = translatedTitle;
            displayData.summary = translatedSummary;
            displayData.abstract = translatedAbstract;
        }
        
        renderContent(createSummaryHTML(displayData));
    };
    
    // --- 6. AI CHAT FUNCTIONS ---

    /**
     * Shows or hides the AI chat modal with animations.
     * @param {boolean} show - True to show the modal, false to hide it.
     */
    const toggleChatModal = (show) => {
        if (show) {
            chatModal.classList.remove('hidden');
            chatOverlay.classList.remove('hidden');
            gsap.fromTo(chatModal, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
            gsap.fromTo(chatOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
            chatInput.focus();
            // Add a welcome message if the chat is empty
            if (chatMessages.children.length === 0) {
                const currentLang = localStorage.getItem('aionexLanguage') || 'en';
                const welcomeMsg = translations[currentLang].welcomePopupBody;
                addMessageToChat({reply: welcomeMsg}, 'ai');
            }
        } else {
            synth.cancel(); // Stop any speech when closing the modal
            gsap.to(chatModal, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power3.in', onComplete: () => chatModal.classList.add('hidden') });
            gsap.to(chatOverlay, { opacity: 0, duration: 0.3, onComplete: () => chatOverlay.classList.add('hidden') });
        }
    };

    /**
     * Adds a message to the chat interface.
     * @param {object} data - The message data ({reply, sources}).
     * @param {string} sender - 'user' or 'ai'.
     * @param {boolean} [isLoading=false] - If true, displays a loading bubble.
     */
    const addMessageToChat = (data, sender, isLoading = false) => {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `chat-message ${sender}`;
        
        if (isLoading) {
            messageWrapper.innerHTML = `
                <div class="message-avatar"><img src="static/generative.png" alt="AI Avatar"></div>
                <div class="message-bubble loading"><div class="dot-flashing"></div></div>
            `;
        } else {
            const avatar = sender === 'ai' 
                ? '<img src="static/generative.png" alt="AI Avatar">' 
                : '<img src="static/userlogo.jpg" alt="User Avatar">';

            let sourcesHTML = '';
            if (data.sources && data.sources.length > 0) {
                const sourceLinks = data.sources.map(src => `<li><a href="${src}" target="_blank" rel="noopener noreferrer">${src}</a></li>`).join('');
                sourcesHTML = `
                    <div class="message-actions sources-container">
                        <details>
                            <summary>Sources</summary>
                            <ul class="sources-list">${sourceLinks}</ul>
                        </details>
                    </div>`;
            }

            const langCode = data.reply.match(/[一-龠]/) ? 'zh' : 
                             data.reply.match(/[áéíóúÁÉÍÓÚñÑ]/) ? 'es' :
                             data.reply.match(/[àèéìòùÀÈÉÌÒÙ]/) ? 'fr' : 
                             data.reply.match(/[\u0900-\u097F]/) ? 'hi' : 'en';

            let actionsHTML = '';
            if (sender === 'ai') {
                const ttsButton = isLangSupportedForTTS(langCode) ?
                    `<button class="message-action-btn tts-btn" title="Read aloud"><img src="static/speaker-filled-audio-tool.png" alt="Read"></button>
                     <button class="message-action-btn tts-stop-btn hidden" title="Stop">&times;</button>` : '';

                actionsHTML = `
                <div class="message-actions">
                    ${ttsButton}
                    <button class="message-action-btn copy-btn" title="Copy text"><img src="static/copy.png" alt="Copy"></button>
                </div>`;
            }

            messageWrapper.innerHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">
                    <div class="message-bubble">
                        <span class="message-text">${data.reply}</span>
                    </div>
                    ${actionsHTML}
                    ${sourcesHTML}
                </div>`;
        }
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    };

    /**
     * Handles the submission of the chat form.
     * @param {Event} event - The form submission event.
     */
    const handleChatSubmit = async (event) => {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        addMessageToChat({reply: userInput}, 'user');
        chatInput.value = '';
        addMessageToChat(null, 'ai', true); // Show loading indicator

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userInput, 
                    conversation_id: conversationId,
                    search_web: webSearchCheckbox.checked
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ reply: 'Network response was not ok.' }));
                throw new Error(errorData.reply);
            }
            
            const data = await response.json();
            
            chatMessages.removeChild(chatMessages.lastChild); // Remove loader
            addMessageToChat(data, 'ai');

        } catch (error) {
            chatMessages.removeChild(chatMessages.lastChild); // Remove loader
            addMessageToChat({reply: error.message || "Sorry, I'm having trouble connecting. Please try again."}, 'ai');
            console.error('Chat API error:', error);
        }
    };

    // --- 7. DASHBOARD & LOCALSTORAGE FUNCTIONS ---

    const updateHistory = (query) => {
        if (!searchHistory.includes(query)) {
            searchHistory.unshift(query);
            searchHistory = searchHistory.slice(0, 20); // Keep history to a reasonable size
            localStorage.setItem('aionexHistory', JSON.stringify(searchHistory));
        }
    };

    const removeHistoryItem = (query) => {
        searchHistory = searchHistory.filter(item => item !== query);
        localStorage.setItem('aionexHistory', JSON.stringify(searchHistory));
        renderHistory();
    };
    
    const renderHistory = () => {
        historyList.innerHTML = searchHistory.map(item => `
            <li>
                <span class="history-item-query" data-query="${item}">${item}</span>
                <button class="remove-history-btn" data-query="${item}" title="Remove">&times;</button>
            </li>`).join('') || `<li>No history yet.</li>`;
    };

    const saveArticle = (article) => {
        if (!savedArticles.some(a => a.link === article.link)) {
            savedArticles.unshift(article);
            localStorage.setItem('aionexSaves', JSON.stringify(savedArticles));
        }
    };

    const removeArticle = (link) => {
        savedArticles = savedArticles.filter(a => a.link !== link);
        localStorage.setItem('aionexSaves', JSON.stringify(savedArticles));
        renderSavedArticles();
    };

    const renderSavedArticles = () => {
        savesList.innerHTML = savedArticles.map(article => `
            <li class="saved-item" data-link="${article.link}" data-title="${article.title}">
                <span class="saved-item-title">${article.title}</span>
                <button class="remove-save-btn" data-link="${article.link}" title="Remove"><i class="fas fa-trash"></i></button>
            </li>
        `).join('') || `<li>No saved articles.</li>`;
    };

    /**
     * Toggles the visibility of the side panel.
     * @param {boolean} isOpen - True to open the panel, false to close.
     */
    const togglePanel = (isOpen) => {
        sidePanel.classList.toggle('open', isOpen);
        panelOverlay.classList.toggle('open', isOpen);
        hamburgerMenu.classList.toggle('open', isOpen);
    };

    /**
     * Sorts the `lastResults` array based on the dropdown selection and re-renders.
     */
    const sortResults = () => {
        const sortBy = sortSelect.value;
        let sortedResults = [...lastResults];

        switch (sortBy) {
            case 'newest':
                sortedResults.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'oldest':
                sortedResults.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'title-az':
                sortedResults.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'best-match':
            default:
                // `lastResults` is already the "best match" from the server.
                break;
        }
        renderContent(createResultsHTML(sortedResults));
    };

    // --- 8. API CALLS ---

    /**
     * (Simulated) Translates text using the backend.
     * @param {string} text - The text to translate.
     * @param {string} lang - The target language code.
     * @returns {Promise<string>} The translated text.
     */
    const translateText = async (text, lang) => {
        if (!text || lang === 'en') return text;
        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang })
            });
            if (!response.ok) return `${text} [translation failed]`;
            const data = await response.json();
            return data.translatedText;
        } catch (error) {
            console.error("Translation API error:", error);
            return `${text} [translation failed]`;
        }
    };
    
    /**
     * Performs a search via the backend API.
     * @param {string} query - The search query.
     */
    const handleSearch = async (query) => {
        if (!query) return;
        currentArticleData = null; // Clear current article state on new search
        contentArea.innerHTML = ''; // Clear view immediately
        searchInput.value = query;
        togglePanel(false);
        updateHistory(query);
        filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            lastResults = await response.json();
            if (lastResults.length) {
                sortSelect.value = 'best-match'; // Reset sort option
                renderContent(createResultsHTML(lastResults));
                filterContainer.classList.remove('hidden');
            } else {
                renderContent(createError("No articles found for that query."));
            }
        } catch (error) {
            renderContent(createError(error.message));
        }
    };

    /**
     * Fetches analysis for a specific article URL and translates it.
     * @param {string} url - The URL of the article to analyze.
     */
    const fetchAnalysis = async (url) => {
        filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            currentArticleData = data; // Store original, untranslated data
            await renderSummaryView(); // Render view, which will handle translation
        } catch (error) {
            currentArticleData = null;
            renderContent(createError(error.message));
        }
    };

    /**
     * Fetches an answer from the Q&A model.
     * @param {string} question - The user's question.
     * @param {string} context - The text to find the answer in (the abstract).
     */
    const fetchAnswer = async (question, context) => {
        const answerBox = document.getElementById('qa-answer-box');
        answerBox.textContent = 'Thinking...';
        try {
            const response = await fetch(`${API_BASE_URL}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            
            const lang = languageSelector.value;
            let answer = data.answer || "Couldn't find a clear answer in the text.";
            if (lang !== 'en') {
                answer = await translateText(answer, lang);
            }
            answerBox.textContent = answer;
        } catch (error) {
            answerBox.textContent = `Error: ${error.message}`;
        }
    };
    
    // --- 9. EVENT LISTENERS ---
    // Centralized place for all event bindings.

    // Language listener
    languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));

    // Welcome popup listener
    closePopupBtn.addEventListener('click', () => {
        gsap.to(welcomePopup, { opacity: 0, y: 20, duration: 0.3, onComplete: () => welcomePopup.classList.add('hidden') });
    });

    // Chat listeners
    aiChatButton.addEventListener('click', () => toggleChatModal(true));
    chatCloseBtn.addEventListener('click', () => toggleChatModal(false));
    chatOverlay.addEventListener('click', () => toggleChatModal(false));
    chatInputForm.addEventListener('submit', handleChatSubmit);

    // Event delegation for chat message actions (copy, tts)
    chatMessages.addEventListener('click', event => {
        const messageContent = event.target.closest('.message-content');
        if (!messageContent) return;

        // Text-to-Speech
        const playBtn = event.target.closest('.tts-btn');
        if (playBtn) {
            const textToSpeak = messageContent.querySelector('.message-text').textContent;
            const stopBtn = messageContent.querySelector('.tts-stop-btn');
            const onStart = () => { playBtn.classList.add('hidden'); stopBtn.classList.remove('hidden'); };
            const onEnd = () => { playBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); };
            speakText(textToSpeak, onStart, onEnd);
            return;
        }

        const stopBtn = event.target.closest('.tts-stop-btn');
        if (stopBtn) { synth.cancel(); return; }
        
        // Copy to Clipboard
        const copyBtn = event.target.closest('.copy-btn');
        if (copyBtn) {
            const textToCopy = messageContent.querySelector('.message-text').textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const feedback = document.createElement('span');
                feedback.className = 'copy-feedback';
                feedback.textContent = 'Copied!';
                messageContent.appendChild(feedback);
                setTimeout(() => feedback.remove(), 1500);
            });
            return;
        }
    });

    // Main search and sort listeners
    searchButton.addEventListener('click', () => handleSearch(searchInput.value.trim()));
    searchInput.addEventListener('keyup', event => { if (event.key === 'Enter') handleSearch(searchInput.value.trim()); });
    sortSelect.addEventListener('change', sortResults);

    // Side Panel (Dashboard) listeners
    hamburgerMenu.addEventListener('click', () => {
        renderHistory();
        renderSavedArticles();
        togglePanel(!sidePanel.classList.contains('open'));
    });
    closePanelBtn.addEventListener('click', () => togglePanel(false));
    panelOverlay.addEventListener('click', () => togglePanel(false));

    // Dashboard tab navigation
    panelNav.addEventListener('click', event => {
        if (event.target.matches('.tab-btn')) {
            const tab = event.target.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.panel-tab-content').forEach(content => content.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(`${tab}-content`).classList.add('active');
        }
    });

    // Event delegation for dashboard actions (run search, delete, etc.)
    sidePanel.addEventListener('click', event => {
        // Run search from history
        const historyQuery = event.target.closest('.history-item-query');
        if (historyQuery) { handleSearch(historyQuery.dataset.query); return; }

        // Remove item from history
        const removeHistoryBtn = event.target.closest('.remove-history-btn');
        if (removeHistoryBtn) {
            const query = removeHistoryBtn.dataset.query;
            if (confirm(`Are you sure you want to delete "${query}" from your history?`)) {
                removeHistoryItem(query);
            }
            return;
        }

        // View saved article
        const savedItem = event.target.closest('.saved-item-title');
        if (savedItem) { fetchAnalysis(savedItem.parentElement.dataset.link); togglePanel(false); return; }

        // Remove saved article
        const removeSaveBtn = event.target.closest('.remove-save-btn');
        if (removeSaveBtn) { removeArticle(removeSaveBtn.dataset.link); return; }
    });

    // Event delegation for main content area actions
    contentArea.addEventListener('click', event => {
        // View article summary
        const resultCard = event.target.closest('.result-card');
        if (resultCard) { fetchAnalysis(resultCard.dataset.link); return; }

        // Save/unsave article
        const saveBtn = event.target.closest('#save-article-btn');
        if (saveBtn) {
            const article = { title: saveBtn.dataset.title, link: saveBtn.dataset.link };
            const lang = languageSelector.value || 'en';
            const langStrings = translations[lang] || translations.en;
            if (saveBtn.classList.contains('saved')) {
                removeArticle(article.link);
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${langStrings.saveButton}`;
                saveBtn.classList.remove('saved');
            } else {
                saveArticle(article);
                saveBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${langStrings.unsaveButton}`;
                saveBtn.classList.add('saved');
            }
            return;
        }
        
        // Read summary aloud
        const readBtn = event.target.closest('#read-aloud-btn');
        if (readBtn) {
            const summary = decodeURIComponent(readBtn.dataset.summary);
            speakText(summary, null, null);
            return;
        }
    });
    
    // Listen for form submission inside the content area (for Q&A)
    contentArea.addEventListener('submit', event => {
        if (event.target.id === 'qa-form') {
            event.preventDefault();
            const question = document.getElementById('qa-input').value.trim();
            // Always use original untranslated abstract for the Q&A model
            const context = currentArticleData ? currentArticleData.abstract : ''; 
            if(question && context) fetchAnswer(question, context);
        }
    });

    // --- 10. INITIALIZATION ---
    // Load the user's preferred language on startup.
    const savedLang = localStorage.getItem('aionexLanguage') || 'en';
    languageSelector.value = savedLang;
    setLanguage(savedLang);
});
