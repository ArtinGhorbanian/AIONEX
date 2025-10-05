/* ============================================= */
/* AIONEX TEAM - Advanced JS Logic               */
/* Version: 9.0 (Final Polish)                   */
/* Author: AIONEX                                */
/* ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & STATE MANAGEMENT ---

    gsap.registerPlugin(); // Initialize GSAP for animations
    const API_BASE_URL = '/api';
    
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
    const voicePromise = new Promise(resolve => {
        // This robustly waits for the browser to load available voices.
        if (synth.getVoices().length) {
            voices = synth.getVoices();
            resolve();
        } else if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = () => {
                voices = synth.getVoices();
                resolve();
            };
        } else {
            // Fallback for older browsers that don't support the event well.
            setTimeout(() => {
                voices = synth.getVoices();
                resolve();
            }, 250);
        }
    });

    /**
     * Checks if a specific language is supported by the browser's TTS engine.
     * @param {string} langCode - The language code (e.g., 'en', 'es', 'zh').
     * @returns {boolean} - True if a voice for the language is available.
     */
    const isLangSupportedForTTS = (langCode) => {
        return voices.some(v => v.lang.startsWith(langCode));
    };

    /**
     * Speaks a given text using the browser's Speech Synthesis API.
     * @param {string} textToSpeak - The text to be read aloud.
     * @param {function} onStart - Callback function when speech starts.
     * @param {function} onEnd - Callback function when speech ends or is stopped.
     */
    const speakText = async (textToSpeak, onStart, onEnd) => {
        await voicePromise; // Ensure voices are loaded before trying to speak
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
                         textToSpeak.match(/[\u0600-\u06FF]/) ? 'ar' :
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
            onEnd();
        };

        synth.speak(utterance);
    };

    // --- 4. INTERNATIONALIZATION (i18n) ---
    const translations = {
        en: {
            mainHeader: "AIONEX", searchPlaceholder: "Search for articles...", dashboardTitle: "Dashboard",
            historyTab: "History", savesTab: "Saves", sortByLabel: "Sort by:", sortBestMatch: "Best Match",
            sortNewest: "Newest", sortOldest: "Oldest", sortTitleAZ: "Title (A-Z)", chatTitle: "AIONEX AI Assistant",
            chatPlaceholder: "Ask about space and NASA...",
            welcomePopupBody: "Hello! I'm AIONEX, your guide to space and NASA. How can I help you explore the cosmos today?",
            analysisMetrics: "Article Metrics", citations: "Citations", openAccess: "Open Access", recency: "Recency",
            journalActivity: "Journal Activity", authorActivity: "Author Activity", sentimentAnalysis: "Sentiment Analysis",
            aiSummary: "AI Summary", askQuestion: "Ask a Question", askPlaceholder: "Ask about the abstract...",
            askButton: "Ask", answerPlaceholder: "The answer will appear here.", originalAbstract: "Original Abstract",
            readButton: "Read", saveButton: "Save Article", unsaveButton: "Unsave",
            percent: "Percent", category: "Category", backToResults: "Back to Results",
        },
        zh: {
            mainHeader: "AIONEX", searchPlaceholder: "搜索文章...", dashboardTitle: "仪表板",
            historyTab: "历史记录", savesTab: "已保存", sortByLabel: "排序方式:", sortBestMatch: "最佳匹配",
            sortNewest: "最新", sortOldest: "最旧", sortTitleAZ: "标题 (A-Z)", chatTitle: "AIONEX 人工智能助手",
            chatPlaceholder: "询问有关太空和NASA的问题...",
            welcomePopupBody: "你好！我是 AIONEX，你的太空和 NASA 指南。今天我能如何帮助你探索宇宙？",
            analysisMetrics: "文章指标", citations: "引用次数", openAccess: "开放获取", recency: "时效性",
            journalActivity: "期刊活跃度", authorActivity: "作者活跃度", sentimentAnalysis: "情感分析",
            aiSummary: "AI 摘要", askQuestion: "提问", askPlaceholder: "就摘要提问...",
            askButton: "提问", answerPlaceholder: "答案将显示在这里。", originalAbstract: "原文摘要",
            readButton: "朗读", saveButton: "保存文章", unsaveButton: "取消保存",
            percent: "百分比", category: "类别", backToResults: "返回结果",
        },
        es: {
            mainHeader: "AIONEX", searchPlaceholder: "Buscar artículos...", dashboardTitle: "Panel",
            historyTab: "Historial", savesTab: "Guardados", sortByLabel: "Ordenar por:", sortBestMatch: "Mejor resultado",
            sortNewest: "Más reciente", sortOldest: "Más antiguo", sortTitleAZ: "Título (A-Z)", chatTitle: "Asistente de IA de AIONEX",
            chatPlaceholder: "Pregunta sobre el espacio y la NASA...",
            welcomePopupBody: "¡Hola! Soy AIONEX, tu guía sobre el espacio y la NASA. ¿Cómo puedo ayudarte a explorar el cosmos hoy?",
            analysisMetrics: "Métricas del Artículo", citations: "Citas", openAccess: "Acceso Abierto", recency: "Reciente",
            journalActivity: "Actividad de la Revista", authorActivity: "Actividad del Autor", sentimentAnalysis: "Análisis de Sentimiento",
            aiSummary: "Resumen de IA", askQuestion: "Haz una Pregunta", askPlaceholder: "Pregunta sobre el resumen...",
            askButton: "Preguntar", answerPlaceholder: "La respuesta aparecerá aquí.", originalAbstract: "Resumen Original",
            readButton: "Leer", saveButton: "Guardar Artículo", unsaveButton: "No Guardar",
            percent: "Porcentaje", category: "Categoría", backToResults: "Volver a Resultados",
        },
        hi: {
            mainHeader: "AIONEX", searchPlaceholder: "लेख खोजें...", dashboardTitle: "डैशबोर्ड",
            historyTab: "इतिहास", savesTab: "सहेजे गए", sortByLabel: "इसके अनुसार क्रमबद्ध करें:", sortBestMatch: "सर्वश्रेष्ठ मिलान",
            sortNewest: "नवीनतम", sortOldest: "सबसे पुराना", sortTitleAZ: "शीर्षक (A-Z)", chatTitle: "AIONEX एआई सहायक",
            chatPlaceholder: "अंतरिक्ष और नासा के बारे में पूछें...",
            welcomePopupBody: "नमस्ते! मैं AIONEX हूँ, आपका अंतरिक्ष और नासा का गाइड। मैं आज ब्रह्मांड का अन्वेषण करने में आपकी कैसे मदद कर सकता हूँ?",
            analysisMetrics: "लेख मेट्रिक्स", citations: "उद्धरण", openAccess: "ओपन एक्सेस", recency: "नवीनता",
            journalActivity: "जर्नल गतिविधि", authorActivity: "लेखक गतिविधि", sentimentAnalysis: "भावना विश्लेषण",
            aiSummary: "एआई सारांश", askQuestion: "एक सवाल पूछें", askPlaceholder: "सार के बारे में पूछें...",
            askButton: "पूछें", answerPlaceholder: "उत्तर यहाँ दिखाई देगा।", originalAbstract: "मूल सार",
            readButton: "पढ़ें", saveButton: "लेख सहेजें", unsaveButton: "असंरक्षित करें",
            percent: "प्रतिशत", category: "श्रेणी", backToResults: "परिणामों पर वापस",
        },
        fr: {
            mainHeader: "AIONEX", searchPlaceholder: "Rechercher des articles...", dashboardTitle: "Tableau de bord",
            historyTab: "Historique", savesTab: "Enregistrements", sortByLabel: "Trier par :", sortBestMatch: "Meilleure correspondance",
            sortNewest: "Le plus récent", sortOldest: "Le plus ancien", sortTitleAZ: "Titre (A-Z)", chatTitle: "Assistant IA AIONEX",
            chatPlaceholder: "Posez des questions sur l'espace et la NASA...",
            welcomePopupBody: "Bonjour ! Je suis AIONEX, votre guide sur l'espace et la NASA. Comment puis-je vous aider à explorer le cosmos aujourd'hui ?",
            analysisMetrics: "Métrique de l'article", citations: "Citations", openAccess: "Accès Ouvert", recency: "Récence",
            journalActivity: "Activité du journal", authorActivity: "Activité de l'auteur", sentimentAnalysis: "Analyse des sentiments",
            aiSummary: "Résumé par IA", askQuestion: "Poser une question", askPlaceholder: "Posez une question sur le résumé...",
            askButton: "Demander", answerPlaceholder: "La réponse apparaîtra ici.", originalAbstract: "Résumé original",
            readButton: "Lire", saveButton: "Sauvegarder l'article", unsaveButton: "Désenregistrer",
            percent: "Pourcentage", category: "Catégorie", backToResults: "Retour aux Résultats",
        },
        ar: {
            mainHeader: "AIONEX", searchPlaceholder: "ابحث عن مقالات...", dashboardTitle: "لوحة التحكم",
            historyTab: "السجل", savesTab: "المحفوظات", sortByLabel: "ترتيب حسب:", sortBestMatch: "أفضل مطابقة",
            sortNewest: "الأحدث", sortOldest: "الأقدم", sortTitleAZ: "العنوان (أ-ي)", chatTitle: "مساعد AIONEX الذكي",
            chatPlaceholder: "اسأل عن الفضاء وناسا...",
            welcomePopupBody: "مرحباً! أنا أيونكس، دليلك للفضاء وناسا. كيف يمكنني مساعدتك في استكشاف الكون اليوم؟",
            analysisMetrics: "مقاييس المقالة", citations: "الاستشهادات", openAccess: "وصول حر", recency: "حداثة النشر",
            journalActivity: "نشاط المجلة", authorActivity: "نشاط المؤلف", sentimentAnalysis: "تحليل المشاعر",
            aiSummary: "ملخص الذكاء الاصطناعي", askQuestion: "اطرح سؤالاً", askPlaceholder: "اسأل عن الملخص...",
            askButton: "اسأل", answerPlaceholder: "ستظهر الإجابة هنا.", originalAbstract: "الملخص الأصلي",
            readButton: "قراءة", saveButton: "حفظ المقالة", unsaveButton: "إلغاء الحفظ",
            percent: "نسبة", category: "فئة", backToResults: "العودة إلى النتائج",
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
        if (currentArticleData) {
            await renderSummaryView();
        }
    };

    // --- 5. TEMPLATE & RENDER FUNCTIONS ---
    // These functions generate HTML strings to be injected into the DOM.

    const createLoader = () => `<div class="status-message">Navigating the data cosmos...</div>`;
    const createError = msg => `<div class="status-message" style="color: var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
    const createResultsHTML = articles => articles.map(article => `
        <div class="result-card" data-link="${article.link}" data-title="${article.title}">
            <h4>${article.title}</h4>
        </div>`).join('');

    /**
     * Creates the HTML for the analysis graphs section.
     * @param {object} reputationData - The real data from the /api/reputation endpoint.
     * @param {object} langStrings - The current language translation object.
     * @returns {string} The HTML string for the graphs.
     */
    const createGraphsHTML = (reputationData, langStrings) => {
        const metrics = reputationData.components || {};

        let graphsHTML = `
            <div class="analysis-graphs">
                <div class="metrics-toggle-container">
                    <span class="metrics-toggle-label" data-i18n="category">${langStrings.category}</span>
                    <label class="metrics-toggle">
                        <input type="checkbox" class="metrics-toggle-checkbox">
                        <span class="metrics-slider"></span>
                    </label>
                    <span class="metrics-toggle-label" data-i18n="percent">${langStrings.percent}</span>
                </div>
                <h3><i class="fas fa-chart-bar"></i> ${langStrings.analysisMetrics}</h3>`;

        for (const [key, score] of Object.entries(metrics)) {
            const category = getScoreCategory(score);
            graphsHTML += `
                <div class="graph-item">
                    <div class="graph-label">
                        <span>${key}</span>
                        <div>
                            <span class="graph-value-category" style="color: ${category.color}">${category.text}</span>
                            <span class="graph-value-percent hidden">${score}%</span>
                        </div>
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

    const createSummaryHTML = (data, reputationData) => {
        const lang = languageSelector.value || 'en';
        const langStrings = translations[lang] || translations.en;
        const isSaved = savedArticles.some(article => article.link === data.link);
        const saveButtonText = isSaved ? langStrings.unsaveButton : langStrings.saveButton;
        const saveButtonClass = isSaved ? 'saved' : '';

        return `
        <button id="back-to-results-btn"><i class="fas fa-arrow-left"></i> ${langStrings.backToResults}</button>
        <div class="summary-card" data-abstract="${encodeURIComponent(data.abstract)}">
            <div class="summary-header">
                <h2>${data.title}</h2>
                <button id="save-article-btn" class="${saveButtonClass}" data-link="${data.link}" data-title="${data.title}">
                    <i class="fas ${isSaved ? 'fa-trash-alt' : 'fa-save'}"></i> ${saveButtonText}
                </button>
            </div>
            ${reputationData ? createGraphsHTML(reputationData, langStrings) : ''}
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
     * Renders the summary view, fetches reputation data, and translates content if necessary.
     */
    const renderSummaryView = async () => {
        if (!currentArticleData) return;

        // Create a deep copy to avoid modifying the original untranslated data
        let displayData = JSON.parse(JSON.stringify(currentArticleData));

        // Show loader while fetching reputation and translating
        renderContent(createLoader());
        
        const pmid = getPmidFromUrl(displayData.link);
        const lang = languageSelector.value;
        
        const promises = [fetchReputation(pmid)];
        if (lang !== 'en') {
            promises.push(
                translateText(displayData.title, lang),
                translateText(displayData.summary, lang),
                translateText(displayData.abstract, lang)
            );
        }

        const [reputationData, ...translatedContent] = await Promise.all(promises);

        if (lang !== 'en') {
            displayData.title = translatedContent[0];
            displayData.summary = translatedContent[1];
            displayData.abstract = translatedContent[2];
        }
        
        renderContent(createSummaryHTML(displayData, reputationData));
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
    const addMessageToChat = async (data, sender, isLoading = false) => {
        await voicePromise; // Make sure voices are loaded before rendering
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

            const langCode = data.reply.match(/[一-龠]/) ? 'zh' : 
                             data.reply.match(/[áéíóúÁÉÍÓÚñÑ]/) ? 'es' :
                             data.reply.match(/[àèéìòùÀÈÉÌÒÙ]/) ? 'fr' : 
                             data.reply.match(/[\u0600-\u06FF]/) ? 'ar' :
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
                    conversation_id: conversationId
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network response was not ok.' }));
                throw new Error(errorData.error || errorData.reply);
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
            searchHistory = searchHistory.slice(0, 20);
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

    const togglePanel = (isOpen) => {
        sidePanel.classList.toggle('open', isOpen);
        panelOverlay.classList.toggle('open', isOpen);
        hamburgerMenu.classList.toggle('open', isOpen);
    };

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
                break;
        }
        renderContent(createResultsHTML(sortedResults));
    };
    
    // --- 8. API CALLS & DATA FETCHING ---
    
    const getPmidFromUrl = (url) => {
        const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
        return match ? match[1] : null;
    };

    const translateText = async (text, lang) => {
        if (!text || lang === 'en') return text;
        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: [text], lang })
            });
            if (!response.ok) return `${text}`; // Return original text on failure
            const data = await response.json();
            return data.translations[0] || text;
        } catch (error) {
            console.error("Translation API error:", error);
            return `${text}`;
        }
    };
    
    const handleSearch = async (query) => {
        if (!query) return;
        currentArticleData = null;
        contentArea.innerHTML = '';
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
                sortSelect.value = 'best-match';
                renderContent(createResultsHTML(lastResults));
                filterContainer.classList.remove('hidden');
            } else {
                renderContent(createError("No articles found for that query."));
            }
        } catch (error) {
            renderContent(createError(error.message));
        }
    };

    const fetchAnalysis = async (url) => {
        filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            
            if (data.abstract === "Abstract not available.") {
                renderContent(createError("This article does not contain an abstract and cannot be analyzed."));
                // Mark the item in the results list as empty
                const resultCard = document.querySelector(`.result-card[data-link="${url}"]`);
                if (resultCard) {
                    resultCard.classList.add('is-empty');
                    resultCard.setAttribute('title', 'This article is empty');
                }
                return;
            }

            currentArticleData = data;
            await renderSummaryView();
        } catch (error) {
            currentArticleData = null;
            renderContent(createError(error.message));
        }
    };

    const fetchReputation = async (pmid) => {
        if (!pmid) return null;
        try {
            const response = await fetch(`${API_BASE_URL}/reputation/${pmid}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Reputation API error:", error);
            return null;
        }
    };

    const fetchAnswer = async (question, context) => {
        const answerBox = document.getElementById('qa-answer-box');
        answerBox.textContent = 'Thinking...';
        try {
            const response = await fetch(`${API_BASE_URL}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            
            const lang = languageSelector.value;
            let answer = data.answer || "A clear answer could not be found in the text.";
            if (lang !== 'en') {
                answer = await translateText(answer, lang);
            }
            answerBox.textContent = answer;
        } catch (error) {
            answerBox.textContent = `Error: ${error.message}`;
        }
    };
    
    // --- 9. EVENT LISTENERS ---

    languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    closePopupBtn.addEventListener('click', () => {
        gsap.to(welcomePopup, { opacity: 0, y: 20, duration: 0.3, onComplete: () => welcomePopup.classList.add('hidden') });
    });
    aiChatButton.addEventListener('click', () => toggleChatModal(true));
    chatCloseBtn.addEventListener('click', () => toggleChatModal(false));
    chatOverlay.addEventListener('click', () => toggleChatModal(false));
    chatInputForm.addEventListener('submit', handleChatSubmit);
    searchButton.addEventListener('click', () => handleSearch(searchInput.value.trim()));
    searchInput.addEventListener('keyup', event => { if (event.key === 'Enter') handleSearch(searchInput.value.trim()); });
    sortSelect.addEventListener('change', sortResults);
    hamburgerMenu.addEventListener('click', () => {
        renderHistory();
        renderSavedArticles();
        togglePanel(!sidePanel.classList.contains('open'));
    });
    closePanelBtn.addEventListener('click', () => togglePanel(false));
    panelOverlay.addEventListener('click', () => togglePanel(false));

    chatMessages.addEventListener('click', event => {
        const messageContent = event.target.closest('.message-content');
        if (!messageContent) return;

        const playBtn = event.target.closest('.tts-btn');
        if (playBtn) {
            const textToSpeak = messageContent.querySelector('.message-text').textContent;
            const stopBtn = messageContent.querySelector('.tts-stop-btn');
            speakText(textToSpeak, () => {
                playBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
            }, () => {
                playBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
            });
            return;
        }
        if (event.target.closest('.tts-stop-btn')) {
            synth.cancel();
            return;
        }
        
        const copyBtn = event.target.closest('.copy-btn');
        if (copyBtn) {
            navigator.clipboard.writeText(messageContent.querySelector('.message-text').textContent).then(() => {
                const feedback = document.createElement('span');
                feedback.className = 'copy-feedback';
                feedback.textContent = 'Copied!';
                messageContent.appendChild(feedback);
                setTimeout(() => feedback.remove(), 1500);
            });
        }
    });

    panelNav.addEventListener('click', event => {
        if (event.target.matches('.tab-btn')) {
            const tab = event.target.dataset.tab;
            document.querySelectorAll('.tab-btn, .panel-tab-content').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(`${tab}-content`).classList.add('active');
        }
    });

    sidePanel.addEventListener('click', event => {
        if (event.target.closest('.history-item-query')) handleSearch(event.target.closest('.history-item-query').dataset.query);
        if (event.target.closest('.remove-history-btn')) {
            const query = event.target.closest('.remove-history-btn').dataset.query;
            if (confirm(`Are you sure you want to delete "${query}" from your history?`)) removeHistoryItem(query);
        }
        if (event.target.closest('.saved-item-title')) {
            fetchAnalysis(event.target.closest('.saved-item').dataset.link);
            togglePanel(false);
        }
        if (event.target.closest('.remove-save-btn')) removeArticle(event.target.closest('.remove-save-btn').dataset.link);
    });

    contentArea.addEventListener('click', event => {
        const resultCard = event.target.closest('.result-card');
        if (resultCard && !resultCard.classList.contains('is-empty')) {
            fetchAnalysis(resultCard.dataset.link);
            return;
        }
        
        const saveBtn = event.target.closest('#save-article-btn');
        if (saveBtn) {
            const article = { title: saveBtn.dataset.title, link: saveBtn.dataset.link };
            const langStrings = translations[languageSelector.value] || translations.en;
            if (saveBtn.classList.contains('saved')) {
                removeArticle(article.link);
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${langStrings.saveButton}`;
            } else {
                saveArticle(article);
                saveBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${langStrings.unsaveButton}`;
            }
            saveBtn.classList.toggle('saved');
            return;
        }
        
        const readBtn = event.target.closest('#read-aloud-btn');
        if (readBtn) {
            speakText(decodeURIComponent(readBtn.dataset.summary), null, null);
            return;
        }

        // Handle the metrics toggle switch
        const toggleCheckbox = event.target.closest('.metrics-toggle-checkbox');
        if (toggleCheckbox) {
            const showPercent = toggleCheckbox.checked;
            const graphsContainer = toggleCheckbox.closest('.analysis-graphs');
            graphsContainer.querySelectorAll('.graph-value-percent').forEach(el => el.classList.toggle('hidden', !showPercent));
            graphsContainer.querySelectorAll('.graph-value-category').forEach(el => el.classList.toggle('hidden', showPercent));
            return;
        }
        
        // Handle the back to results button
        const backBtn = event.target.closest('#back-to-results-btn');
        if (backBtn) {
            currentArticleData = null;
            renderContent(createResultsHTML(lastResults));
            filterContainer.classList.remove('hidden');
            return;
        }
    });
    
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
    const savedLang = localStorage.getItem('aionexLanguage') || 'en';
    languageSelector.value = savedLang;
    setLanguage(savedLang);
});
