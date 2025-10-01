/* ============================================= */
/* AIONEX TEAM - Advanced JS Logic               */
/* Version: 7.5 (Humanized Refactor)             */
/* Author: [Your Name/Team Name]                 */
/* ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & STATE MANAGEMENT ---

    gsap.registerPlugin(); // Initialize GSAP
    const API_BASE_URL = 'http://127.0.0.1:5000/api';
    
    // Application state variables
    let lastResults = []; // Caches the most recent search results for sorting
    let searchHistory = JSON.parse(localStorage.getItem('aionexHistory')) || [];
    let savedArticles = JSON.parse(localStorage.getItem('aionexSaves')) || [];
    let conversationId = `conv_${Date.now()}_${Math.random()}`; // Unique ID for this session's chat

    // --- 2. DOM ELEMENT SELECTION ---
    // Grouping DOM queries makes it easier to find elements later.
    
    // Core Layout & Background
    const splashScreen = document.getElementById('splash-screen');
    const introVideo = document.getElementById('intro-video');
    const contentArea = document.getElementById('content-area');
    const cursorGlow = document.getElementById('cursor-glow');

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


    // --- 3. CORE UI, ANIMATIONS & SPEECH SYNTHESIS ---

    /**
     * Handles the initial animation sequence after the splash video ends.
     */
    const startMainApplication = () => {
        const tl = gsap.timeline();
        tl.to(splashScreen, { opacity: 0, duration: 1.5, ease: 'power2.inOut' })
          .set(splashScreen, { display: 'none' })
          .set("#hamburger-menu, #main-header, #search-container, #ai-chat-button", { visibility: 'visible' })
          .to("#hamburger-menu, #ai-chat-button", { opacity: 1, duration: 1, ease: "power3.out" }, "-=0.5")
          .to("#main-header", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=1")
          .to("#search-container", { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=0.7");
    };

    // Attempt to play the intro video, but have a fallback if it fails.
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
    if (synth.onvoiceschanged !== undefined) { synth.onvoiceschanged = loadVoices; }
    loadVoices();

    /**
     * Speaks a given text using the browser's Speech Synthesis API.
     * @param {string} textToSpeak - The text to be read aloud.
     * @param {function} onStart - Callback function when speech starts.
     * @param {function} onEnd - Callback function when speech ends or is stopped.
     */
    const speakText = (textToSpeak, onStart, onEnd) => {
        if (synth.speaking) {
            synth.cancel();
            return;
        }
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Simple regex to guess the language for better voice selection.
        const langCode = textToSpeak.match(/[а-яА-Я]/) ? 'ru' : 
                         textToSpeak.match(/[一-龠]/) ? 'zh' : 
                         textToSpeak.match(/[ا-ی]/) ? 'fa' : 'en';
        
        utterance.lang = langCode;
        const voice = voices.find(v => v.lang.startsWith(langCode));
        if (voice) utterance.voice = voice;

        utterance.onstart = onStart;
        utterance.onend = onEnd;
        utterance.onerror = onEnd; // Treat error as end

        synth.speak(utterance);
    };

    // --- 4. TEMPLATE & RENDER FUNCTIONS ---
    // These functions generate HTML strings to be injected into the DOM.

    const createLoader = () => `<div class="status-message">Navigating the data cosmos...</div>`;
    const createError = msg => `<div class="status-message" style="color:#e0245e;">Error: ${msg}</div>`;
    const createResultsHTML = articles => articles.map(article => `
        <div class="result-card" data-link="${article.link}" data-title="${article.title}">
            <h4>${article.title}</h4>
        </div>`).join('');
    
    const createSummaryHTML = data => {
        const isSaved = savedArticles.some(article => article.link === data.link);
        const saveButtonText = isSaved ? 'Unsave' : 'Save Article';
        const saveButtonClass = isSaved ? 'saved' : '';
        return `
        <div class="summary-card" data-abstract="${encodeURIComponent(data.abstract)}">
            <div class="summary-header">
                <h2>${data.title}</h2>
                <button id="save-article-btn" class="${saveButtonClass}" data-link="${data.link}" data-title="${data.title}">
                    <i class="fas ${isSaved ? 'fa-trash-alt' : 'fa-save'}"></i> ${saveButtonText}
                </button>
            </div>
            <h3><i class="fas fa-poll"></i> Sentiment Analysis</h3>
            <p><span class="sentiment-badge ${data.sentiment || 'UNKNOWN'}">${data.sentiment || 'UNKNOWN'}</span></p>
            <h3><i class="fas fa-brain"></i> AI Summary <button id="read-aloud-btn" data-summary="${encodeURIComponent(data.summary)}"><i class="fas fa-play"></i> Read</button></h3>
            <p>${data.summary || 'Not available.'}</p>
            <div class="qa-section">
                <h3><i class="fas fa-question-circle"></i> Ask a Question</h3>
                <form class="qa-form" id="qa-form">
                    <input type="text" id="qa-input" placeholder="Ask about the abstract..." required>
                    <button type="submit">Ask</button>
                </form>
                <div class="qa-answer" id="qa-answer-box">The answer will appear here.</div>
            </div>
            <h3><i class="fas fa-file-alt"></i> Original Abstract</h3>
            <p>${data.abstract}</p>
        </div>`;
    }

    /**
     * Renders HTML content into the main content area with a fade-in animation.
     * @param {string} html - The HTML string to render.
     */
    const renderContent = (html) => {
        contentArea.innerHTML = html;
        gsap.fromTo(contentArea.children, 
            { opacity: 0, y: -50 }, 
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
        );
    };

    // --- 5. AI CHAT FUNCTIONS ---

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
                addMessageToChat({reply: "Hello! I'm AIONEX, your guide to space and NASA. How can I help you explore the cosmos today?"}, 'ai');
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
        
        let contentHTML;
        if (isLoading) {
            messageWrapper.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-bubble loading"><div class="dot-flashing"></div></div>
            `;
        } else {
            const avatar = sender === 'ai' ? 'AI' : '<i class="fas fa-user"></i>';
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

            const actionsHTML = sender === 'ai' ? `
                <div class="message-actions">
                    <button class="message-action-btn tts-btn" title="Read aloud"><img src="static/speaker-filled-audio-tool.png" alt="Read"></button>
                    <button class="message-action-btn tts-stop-btn hidden" title="Stop">&times;</button>
                    <button class="message-action-btn copy-btn" title="Copy text"><img src="static/copy.png" alt="Copy"></button>
                </div>` : '';

            contentHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">
                    <div class="message-bubble">
                        <span class="message-text">${data.reply}</span>
                    </div>
                    ${actionsHTML}
                    ${sourcesHTML}
                </div>`;
            messageWrapper.innerHTML = contentHTML;
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
                // Try to parse the error from the server, otherwise throw a generic one
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


    // --- 6. DASHBOARD & LOCALSTORAGE FUNCTIONS ---

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
            </li>`).join('') || '<li>No history yet.</li>';
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
        `).join('') || '<li>No saved articles.</li>';
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

    // --- 7. API CALLS ---

    /**
     * Performs a search via the backend API.
     * @param {string} query - The search query.
     */
    const handleSearch = async (query) => {
        if (!query) return;
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
     * Fetches analysis for a specific article URL.
     * @param {string} url - The URL of the article to analyze.
     */
    const fetchAnalysis = async (url) => {
        filterContainer.classList.add('hidden');
        renderContent(createLoader());
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error.');
            const data = await response.json();
            renderContent(createSummaryHTML(data));
        } catch (error) {
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
            answerBox.textContent = data.answer || "Couldn't find a clear answer in the text.";
        } catch (error) {
            answerBox.textContent = `Error: ${error.message}`;
        }
    };
    
    // --- 8. EVENT LISTENERS ---
    // Centralized place for all event bindings.

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
            if (saveBtn.classList.contains('saved')) {
                removeArticle(article.link);
                saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Article`;
                saveBtn.classList.remove('saved');
            } else {
                saveArticle(article);
                saveBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Unsave`;
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
            const context = decodeURIComponent(event.target.closest('.summary-card').dataset.abstract);
            if(question && context) fetchAnswer(question, context);
        }
    });
});