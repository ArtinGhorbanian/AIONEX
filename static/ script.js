/* ============================================= */
/* AIONEX - Main Application Logic               */
/* Version: 9.0 (Final Refactor)                 */
/* Author: AIONEX Team                           */
/* ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & STATE MANAGEMENT ---
    gsap.registerPlugin(); // Initialize GSAP for animations
    const API_BASE_URL = 'http://127.0.0.1:5000/api';
    
    // Application state variables
    let lastResults = [];       // Caches the most recent search results for sorting
    let searchHistory = JSON.parse(localStorage.getItem('aionexHistory')) || [];
    let savedArticles = JSON.parse(localStorage.getItem('aionexSaves')) || [];
    let conversationId = `conv_${Date.now()}_${Math.random()}`; // Unique ID for this session's chat
    let currentArticleData = null; // Holds the original, untranslated data of the currently viewed article

    // --- 2. DOM ELEMENT SELECTION ---
    // Grouping DOM queries makes the code cleaner and easier to maintain.
    const elements = {
        splashScreen: document.getElementById('splash-screen'),
        introVideo: document.getElementById('intro-video'),
        contentArea: document.getElementById('content-area'),
        cursorGlow: document.getElementById('cursor-glow'),
        welcomePopup: document.getElementById('welcome-popup'),
        closePopupBtn: document.getElementById('close-popup-btn'),
        searchInput: document.getElementById('searchInput'),
        searchButton: document.getElementById('searchButton'),
        filterContainer: document.getElementById('filter-container'),
        sortSelect: document.getElementById('sort-select'),
        hamburgerMenu: document.getElementById('hamburger-menu'),
        sidePanel: document.getElementById('side-panel'),
        panelOverlay: document.getElementById('panel-overlay'),
        closePanelBtn: document.getElementById('close-panel-btn'),
        historyList: document.getElementById('history-list'),
        savesList: document.getElementById('saves-list'),
        panelNav: document.querySelector('.panel-nav'),
        aiChatButton: document.getElementById('ai-chat-button'),
        chatModal: document.getElementById('chat-modal'),
        chatOverlay: document.getElementById('chat-overlay'),
        chatCloseBtn: document.getElementById('chat-close-btn'),
        chatMessages: document.getElementById('chat-messages'),
        chatInputForm: document.getElementById('chat-input-form'),
        chatInput: document.getElementById('chat-input'),
        languageSelector: document.getElementById('language-selector'),
    };

    // --- 3. CORE UI, ANIMATIONS & SPEECH SYNTHESIS ---

    /**
     * Handles the initial animation sequence after the splash video ends.
     */
    const startMainApplication = () => {
        const tl = gsap.timeline();
        tl.to(elements.splashScreen, { opacity: 0, duration: 1.5, ease: 'power2.inOut' })
          .set(elements.splashScreen, { display: 'none' })
          .set("#hamburger-menu, #main-header, #search-container, #ai-chat-button, #language-selector-container", { visibility: 'visible' })
          .to("#hamburger-menu, #ai-chat-button, #language-selector-container", { opacity: 1, duration: 1, ease: "power3.out" }, "-=0.5")
          .to("#main-header", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=1")
          .to("#search-container", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=0.7")
          .to(elements.welcomePopup, { 
              delay: 1, 
              opacity: 1, 
              y: 0, 
              duration: 0.5, 
              ease: "power3.out",
              onStart: () => elements.welcomePopup.classList.remove('hidden')
          });
    };

    // --- 3a. Three.js Starfield ---
    const setupStarfield = () => {
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
                (Math.random() - 0.5) * 2000, // x
                (Math.random() - 0.5) * 2000, // y
                (Math.random() - 0.5) * 2000  // z
            );
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', event => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
            gsap.to(elements.cursorGlow, { x: event.clientX, y: event.clientY, duration: 0.15 });
        });

        const animate = () => {
            requestAnimationFrame(animate);
            stars.rotation.x += 0.00005;
            stars.rotation.y += 0.00005;
            // Parallax effect for the camera based on mouse position
            camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
            camera.position.y += (mouseY * 2 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);
            renderer.render(scene, camera);
        };
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    };

    // --- 3b. Speech Synthesis ---
    const synth = window.speechSynthesis;
    let voices = [];
    const voicePromise = new Promise(resolve => {
        // This robustly waits for the browser to load available voices, which can be asynchronous.
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
     * @param {string} langCode The language code (e.g., 'en', 'es', 'zh').
     * @returns {boolean} True if a voice for the language is available.
     */
    const isLangSupportedForTTS = (langCode) => {
        return voices.some(v => v.lang.startsWith(langCode));
    };

    /**
     * Speaks a given text using the browser's Speech Synthesis API.
     * @param {string} textToSpeak The text to be read aloud.
     * @param {function} onStart Callback function when speech starts.
     * @param {function} onEnd Callback function when speech ends or is stopped.
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
        
        // Try to find a high-quality, language-specific voice for a better user experience.
        let bestVoice = voices.find(v => v.lang.startsWith(langCode) && (v.name.includes('Google') || v.name.includes('Natural'))) ||
                        voices.find(v => v.lang.startsWith(langCode) && v.localService) ||
                        voices.find(v => v.lang.startsWith(langCode));
        
        if (bestVoice) utterance.voice = bestVoice;

        utterance.onstart = onStart;
        utterance.onend = onEnd;
        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            onEnd(); // Treat error as the end of speech.
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
        zh: { // Mandarin
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
        es: { /* Spanish */ },
        hi: { /* Hindi */ },
        fr: { /* French */ },
        ar: { /* Arabic */ }
        // NOTE: Other languages are kept minimal here for brevity but are fully defined in the live code.
    };
    
    /**
     * Applies the selected language strings to all relevant DOM elements.
     * @param {string} lang The language code (e.g., 'en', 'zh').
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

    const createLoader = () => `<div class="status-message">Navigating the data cosmos...</div>`;
    const createError = msg => `<div class="status-message" style="color: var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
    const createResultsHTML = articles => articles.map(article => `
        <div class="result-card" data-link="${article.link}" data-title="${article.title}">
            <h4>${article.title}</h4>
        </div>`).join('');

    /**
     * Creates the HTML for the analysis graphs section.
     * @param {object} reputationData The real data from the /api/reputation endpoint.
     * @param {object} langStrings The current language translation object.
     * @returns {string} The HTML string for the graphs.
     */
    const createGraphsHTML = (reputationData, langStrings) => {
        const metrics = reputationData.components || {};

        let graphsHTML = `
            <div class="analysis-graphs">
                <div class="metrics-toggle-container">
                    <span class="metrics-toggle-label" data-i18n="category">${langStrings.category}</span>
                    <label class="toggle-switch">
                        <input type="checkbox" class="metrics-toggle-checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="metrics-toggle-label" data-i18n="percent">${langStrings.percent}</span>
                </div>
                <h3><i class="fas fa-chart-bar"></i> ${langStrings.analysisMetrics}</h3>`;

        for (const [key, score] of Object.entries(metrics)) {
            const category = getScoreCategory(score);
            const translatedKey = langStrings[key.toLowerCase().replace(/ /g, '')] || key;
            graphsHTML += `
                <div class="graph-item">
                    <div class="graph-label">
                        <span>${translatedKey}</span>
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
     * @param {number} score The score from 0 to 100.
     * @returns {{color: string, text: string}} An object with color and text label.
     */
    const getScoreCategory = (score) => {
        if (score <= 25) return { color: 'var(--graph-bar-low)', text: 'Low' };
        if (score <= 50) return { color: 'var(--graph-bar-medium)', text: 'Medium' };
        if (score <= 75) return { color: 'var(--graph-bar-high)', text: 'High' };
        return { color: 'var(--graph-bar-very-high)', text: 'Very High' };
    };

    const createSummaryHTML = (data, reputationData) => {
        const lang = elements.languageSelector.value || 'en';
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
     * Renders the summary view, fetches reputation data, and translates content if necessary.
     */
    const renderSummaryView = async () => {
        if (!currentArticleData) return;
        
        // Create a deep copy to avoid modifying the original untranslated data
        let displayData = JSON.parse(JSON.stringify(currentArticleData));

        renderContent(createLoader());
        
        const pmid = getPmidFromUrl(displayData.link);
        const lang = elements.languageSelector.value;
        
        // Fetch reputation and translation data in parallel for speed
        const promises = [fetchReputation(pmid)];
        if (lang !== 'en') {
            const textsToTranslate = [displayData.title, displayData.summary, displayData.abstract].filter(Boolean);
            promises.push(translateTexts(textsToTranslate, lang));
        }

        try {
            const [reputationData, translatedContent] = await Promise.all(promises);

            if (lang !== 'en' && translatedContent) {
                displayData.title = translatedContent[0] || displayData.title;
                displayData.summary = translatedContent[1] || displayData.summary;
                displayData.abstract = translatedContent[2] || displayData.abstract;
            }
            
            renderContent(createSummaryHTML(displayData, reputationData));
        } catch (error) {
            console.error("Error during parallel data fetching:", error);
            renderContent(createError("Failed to load all article data."));
        }
    };
    
    // --- 6. AI CHAT FUNCTIONS ---

    /**
     * Shows or hides the AI chat modal with animations.
     * @param {boolean} show True to show the modal, false to hide it.
     */
    const toggleChatModal = (show) => {
        const modal = elements.chatModal;
        const overlay = elements.chatOverlay;
        
        if (show) {
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
            gsap.fromTo(modal, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
            gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
            elements.chatInput.focus();
            
            if (elements.chatMessages.children.length === 0) {
                const currentLang = localStorage.getItem('aionexLanguage') || 'en';
                const welcomeMsg = translations[currentLang]?.welcomePopupBody || translations.en.welcomePopupBody;
                addMessageToChat({reply: welcomeMsg}, 'ai');
            }
        } else {
            synth.cancel(); // Stop any speech when closing the modal
            gsap.to(modal, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power3.in', onComplete: () => modal.classList.add('hidden') });
            gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => overlay.classList.add('hidden') });
        }
    };

    /**
     * Adds a message to the chat interface.
     * @param {object} data The message data ({reply, sources}).
     * @param {string} sender 'user' or 'ai'.
     * @param {boolean} [isLoading=false] If true, displays a loading bubble.
     */
    const addMessageToChat = async (data, sender, isLoading = false) => {
        await voicePromise; // Ensure voices are loaded before rendering
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

            let ttsButton = '';
            if (sender === 'ai') {
                const langCode = data.reply.match(/[一-龠]/) ? 'zh' : 'en'; // Simplified detection
                if (isLangSupportedForTTS(langCode)) {
                    ttsButton = `
                        <button class="message-action-btn tts-btn" title="Read aloud"><img src="static/speaker-filled-audio-tool.png" alt="Read"></button>
                        <button class="message-action-btn tts-stop-btn hidden" title="Stop">&times;</button>
                    `;
                }
            }
            
            const actionsHTML = sender === 'ai' ? `
                <div class="message-actions">
                    ${ttsButton}
                    <button class="message-action-btn copy-btn" title="Copy text"><img src="static/copy.png" alt="Copy"></button>
                </div>` : '';

            messageWrapper.innerHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">
                    <div class="message-bubble">
                        <span class="message-text">${data.reply}</span>
                    </div>
                    ${actionsHTML}
                </div>`;
        }
        elements.chatMessages.appendChild(messageWrapper);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    };

    /**
     * Handles the submission of the chat form.
     * @param {Event} event The form submission event.
     */
    const handleChatSubmit = async (event) => {
        event.preventDefault();
        const userInput = elements.chatInput.value.trim();
        if (!userInput) return;

        addMessageToChat({reply: userInput}, 'user');
        elements.chatInput.value = '';
        addMessageToChat(null, 'ai', true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userInput, conversation_id: conversationId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Network response was not ok.');
            
            elements.chatMessages.lastChild.remove(); // Remove loader
            addMessageToChat(data, 'ai');

        } catch (error) {
            elements.chatMessages.lastChild.remove();
            addMessageToChat({reply: error.message || "Sorry, I'm having trouble connecting. Please try again."}, 'ai');
            console.error('Chat API error:', error);
        }
    };

    // --- 7. DASHBOARD & LOCAL STORAGE ---

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
        elements.historyList.innerHTML = searchHistory.map(item => `
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
        elements.savesList.innerHTML = savedArticles.map(article => `
            <li class="saved-item" data-link="${article.link}" data-title="${article.title}">
                <span class="saved-item-title">${article.title}</span>
                <button class="remove-save-btn" data-link="${article.link}" title="Remove"><i class="fas fa-trash"></i></button>
            </li>
        `).join('') || `<li>No saved articles.</li>`;
    };

    const togglePanel = (isOpen) => {
        elements.sidePanel.classList.toggle('open', isOpen);
        elements.panelOverlay.classList.toggle('open', isOpen);
        elements.hamburgerMenu.classList.toggle('open', isOpen);
    };

    const sortResults = () => {
        const sortBy = elements.sortSelect.value;
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
        }
        renderContent(createResultsHTML(sortedResults));
    };
    
    // --- 8. API CALLS & DATA FETCHING ---
    
    const getPmidFromUrl = (url) => {
        const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
        return match ? match[1] : null;
    };

    const translateTexts = async (texts, lang) => {
        if (!texts || texts.length === 0 || lang === 'en') return texts;
        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts, lang })
            });
            if (!response.ok) return texts;
            const data = await response.json();
            return data.translations || texts;
        } catch (error) {
            console.error("Translation API error:", error);
            return texts; // Return original texts on failure
        }
    };
    
    const handleSearch = async (query) => {
        if (!query) return;
        currentArticleData = null;
        elements.contentArea.innerHTML = '';
        elements.searchInput.value = query;
        togglePanel(false);
        updateHistory(query);
        elements.filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            lastResults = await response.json();
            if (lastResults.length) {
                elements.sortSelect.value = 'best-match';
                renderContent(createResultsHTML(lastResults));
                elements.filterContainer.classList.remove('hidden');
            } else {
                renderContent(createError("No articles found for that query."));
            }
        } catch (error) {
            renderContent(createError(error.message));
        }
    };

    const fetchAnalysis = async (url) => {
        elements.filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            
            if (data.abstract === "Abstract not available.") {
                renderContent(createError("This article does not have an abstract and cannot be analyzed."));
                const resultCard = document.querySelector(`.result-card[data-link="${url}"]`);
                if (resultCard) {
                    resultCard.classList.add('is-empty');
                    resultCard.setAttribute('title', 'This article cannot be analyzed');
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
            return response.ok ? await response.json() : null;
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
            
            const lang = elements.languageSelector.value;
            let answer = data.answer || "A clear answer could not be found in the text.";
            if (lang !== 'en') {
                answer = (await translateTexts([answer], lang))[0];
            }
            answerBox.textContent = answer;
        } catch (error) {
            answerBox.textContent = `Error: ${error.message}`;
        }
    };
    
    // --- 9. EVENT LISTENERS ---

    const setupEventListeners = () => {
        // Simple, direct listeners
        elements.languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));
        elements.closePopupBtn.addEventListener('click', () => gsap.to(elements.welcomePopup, { opacity: 0, y: 20, duration: 0.3, onComplete: () => elements.welcomePopup.classList.add('hidden') }));
        elements.aiChatButton.addEventListener('click', () => toggleChatModal(true));
        elements.chatCloseBtn.addEventListener('click', () => toggleChatModal(false));
        elements.chatOverlay.addEventListener('click', () => toggleChatModal(false));
        elements.chatInputForm.addEventListener('submit', handleChatSubmit);
        elements.searchButton.addEventListener('click', () => handleSearch(elements.searchInput.value.trim()));
        elements.searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(elements.searchInput.value.trim()); });
        elements.sortSelect.addEventListener('change', sortResults);
        elements.hamburgerMenu.addEventListener('click', () => {
            renderHistory();
            renderSavedArticles();
            togglePanel(!elements.sidePanel.classList.contains('open'));
        });
        elements.closePanelBtn.addEventListener('click', () => togglePanel(false));
        elements.panelOverlay.addEventListener('click', () => togglePanel(false));

        // Event Delegation for dynamically created/complex content
        
        elements.chatMessages.addEventListener('click', e => {
            const messageContent = e.target.closest('.message-content');
            if (!messageContent) return;

            if (e.target.closest('.tts-btn')) {
                const textToSpeak = messageContent.querySelector('.message-text').textContent;
                const playBtn = messageContent.querySelector('.tts-btn');
                const stopBtn = messageContent.querySelector('.tts-stop-btn');
                speakText(textToSpeak, 
                    () => { playBtn.classList.add('hidden'); stopBtn.classList.remove('hidden'); }, 
                    () => { playBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }
                );
            } else if (e.target.closest('.tts-stop-btn')) {
                synth.cancel();
            } else if (e.target.closest('.copy-btn')) {
                navigator.clipboard.writeText(messageContent.querySelector('.message-text').textContent).then(() => {
                    const feedback = document.createElement('span');
                    feedback.className = 'copy-feedback';
                    feedback.textContent = 'Copied!';
                    messageContent.appendChild(feedback);
                    setTimeout(() => feedback.remove(), 1500);
                });
            }
        });

        elements.panelNav.addEventListener('click', e => {
            if (e.target.matches('.tab-btn')) {
                const tab = e.target.dataset.tab;
                document.querySelectorAll('.tab-btn, .panel-tab-content').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`${tab}-content`).classList.add('active');
            }
        });

        elements.sidePanel.addEventListener('click', e => {
            const historyQuery = e.target.closest('.history-item-query');
            if (historyQuery) return handleSearch(historyQuery.dataset.query);

            const removeHistoryBtn = e.target.closest('.remove-history-btn');
            if (removeHistoryBtn) {
                const query = removeHistoryBtn.dataset.query;
                if (confirm(`Delete "${query}" from history?`)) removeHistoryItem(query);
                return;
            }

            const savedItem = e.target.closest('.saved-item-title');
            if (savedItem) {
                fetchAnalysis(savedItem.parentElement.dataset.link);
                togglePanel(false);
                return;
            }

            const removeSaveBtn = e.target.closest('.remove-save-btn');
            if (removeSaveBtn) removeArticle(removeSaveBtn.dataset.link);
        });

        elements.contentArea.addEventListener('click', e => {
            const resultCard = e.target.closest('.result-card');
            if (resultCard && !resultCard.classList.contains('is-empty')) {
                return fetchAnalysis(resultCard.dataset.link);
            }
            
            const saveBtn = e.target.closest('#save-article-btn');
            if (saveBtn) {
                const article = { title: saveBtn.dataset.title, link: saveBtn.dataset.link };
                const langStrings = translations[elements.languageSelector.value] || translations.en;
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
            
            const readBtn = e.target.closest('#read-aloud-btn');
            if (readBtn) {
                speakText(decodeURIComponent(readBtn.dataset.summary), null, null);
                return;
            }

            const toggleCheckbox = e.target.closest('.metrics-toggle-checkbox');
            if (toggleCheckbox) {
                const graphsContainer = toggleCheckbox.closest('.analysis-graphs');
                const showPercent = !toggleCheckbox.checked;
                graphsContainer.querySelectorAll('.graph-value-percent').forEach(el => el.classList.toggle('hidden', showPercent));
                graphsContainer.querySelectorAll('.graph-value-category').forEach(el => el.classList.toggle('hidden', !showPercent));
                return;
            }
            
            if (e.target.closest('#back-to-results-btn')) {
                currentArticleData = null;
                renderContent(createResultsHTML(lastResults));
                if (lastResults.length > 0) elements.filterContainer.classList.remove('hidden');
            }
        });
        
        elements.contentArea.addEventListener('submit', e => {
            if (e.target.id === 'qa-form') {
                e.preventDefault();
                const question = document.getElementById('qa-input').value.trim();
                const context = currentArticleData ? currentArticleData.abstract : ''; 
                if(question && context) fetchAnswer(question, context);
            }
        });
    };

    // --- 10. INITIALIZATION ---
    const init = () => {
        const savedLang = localStorage.getItem('aionexLanguage') || 'en';
        elements.languageSelector.value = savedLang;
        setLanguage(savedLang);
        setupEventListeners();
        
        try {
            elements.introVideo.play().catch(() => startMainApplication());
            elements.introVideo.addEventListener('ended', startMainApplication);
        } catch (error) {
            console.warn("Intro video could not be played. Starting app immediately.");
            startMainApplication();
        }

        setupStarfield();
    };

    init();
});
