/* AIONEX production client — framework-free, same-origin, and DOM-safe. */
(() => {
    "use strict";

    const API_BASE = "/api";
    const SUPPORTED_LOCALES = ["en", "zh", "es", "hi", "fr", "ar"];
    const SUPPORTED_THEMES = ["system", "light", "dark"];
    const LOCALE_TAGS = {
        en: "en-US",
        zh: "zh-CN",
        es: "es-ES",
        hi: "hi-IN",
        fr: "fr-FR",
        ar: "ar",
    };
    const STORAGE_KEYS = {
        locale: "aionex.locale.v2",
        theme: "aionex.theme.v2",
        history: "aionex.history.v2",
        saves: "aionex.saves.v2",
    };

    const EN = {
        documentTitle: "AIONEX | Space life-science discovery",
        skipLink: "Skip to research search",
        brandDescriptor: "Research discovery",
        languageLabel: "Language",
        themeLabel: "Theme",
        themeSystem: "System",
        themeLight: "Light",
        themeDark: "Dark",
        libraryAction: "Library",
        assistantAction: "Assistant",
        eyebrow: "Space life-science research, made navigable",
        heroTitle: "Find the signal in scientific literature.",
        heroBody: "Search PubMed, open a paper, and move from abstract to concise analysis, grounded questions, and five transparent discovery signals.",
        searchLabel: "Research topic",
        searchPlaceholder: "Try “microgravity bone density”",
        searchAction: "Search PubMed",
        searchHelp: "Use a condition, organism, experiment, or spaceflight topic.",
        serviceChecking: "Checking local services…",
        serviceReady: "Local research services are ready.",
        serviceDegraded: "Core search is ready; some optional features are unavailable.",
        serviceUnknown: "Service status is unavailable. You can still try a search.",
        resultsKicker: "PubMed results",
        resultsTitle: "Choose a paper to investigate",
        sortLabel: "Sort results",
        sortRelevance: "Best match",
        sortNewest: "Newest",
        sortOldest: "Oldest",
        sortTitle: "Title A–Z",
        backAction: "Back to results",
        sourceAction: "Open on PubMed",
        articleKicker: "Research brief",
        saveAction: "Save article",
        savedAction: "Saved",
        translationNote: "Article text is shown in its source language.",
        translatedNote: "Article title, summary, and abstract are translated for reading. The source remains unchanged.",
        translateAction: "Translate article",
        showOriginalAction: "Show original",
        showTranslationAction: "Show translation",
        analysisKicker: "Transparent extractive analysis",
        summaryTitle: "Concise summary",
        readAction: "Read aloud",
        questionKicker: "Grounded in this abstract",
        questionTitle: "Ask a focused question",
        questionLabel: "Question about the abstract",
        questionPlaceholder: "What changed under microgravity?",
        questionHelp: "Answers are extracted from the displayed source abstract.",
        questionAction: "Find an answer",
        answerTitle: "Evidence from the abstract",
        abstractTitle: "Source abstract",
        signalsKicker: "Five discovery signals",
        signalsTitle: "Context at a glance",
        signalsHelp: "These transparent proxies support discovery. They do not measure scientific quality or truth.",
        methodologyTitle: "Methodology",
        limitationsTitle: "Limitations",
        footerText: "— an accessible interface for exploring public scientific literature.",
        footerCaveat: "Analysis and discovery signals are assistive outputs, not medical or scientific advice.",
        libraryKicker: "Stored on this device",
        libraryTitle: "Your research library",
        closeAction: "Close",
        historyTitle: "Recent searches",
        clearHistoryAction: "Clear history",
        savesTitle: "Saved articles",
        chatKicker: "Optional network service",
        chatTitle: "Space research assistant",
        chatNotice: "Messages may be sent to the configured AI provider. Do not include confidential information.",
        chatLabel: "Message",
        chatPlaceholder: "Ask about space biology or NASA research",
        chatHelp: "The assistant is optional; PubMed discovery works independently.",
        sendAction: "Send message",
        searchRequired: "Enter a research topic before searching.",
        searching: "Searching PubMed for “{query}”…",
        resultCountOne: "1 paper found",
        resultCountMany: "{count} papers found",
        noResults: "No matching papers were found. Try a broader topic or fewer keywords.",
        pubMedSource: "PubMed",
        unknownDate: "Date unavailable",
        openArticleLabel: "Investigate: {title}",
        loadingArticle: "Retrieving the abstract and building an extractive brief…",
        articleLoadError: "This paper could not be analyzed. Return to the results and try another paper.",
        abstractUnavailable: "This PubMed record has no usable abstract. Analysis and abstract Q&A are unavailable.",
        summaryUnavailable: "No extractive summary is available for this record.",
        journalUnknown: "Journal unavailable",
        articleMeta: "{journal} · PMID {pmid}",
        summaryMethod: "Method: {method}",
        summaryEvidence: "Method: {method} · {count} source sentences considered",
        saveAdded: "Article saved on this device.",
        saveRemoved: "Article removed from saved items.",
        translationUnavailable: "Translation is not configured. The original article remains available.",
        translating: "Translating the article text…",
        translationComplete: "Translated text is ready. Verify important details against the source.",
        translationFailed: "Translation could not be completed. The original text is still available.",
        signalsLoading: "Loading five discovery signals…",
        signalsUnavailable: "Discovery signals are unavailable for this paper. The source abstract remains available.",
        signalCitations: "Citations",
        signalPmc: "PMC availability",
        signalRecency: "Recency",
        signalSource: "Source activity",
        signalAuthor: "Author activity",
        signalScore: "{score} out of 100",
        methodologyUnavailable: "Methodology details were not returned.",
        limitationsUnavailable: "No limitation text was returned; treat every signal as a discovery proxy only.",
        questionRequired: "Enter a focused question about this abstract.",
        questionLoading: "Looking for evidence in the source abstract…",
        questionUnavailable: "Abstract Q&A is unavailable for this record.",
        questionFailed: "An answer could not be retrieved. Refine the question or try again.",
        answerFound: "Matching evidence found · term match {score}",
        answerNotFound: "No reliable matching passage was found in this abstract.",
        historyEmpty: "No searches saved yet.",
        savesEmpty: "No articles saved yet.",
        openHistoryLabel: "Search again for {query}",
        openSavedLabel: "Open saved article {title}",
        removeSavedLabel: "Remove {title} from saved articles",
        confirmClearHistory: "Clear all recent searches from this device?",
        historyCleared: "Search history cleared.",
        chatWelcome: "I can help with space, astronomy, and NASA research when the optional assistant is configured.",
        chatUser: "You",
        chatAssistant: "AIONEX",
        chatRequired: "Enter a message before sending.",
        chatThinking: "The assistant is preparing a response…",
        chatUnavailable: "The optional assistant is not configured. PubMed search and local analysis are still available.",
        chatFailed: "The assistant could not respond. Try again later; research search remains available.",
        readMessage: "Read response aloud",
        networkTimeout: "The request timed out. Check the connection and try again.",
        serviceTemporarilyUnavailable: "That service is temporarily unavailable. Try again later.",
        unexpectedError: "Something went wrong. Try the action again.",
        removeAction: "Remove",
    };

    const TRANSLATIONS = {
        en: EN,
        zh: {
            ...EN,
            documentTitle: "AIONEX｜太空生命科学发现",
            skipLink: "跳到研究搜索",
            brandDescriptor: "研究发现",
            languageLabel: "语言",
            themeLabel: "主题",
            themeSystem: "跟随系统",
            themeLight: "浅色",
            themeDark: "深色",
            libraryAction: "资料库",
            assistantAction: "助手",
            eyebrow: "让太空生命科学研究更易探索",
            heroTitle: "从科学文献中找到关键信号。",
            heroBody: "搜索 PubMed，打开论文，并从摘要进入精炼分析、基于原文的问答和五项透明发现信号。",
            searchLabel: "研究主题",
            searchPlaceholder: "例如“微重力 骨密度”",
            searchAction: "搜索 PubMed",
            searchHelp: "输入疾病、生物、实验或航天主题。",
            serviceChecking: "正在检查本地服务…",
            serviceReady: "本地研究服务已就绪。",
            serviceDegraded: "核心搜索可用；部分可选功能不可用。",
            serviceUnknown: "无法获取服务状态，仍可尝试搜索。",
            resultsKicker: "PubMed 结果",
            resultsTitle: "选择一篇论文进行研究",
            sortLabel: "排序",
            sortRelevance: "最佳匹配",
            sortNewest: "最新",
            sortOldest: "最早",
            sortTitle: "标题 A–Z",
            backAction: "返回结果",
            sourceAction: "在 PubMed 打开",
            articleKicker: "研究简报",
            saveAction: "保存论文",
            savedAction: "已保存",
            translationNote: "论文以原始语言显示。",
            translatedNote: "标题、摘要和原文已翻译供阅读；来源内容未改变。",
            translateAction: "翻译论文",
            showOriginalAction: "显示原文",
            showTranslationAction: "显示译文",
            analysisKicker: "透明的抽取式分析",
            summaryTitle: "精炼摘要",
            readAction: "朗读",
            questionKicker: "基于此摘要",
            questionTitle: "提出具体问题",
            questionLabel: "关于摘要的问题",
            questionPlaceholder: "微重力下发生了什么变化？",
            questionHelp: "答案从显示的来源摘要中提取。",
            questionAction: "查找答案",
            answerTitle: "摘要中的证据",
            abstractTitle: "来源摘要",
            signalsKicker: "五项发现信号",
            signalsTitle: "快速了解背景",
            signalsHelp: "这些透明代理指标仅支持发现，不衡量科学质量或真伪。",
            methodologyTitle: "方法",
            limitationsTitle: "局限",
            libraryKicker: "保存在此设备",
            libraryTitle: "你的研究资料库",
            closeAction: "关闭",
            historyTitle: "最近搜索",
            clearHistoryAction: "清除历史",
            savesTitle: "已保存论文",
            chatKicker: "可选网络服务",
            chatTitle: "太空研究助手",
            chatNotice: "消息可能发送给已配置的 AI 提供商，请勿包含机密信息。",
            chatLabel: "消息",
            chatPlaceholder: "询问太空生物学或 NASA 研究",
            chatHelp: "助手是可选的；PubMed 发现功能可独立使用。",
            sendAction: "发送",
            searchRequired: "请先输入研究主题。",
            searching: "正在 PubMed 搜索“{query}”…",
            resultCountOne: "找到 1 篇论文",
            resultCountMany: "找到 {count} 篇论文",
            noResults: "未找到匹配论文，请尝试更宽泛的主题或更少关键词。",
            unknownDate: "日期未知",
            loadingArticle: "正在获取摘要并生成抽取式简报…",
            abstractUnavailable: "此 PubMed 记录没有可用摘要，分析和摘要问答不可用。",
            signalsLoading: "正在加载五项发现信号…",
            signalsUnavailable: "此论文的发现信号暂不可用。",
            signalCitations: "引用",
            signalPmc: "PMC 可用性",
            signalRecency: "时效性",
            signalSource: "来源活跃度",
            signalAuthor: "作者活跃度",
            questionRequired: "请输入关于摘要的具体问题。",
            questionLoading: "正在来源摘要中查找证据…",
            historyEmpty: "尚无搜索记录。",
            savesEmpty: "尚无保存论文。",
            chatWelcome: "配置可选助手后，我可以帮助解答太空、天文学和 NASA 研究问题。",
            chatUser: "你",
            chatRequired: "请输入消息。",
            chatThinking: "助手正在准备回复…",
            chatUnavailable: "可选助手未配置；PubMed 搜索和本地分析仍可使用。",
        },
        es: {
            ...EN,
            documentTitle: "AIONEX | Descubrimiento en ciencias de la vida espacial",
            skipLink: "Ir a la búsqueda científica",
            brandDescriptor: "Descubrimiento científico",
            languageLabel: "Idioma",
            themeLabel: "Tema",
            themeSystem: "Sistema",
            themeLight: "Claro",
            themeDark: "Oscuro",
            libraryAction: "Biblioteca",
            assistantAction: "Asistente",
            eyebrow: "Investigación de vida espacial, fácil de explorar",
            heroTitle: "Encuentra la señal en la literatura científica.",
            heroBody: "Busca en PubMed y pasa del resumen a un análisis conciso, preguntas fundamentadas y cinco señales de descubrimiento transparentes.",
            searchLabel: "Tema de investigación",
            searchPlaceholder: "Prueba “microgravedad densidad ósea”",
            searchAction: "Buscar en PubMed",
            searchHelp: "Usa una condición, organismo, experimento o tema de vuelo espacial.",
            serviceChecking: "Comprobando los servicios locales…",
            serviceReady: "Los servicios locales están listos.",
            serviceDegraded: "La búsqueda funciona; algunas funciones opcionales no están disponibles.",
            serviceUnknown: "No se pudo consultar el estado. Aún puedes buscar.",
            resultsKicker: "Resultados de PubMed",
            resultsTitle: "Elige un artículo para investigar",
            sortLabel: "Ordenar resultados",
            sortRelevance: "Mejor coincidencia",
            sortNewest: "Más recientes",
            sortOldest: "Más antiguos",
            sortTitle: "Título A–Z",
            backAction: "Volver a resultados",
            sourceAction: "Abrir en PubMed",
            articleKicker: "Informe de investigación",
            saveAction: "Guardar artículo",
            savedAction: "Guardado",
            translationNote: "El artículo se muestra en su idioma original.",
            translatedNote: "El título, el resumen y el abstract están traducidos para lectura; la fuente no cambia.",
            translateAction: "Traducir artículo",
            showOriginalAction: "Mostrar original",
            showTranslationAction: "Mostrar traducción",
            analysisKicker: "Análisis extractivo transparente",
            summaryTitle: "Resumen conciso",
            readAction: "Leer en voz alta",
            questionKicker: "Basado en este abstract",
            questionTitle: "Haz una pregunta concreta",
            questionLabel: "Pregunta sobre el abstract",
            questionPlaceholder: "¿Qué cambió bajo microgravedad?",
            questionHelp: "Las respuestas se extraen del abstract de origen.",
            questionAction: "Buscar respuesta",
            answerTitle: "Evidencia del abstract",
            abstractTitle: "Abstract de origen",
            signalsKicker: "Cinco señales de descubrimiento",
            signalsTitle: "Contexto de un vistazo",
            signalsHelp: "Estos indicadores transparentes ayudan a descubrir; no miden calidad científica ni verdad.",
            methodologyTitle: "Metodología",
            limitationsTitle: "Limitaciones",
            libraryKicker: "Guardado en este dispositivo",
            libraryTitle: "Tu biblioteca de investigación",
            closeAction: "Cerrar",
            historyTitle: "Búsquedas recientes",
            clearHistoryAction: "Borrar historial",
            savesTitle: "Artículos guardados",
            chatKicker: "Servicio de red opcional",
            chatTitle: "Asistente de investigación espacial",
            chatNotice: "Los mensajes pueden enviarse al proveedor de IA configurado. No incluyas información confidencial.",
            chatLabel: "Mensaje",
            chatPlaceholder: "Pregunta sobre biología espacial o investigación de la NASA",
            chatHelp: "El asistente es opcional; PubMed funciona de forma independiente.",
            sendAction: "Enviar mensaje",
            searchRequired: "Escribe un tema antes de buscar.",
            searching: "Buscando “{query}” en PubMed…",
            resultCountOne: "1 artículo encontrado",
            resultCountMany: "{count} artículos encontrados",
            noResults: "No se encontraron artículos. Prueba un tema más amplio o menos palabras.",
            unknownDate: "Fecha no disponible",
            loadingArticle: "Recuperando el abstract y creando un informe extractivo…",
            abstractUnavailable: "Este registro no tiene un abstract utilizable. El análisis y las preguntas no están disponibles.",
            signalsLoading: "Cargando cinco señales de descubrimiento…",
            signalsUnavailable: "Las señales no están disponibles para este artículo.",
            signalCitations: "Citas",
            signalPmc: "Disponibilidad en PMC",
            signalRecency: "Actualidad",
            signalSource: "Actividad de la fuente",
            signalAuthor: "Actividad del autor",
            questionRequired: "Escribe una pregunta concreta sobre el abstract.",
            questionLoading: "Buscando evidencia en el abstract…",
            historyEmpty: "Aún no hay búsquedas.",
            savesEmpty: "Aún no hay artículos guardados.",
            chatWelcome: "Puedo ayudar con espacio, astronomía e investigación de la NASA si el asistente opcional está configurado.",
            chatUser: "Tú",
            chatRequired: "Escribe un mensaje antes de enviarlo.",
            chatThinking: "El asistente está preparando una respuesta…",
            chatUnavailable: "El asistente opcional no está configurado. La búsqueda y el análisis siguen disponibles.",
        },
        hi: {
            ...EN,
            documentTitle: "AIONEX | अंतरिक्ष जीवन-विज्ञान खोज",
            skipLink: "शोध खोज पर जाएँ",
            brandDescriptor: "शोध खोज",
            languageLabel: "भाषा",
            themeLabel: "थीम",
            themeSystem: "सिस्टम",
            themeLight: "हल्का",
            themeDark: "गहरा",
            libraryAction: "लाइब्रेरी",
            assistantAction: "सहायक",
            eyebrow: "अंतरिक्ष जीवन-विज्ञान शोध को आसान बनाएँ",
            heroTitle: "वैज्ञानिक साहित्य में सार्थक संकेत खोजें।",
            heroBody: "PubMed खोजें और सार से संक्षिप्त विश्लेषण, स्रोत-आधारित प्रश्नों तथा पाँच पारदर्शी खोज संकेतों तक जाएँ।",
            searchLabel: "शोध विषय",
            searchPlaceholder: "जैसे “माइक्रोग्रैविटी अस्थि घनत्व”",
            searchAction: "PubMed खोजें",
            searchHelp: "स्थिति, जीव, प्रयोग या अंतरिक्ष-उड़ान विषय लिखें।",
            serviceChecking: "स्थानीय सेवाएँ जाँची जा रही हैं…",
            serviceReady: "स्थानीय शोध सेवाएँ तैयार हैं।",
            serviceDegraded: "मुख्य खोज तैयार है; कुछ वैकल्पिक सुविधाएँ उपलब्ध नहीं हैं।",
            serviceUnknown: "सेवा स्थिति उपलब्ध नहीं है; आप फिर भी खोज सकते हैं।",
            resultsKicker: "PubMed परिणाम",
            resultsTitle: "जाँचने के लिए शोध-पत्र चुनें",
            sortLabel: "परिणाम क्रम",
            sortRelevance: "सर्वोत्तम मिलान",
            sortNewest: "नवीनतम",
            sortOldest: "सबसे पुराने",
            sortTitle: "शीर्षक A–Z",
            backAction: "परिणामों पर वापस",
            sourceAction: "PubMed पर खोलें",
            articleKicker: "शोध संक्षेप",
            saveAction: "लेख सहेजें",
            savedAction: "सहेजा गया",
            translationNote: "लेख अपनी मूल भाषा में दिख रहा है।",
            translatedNote: "शीर्षक, सारांश और सार पढ़ने के लिए अनूदित हैं; स्रोत अपरिवर्तित है।",
            translateAction: "लेख का अनुवाद करें",
            showOriginalAction: "मूल दिखाएँ",
            showTranslationAction: "अनुवाद दिखाएँ",
            analysisKicker: "पारदर्शी निष्कर्षण विश्लेषण",
            summaryTitle: "संक्षिप्त सारांश",
            readAction: "सुनें",
            questionKicker: "इसी सार पर आधारित",
            questionTitle: "केंद्रित प्रश्न पूछें",
            questionLabel: "सार के बारे में प्रश्न",
            questionPlaceholder: "माइक्रोग्रैविटी में क्या बदला?",
            questionHelp: "उत्तर दिखाए गए स्रोत-सार से निकाले जाते हैं।",
            questionAction: "उत्तर खोजें",
            answerTitle: "सार से साक्ष्य",
            abstractTitle: "स्रोत सार",
            signalsKicker: "पाँच खोज संकेत",
            signalsTitle: "एक नज़र में संदर्भ",
            signalsHelp: "ये पारदर्शी संकेत केवल खोज में सहायक हैं; वैज्ञानिक गुणवत्ता या सत्य नहीं मापते।",
            methodologyTitle: "पद्धति",
            limitationsTitle: "सीमाएँ",
            libraryKicker: "इस डिवाइस पर संग्रहीत",
            libraryTitle: "आपकी शोध लाइब्रेरी",
            closeAction: "बंद करें",
            historyTitle: "हाल की खोजें",
            clearHistoryAction: "इतिहास साफ़ करें",
            savesTitle: "सहेजे गए लेख",
            chatKicker: "वैकल्पिक नेटवर्क सेवा",
            chatTitle: "अंतरिक्ष शोध सहायक",
            chatNotice: "संदेश कॉन्फ़िगर किए गए AI प्रदाता को भेजे जा सकते हैं। गोपनीय जानकारी न दें।",
            chatLabel: "संदेश",
            chatPlaceholder: "अंतरिक्ष जीवविज्ञान या NASA शोध के बारे में पूछें",
            chatHelp: "सहायक वैकल्पिक है; PubMed खोज स्वतंत्र रूप से काम करती है।",
            sendAction: "संदेश भेजें",
            searchRequired: "खोजने से पहले शोध विषय लिखें।",
            searching: "PubMed पर “{query}” खोजा जा रहा है…",
            resultCountOne: "1 शोध-पत्र मिला",
            resultCountMany: "{count} शोध-पत्र मिले",
            noResults: "कोई मिलता शोध-पत्र नहीं मिला। व्यापक विषय या कम शब्द आज़माएँ।",
            unknownDate: "तारीख उपलब्ध नहीं",
            loadingArticle: "सार लाया जा रहा है और निष्कर्षण संक्षेप बनाया जा रहा है…",
            abstractUnavailable: "इस रिकॉर्ड में उपयोगी सार नहीं है; विश्लेषण और प्रश्नोत्तर उपलब्ध नहीं हैं।",
            signalsLoading: "पाँच खोज संकेत लोड हो रहे हैं…",
            signalsUnavailable: "इस लेख के खोज संकेत उपलब्ध नहीं हैं।",
            signalCitations: "उद्धरण",
            signalPmc: "PMC उपलब्धता",
            signalRecency: "नवीनता",
            signalSource: "स्रोत गतिविधि",
            signalAuthor: "लेखक गतिविधि",
            questionRequired: "सार के बारे में केंद्रित प्रश्न लिखें।",
            questionLoading: "स्रोत सार में साक्ष्य खोजा जा रहा है…",
            historyEmpty: "अभी कोई खोज नहीं है।",
            savesEmpty: "अभी कोई लेख सहेजा नहीं गया।",
            chatWelcome: "वैकल्पिक सहायक कॉन्फ़िगर होने पर मैं अंतरिक्ष, खगोल विज्ञान और NASA शोध में मदद कर सकता हूँ।",
            chatUser: "आप",
            chatRequired: "भेजने से पहले संदेश लिखें।",
            chatThinking: "सहायक उत्तर तैयार कर रहा है…",
            chatUnavailable: "वैकल्पिक सहायक कॉन्फ़िगर नहीं है; खोज और स्थानीय विश्लेषण उपलब्ध हैं।",
        },
        fr: {
            ...EN,
            documentTitle: "AIONEX | Découverte en sciences de la vie spatiale",
            skipLink: "Aller à la recherche scientifique",
            brandDescriptor: "Découverte scientifique",
            languageLabel: "Langue",
            themeLabel: "Thème",
            themeSystem: "Système",
            themeLight: "Clair",
            themeDark: "Sombre",
            libraryAction: "Bibliothèque",
            assistantAction: "Assistant",
            eyebrow: "La recherche en vie spatiale, rendue navigable",
            heroTitle: "Trouvez le signal dans la littérature scientifique.",
            heroBody: "Recherchez PubMed puis passez du résumé à une analyse concise, des questions fondées et cinq signaux de découverte transparents.",
            searchLabel: "Sujet de recherche",
            searchPlaceholder: "Essayez « microgravité densité osseuse »",
            searchAction: "Rechercher PubMed",
            searchHelp: "Utilisez une condition, un organisme, une expérience ou un sujet de vol spatial.",
            serviceChecking: "Vérification des services locaux…",
            serviceReady: "Les services locaux sont prêts.",
            serviceDegraded: "La recherche fonctionne ; certaines fonctions facultatives sont indisponibles.",
            serviceUnknown: "État indisponible. Vous pouvez tout de même lancer une recherche.",
            resultsKicker: "Résultats PubMed",
            resultsTitle: "Choisissez un article à examiner",
            sortLabel: "Trier les résultats",
            sortRelevance: "Meilleure correspondance",
            sortNewest: "Plus récents",
            sortOldest: "Plus anciens",
            sortTitle: "Titre A–Z",
            backAction: "Retour aux résultats",
            sourceAction: "Ouvrir sur PubMed",
            articleKicker: "Note de recherche",
            saveAction: "Enregistrer l’article",
            savedAction: "Enregistré",
            translationNote: "Le texte est affiché dans sa langue source.",
            translatedNote: "Le titre, le résumé et l’abstract sont traduits pour la lecture ; la source reste inchangée.",
            translateAction: "Traduire l’article",
            showOriginalAction: "Afficher l’original",
            showTranslationAction: "Afficher la traduction",
            analysisKicker: "Analyse extractive transparente",
            summaryTitle: "Résumé concis",
            readAction: "Lire à voix haute",
            questionKicker: "Fondé sur cet abstract",
            questionTitle: "Poser une question ciblée",
            questionLabel: "Question sur l’abstract",
            questionPlaceholder: "Qu’est-ce qui a changé en microgravité ?",
            questionHelp: "Les réponses sont extraites de l’abstract source affiché.",
            questionAction: "Trouver une réponse",
            answerTitle: "Preuve dans l’abstract",
            abstractTitle: "Abstract source",
            signalsKicker: "Cinq signaux de découverte",
            signalsTitle: "Le contexte en un coup d’œil",
            signalsHelp: "Ces indicateurs transparents aident à la découverte ; ils ne mesurent ni qualité scientifique ni vérité.",
            methodologyTitle: "Méthodologie",
            limitationsTitle: "Limites",
            libraryKicker: "Stocké sur cet appareil",
            libraryTitle: "Votre bibliothèque de recherche",
            closeAction: "Fermer",
            historyTitle: "Recherches récentes",
            clearHistoryAction: "Effacer l’historique",
            savesTitle: "Articles enregistrés",
            chatKicker: "Service réseau facultatif",
            chatTitle: "Assistant de recherche spatiale",
            chatNotice: "Les messages peuvent être envoyés au fournisseur d’IA configuré. N’incluez aucune information confidentielle.",
            chatLabel: "Message",
            chatPlaceholder: "Posez une question sur la biologie spatiale ou la recherche de la NASA",
            chatHelp: "L’assistant est facultatif ; la recherche PubMed fonctionne indépendamment.",
            sendAction: "Envoyer",
            searchRequired: "Saisissez un sujet avant de rechercher.",
            searching: "Recherche de « {query} » dans PubMed…",
            resultCountOne: "1 article trouvé",
            resultCountMany: "{count} articles trouvés",
            noResults: "Aucun article correspondant. Essayez un sujet plus large ou moins de mots-clés.",
            unknownDate: "Date indisponible",
            loadingArticle: "Récupération de l’abstract et création d’une note extractive…",
            abstractUnavailable: "Ce dossier ne contient pas d’abstract exploitable. L’analyse et les questions sont indisponibles.",
            signalsLoading: "Chargement des cinq signaux de découverte…",
            signalsUnavailable: "Les signaux sont indisponibles pour cet article.",
            signalCitations: "Citations",
            signalPmc: "Disponibilité PMC",
            signalRecency: "Récence",
            signalSource: "Activité de la source",
            signalAuthor: "Activité de l’auteur",
            questionRequired: "Saisissez une question ciblée sur l’abstract.",
            questionLoading: "Recherche de preuves dans l’abstract…",
            historyEmpty: "Aucune recherche pour le moment.",
            savesEmpty: "Aucun article enregistré.",
            chatWelcome: "Je peux aider sur l’espace, l’astronomie et la recherche de la NASA si l’assistant facultatif est configuré.",
            chatUser: "Vous",
            chatRequired: "Saisissez un message avant l’envoi.",
            chatThinking: "L’assistant prépare une réponse…",
            chatUnavailable: "L’assistant facultatif n’est pas configuré ; la recherche et l’analyse restent disponibles.",
        },
        ar: {
            ...EN,
            documentTitle: "AIONEX | استكشاف علوم الحياة في الفضاء",
            skipLink: "انتقل إلى البحث العلمي",
            brandDescriptor: "استكشاف الأبحاث",
            languageLabel: "اللغة",
            themeLabel: "المظهر",
            themeSystem: "النظام",
            themeLight: "فاتح",
            themeDark: "داكن",
            libraryAction: "المكتبة",
            assistantAction: "المساعد",
            eyebrow: "أبحاث علوم الحياة في الفضاء بصورة أسهل",
            heroTitle: "اعثر على الإشارة المهمة في الأدبيات العلمية.",
            heroBody: "ابحث في PubMed وانتقل من الملخص إلى تحليل موجز وأسئلة مستندة إلى المصدر وخمس إشارات اكتشاف شفافة.",
            searchLabel: "موضوع البحث",
            searchPlaceholder: "جرّب «الجاذبية الصغرى كثافة العظام»",
            searchAction: "ابحث في PubMed",
            searchHelp: "استخدم حالة أو كائناً أو تجربة أو موضوع رحلة فضائية.",
            serviceChecking: "جارٍ التحقق من الخدمات المحلية…",
            serviceReady: "خدمات البحث المحلية جاهزة.",
            serviceDegraded: "البحث الأساسي جاهز؛ بعض الميزات الاختيارية غير متاحة.",
            serviceUnknown: "حالة الخدمة غير متاحة. ما زال بإمكانك تجربة البحث.",
            resultsKicker: "نتائج PubMed",
            resultsTitle: "اختر ورقة لدراستها",
            sortLabel: "ترتيب النتائج",
            sortRelevance: "أفضل تطابق",
            sortNewest: "الأحدث",
            sortOldest: "الأقدم",
            sortTitle: "العنوان أ–ي",
            backAction: "العودة إلى النتائج",
            sourceAction: "فتح في PubMed",
            articleKicker: "موجز بحثي",
            saveAction: "حفظ المقال",
            savedAction: "محفوظ",
            translationNote: "يُعرض نص المقال بلغته الأصلية.",
            translatedNote: "تُرجمت العناوين والملخصات للقراءة؛ ويبقى المصدر دون تغيير.",
            translateAction: "ترجمة المقال",
            showOriginalAction: "عرض الأصل",
            showTranslationAction: "عرض الترجمة",
            analysisKicker: "تحليل استخراجي شفاف",
            summaryTitle: "ملخص موجز",
            readAction: "قراءة بصوت عالٍ",
            questionKicker: "مستند إلى هذا الملخص",
            questionTitle: "اطرح سؤالاً محدداً",
            questionLabel: "سؤال حول الملخص",
            questionPlaceholder: "ما الذي تغيّر في الجاذبية الصغرى؟",
            questionHelp: "تُستخرج الإجابات من ملخص المصدر المعروض.",
            questionAction: "العثور على إجابة",
            answerTitle: "دليل من الملخص",
            abstractTitle: "ملخص المصدر",
            signalsKicker: "خمس إشارات اكتشاف",
            signalsTitle: "السياق بنظرة سريعة",
            signalsHelp: "تساعد هذه المؤشرات الشفافة في الاكتشاف ولا تقيس الجودة العلمية أو الحقيقة.",
            methodologyTitle: "المنهجية",
            limitationsTitle: "القيود",
            libraryKicker: "محفوظ على هذا الجهاز",
            libraryTitle: "مكتبة أبحاثك",
            closeAction: "إغلاق",
            historyTitle: "عمليات البحث الأخيرة",
            clearHistoryAction: "مسح السجل",
            savesTitle: "المقالات المحفوظة",
            chatKicker: "خدمة شبكة اختيارية",
            chatTitle: "مساعد أبحاث الفضاء",
            chatNotice: "قد تُرسل الرسائل إلى مزود الذكاء الاصطناعي المهيأ. لا تُدرج معلومات سرية.",
            chatLabel: "الرسالة",
            chatPlaceholder: "اسأل عن بيولوجيا الفضاء أو أبحاث ناسا",
            chatHelp: "المساعد اختياري؛ يعمل اكتشاف PubMed بصورة مستقلة.",
            sendAction: "إرسال الرسالة",
            searchRequired: "أدخل موضوعاً بحثياً قبل البحث.",
            searching: "جارٍ البحث عن «{query}» في PubMed…",
            resultCountOne: "تم العثور على ورقة واحدة",
            resultCountMany: "تم العثور على {count} ورقة",
            noResults: "لم تُعثر على أوراق مطابقة. جرّب موضوعاً أوسع أو كلمات أقل.",
            unknownDate: "التاريخ غير متاح",
            loadingArticle: "جارٍ جلب الملخص وإنشاء موجز استخراجي…",
            abstractUnavailable: "لا يحتوي هذا السجل على ملخص قابل للاستخدام؛ التحليل والأسئلة غير متاحين.",
            signalsLoading: "جارٍ تحميل إشارات الاكتشاف الخمس…",
            signalsUnavailable: "إشارات الاكتشاف غير متاحة لهذه الورقة.",
            signalCitations: "الاستشهادات",
            signalPmc: "التوفر في PMC",
            signalRecency: "حداثة النشر",
            signalSource: "نشاط المصدر",
            signalAuthor: "نشاط المؤلف",
            questionRequired: "أدخل سؤالاً محدداً حول الملخص.",
            questionLoading: "جارٍ البحث عن دليل في ملخص المصدر…",
            historyEmpty: "لا توجد عمليات بحث بعد.",
            savesEmpty: "لا توجد مقالات محفوظة بعد.",
            chatWelcome: "يمكنني المساعدة في الفضاء والفلك وأبحاث ناسا عند تهيئة المساعد الاختياري.",
            chatUser: "أنت",
            chatRequired: "أدخل رسالة قبل الإرسال.",
            chatThinking: "يُحضّر المساعد رداً…",
            chatUnavailable: "المساعد الاختياري غير مهيأ؛ بحث PubMed والتحليل المحلي ما زالا متاحين.",
        },
    };

    class RequestError extends Error {
        constructor(message, status = 0) {
            super(message);
            this.name = "RequestError";
            this.status = status;
        }
    }

    const dom = {
        languageSelect: document.getElementById("language-select"),
        themeSelect: document.getElementById("theme-select"),
        searchForm: document.getElementById("search-form"),
        searchInput: document.getElementById("search-input"),
        searchError: document.getElementById("search-error"),
        searchSubmit: document.getElementById("search-submit"),
        serviceLine: document.getElementById("service-line"),
        serviceStatus: document.getElementById("service-status"),
        globalStatus: document.getElementById("global-status"),
        loadingTemplate: document.getElementById("loading-template"),
        resultsSection: document.getElementById("results-section"),
        resultsTitle: document.getElementById("results-title"),
        resultCount: document.getElementById("result-count"),
        resultList: document.getElementById("result-list"),
        sortSelect: document.getElementById("sort-select"),
        articleSection: document.getElementById("article-section"),
        backToResults: document.getElementById("back-to-results"),
        pubmedLink: document.getElementById("pubmed-link"),
        articleTitle: document.getElementById("article-title"),
        articleMeta: document.getElementById("article-meta"),
        articleSummary: document.getElementById("article-summary"),
        summaryMeta: document.getElementById("summary-meta"),
        analysisNote: document.getElementById("analysis-note"),
        articleAbstract: document.getElementById("article-abstract"),
        saveArticle: document.getElementById("save-article"),
        saveArticleLabel: document.getElementById("save-article-label"),
        translationTools: document.getElementById("translation-tools"),
        translationNote: document.getElementById("translation-note"),
        translateArticle: document.getElementById("translate-article"),
        translateLabel: document.getElementById("translate-label"),
        readSummary: document.getElementById("read-summary"),
        questionForm: document.getElementById("question-form"),
        questionInput: document.getElementById("question-input"),
        questionError: document.getElementById("question-error"),
        questionSubmit: document.getElementById("question-submit"),
        answerBox: document.getElementById("answer-box"),
        answerText: document.getElementById("answer-text"),
        answerMeta: document.getElementById("answer-meta"),
        signalsStatus: document.getElementById("signals-status"),
        signalList: document.getElementById("signal-list"),
        signalDisclosure: document.getElementById("signal-disclosure"),
        signalsMethodology: document.getElementById("signals-methodology"),
        signalsLimitations: document.getElementById("signals-limitations"),
        libraryOpen: document.getElementById("library-open"),
        libraryDialog: document.getElementById("library-dialog"),
        historyList: document.getElementById("history-list"),
        savesList: document.getElementById("saves-list"),
        clearHistory: document.getElementById("clear-history"),
        chatOpen: document.getElementById("chat-open"),
        chatDialog: document.getElementById("chat-dialog"),
        chatLog: document.getElementById("chat-log"),
        chatForm: document.getElementById("chat-form"),
        chatInput: document.getElementById("chat-input"),
        chatError: document.getElementById("chat-error"),
        chatSubmit: document.getElementById("chat-submit"),
        toastRegion: document.getElementById("toast-region"),
    };

    const state = {
        locale: readChoice(STORAGE_KEYS.locale, SUPPORTED_LOCALES, "en"),
        theme: readChoice(STORAGE_KEYS.theme, SUPPORTED_THEMES, "system"),
        history: loadHistory(),
        saves: loadSaves(),
        results: [],
        article: null,
        translation: null,
        showTranslated: false,
        signals: null,
        health: null,
        features: { translation: true, chat: true },
        operations: new Map(),
        sequence: { search: 0, analyze: 0, signals: 0, translate: 0, ask: 0, chat: 0 },
        resultsScrollY: 0,
        conversationId: createConversationId(),
        chatInitialized: false,
        toastTimer: null,
        dialogTriggers: new WeakMap(),
    };

    function t(key, values = {}) {
        const dictionary = TRANSLATIONS[state.locale] || EN;
        let text = dictionary[key] || EN[key] || key;
        for (const [name, value] of Object.entries(values)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
        return text;
    }

    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (_error) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (_error) {
            return false;
        }
    }

    function readChoice(key, allowed, fallback) {
        const value = safeStorageGet(key);
        return allowed.includes(value) ? value : fallback;
    }

    function parseStoredArray(key) {
        const raw = safeStorageGet(key);
        if (!raw) return [];
        try {
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
        } catch (_error) {
            return [];
        }
    }

    function cleanText(value, maxLength = 2000) {
        if (typeof value !== "string") return "";
        return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
    }

    function safePubMedUrl(value) {
        if (typeof value !== "string") return null;
        try {
            const url = new URL(value);
            if (
                url.protocol !== "https:" ||
                url.hostname !== "pubmed.ncbi.nlm.nih.gov" ||
                url.username ||
                url.password ||
                url.port
            ) return null;
            if (!/^\/\d+\/?$/.test(url.pathname)) return null;
            url.search = "";
            url.hash = "";
            return url.toString();
        } catch (_error) {
            return null;
        }
    }

    function loadHistory() {
        const unique = new Set();
        const history = [];
        for (const item of parseStoredArray(STORAGE_KEYS.history)) {
            const query = cleanText(item, 200);
            const key = query.toLocaleLowerCase();
            if (!query || unique.has(key)) continue;
            unique.add(key);
            history.push(query);
            if (history.length === 20) break;
        }
        return history;
    }

    function loadSaves() {
        const unique = new Set();
        const saves = [];
        for (const item of parseStoredArray(STORAGE_KEYS.saves)) {
            if (!item || typeof item !== "object") continue;
            const link = safePubMedUrl(item.link);
            const title = cleanText(item.title, 500);
            if (!link || !title || unique.has(link)) continue;
            unique.add(link);
            saves.push({ title, link, date: cleanText(item.date, 40) });
            if (saves.length === 50) break;
        }
        return saves;
    }

    function persistHistory() {
        safeStorageSet(STORAGE_KEYS.history, JSON.stringify(state.history));
    }

    function persistSaves() {
        safeStorageSet(STORAGE_KEYS.saves, JSON.stringify(state.saves));
    }

    function createConversationId() {
        if (window.crypto?.randomUUID) return `conv_${window.crypto.randomUUID()}`;
        if (window.crypto?.getRandomValues) {
            const bytes = new Uint32Array(4);
            window.crypto.getRandomValues(bytes);
            return `conv_${Array.from(bytes, (value) => value.toString(16)).join("")}`;
        }
        return `conv_${Date.now().toString(36)}`;
    }

    function createOperation(name) {
        state.operations.get(name)?.abort();
        const controller = new AbortController();
        state.operations.set(name, controller);
        state.sequence[name] += 1;
        return { controller, sequence: state.sequence[name] };
    }

    function finishOperation(name, controller) {
        if (state.operations.get(name) === controller) state.operations.delete(name);
    }

    function abortOperations(...names) {
        for (const name of names) {
            state.operations.get(name)?.abort();
            state.operations.delete(name);
        }
    }

    async function requestJSON(path, options = {}) {
        const timeoutController = new AbortController();
        let didTimeout = false;
        const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 20000;
        const onExternalAbort = () => timeoutController.abort();
        options.signal?.addEventListener("abort", onExternalAbort, { once: true });
        const timeoutId = window.setTimeout(() => {
            didTimeout = true;
            timeoutController.abort();
        }, timeoutMs);

        const headers = new Headers(options.headers || {});
        const fetchOptions = {
            method: options.method || "GET",
            credentials: "same-origin",
            headers,
            signal: timeoutController.signal,
        };
        if (options.body !== undefined) {
            headers.set("Content-Type", "application/json");
            fetchOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${API_BASE}${path}`, fetchOptions);
            let data = null;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                data = await response.json().catch(() => null);
            } else {
                const text = cleanText(await response.text().catch(() => ""), 500);
                data = text ? { error: text } : null;
            }
            if (!response.ok) {
                const message = cleanText(data?.error || data?.message, 500) || `HTTP ${response.status}`;
                throw new RequestError(message, response.status);
            }
            return data;
        } catch (error) {
            if (error?.name === "AbortError" && didTimeout) {
                const timeoutError = new Error(t("networkTimeout"));
                timeoutError.name = "TimeoutError";
                throw timeoutError;
            }
            throw error;
        } finally {
            window.clearTimeout(timeoutId);
            options.signal?.removeEventListener("abort", onExternalAbort);
        }
    }

    function friendlyError(error, fallbackKey) {
        if (error?.name === "TimeoutError") return t("networkTimeout");
        if (error instanceof RequestError && error.status >= 500 && error.status < 600) {
            return t("serviceTemporarilyUnavailable");
        }
        if (error instanceof RequestError && error.status >= 400 && error.status < 500) {
            return cleanText(error.message, 300) || t(fallbackKey);
        }
        return t(fallbackKey || "unexpectedError");
    }

    function setBusy(button, busy) {
        button.disabled = Boolean(busy);
        if (busy) button.setAttribute("aria-busy", "true");
        else button.removeAttribute("aria-busy");
    }

    function setFieldError(field, errorElement, message) {
        errorElement.textContent = message || "";
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
    }

    function clearGlobalStatus() {
        dom.globalStatus.replaceChildren();
        dom.globalStatus.removeAttribute("aria-label");
    }

    function showLoading(message) {
        const label = document.createElement("p");
        label.className = "status-card";
        label.textContent = message;
        const skeleton = dom.loadingTemplate.content.cloneNode(true);
        dom.globalStatus.replaceChildren(label, skeleton);
        dom.globalStatus.setAttribute("aria-label", message);
    }

    function showGlobalMessage(message, kind = "status") {
        const element = document.createElement("p");
        element.className = kind === "error" ? "error-state" : kind === "empty" ? "empty-state" : "status-card";
        element.textContent = message;
        dom.globalStatus.replaceChildren(element);
        dom.globalStatus.setAttribute("aria-label", message);
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        dom.toastRegion.replaceChildren(toast);
        state.toastTimer = window.setTimeout(() => dom.toastRegion.replaceChildren(), 4200);
    }

    function focusHeading(element) {
        element.setAttribute("tabindex", "-1");
        element.focus({ preventScroll: true });
        element.addEventListener("blur", () => element.removeAttribute("tabindex"), { once: true });
    }

    function preferredScrollBehavior() {
        return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    }

    function makeIcon(symbolId) {
        const namespace = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(namespace, "svg");
        const use = document.createElementNS(namespace, "use");
        svg.classList.add("icon");
        svg.setAttribute("aria-hidden", "true");
        use.setAttribute("href", `#${symbolId}`);
        svg.append(use);
        return svg;
    }

    function applyTheme(theme, persist = true) {
        const nextTheme = SUPPORTED_THEMES.includes(theme) ? theme : "system";
        state.theme = nextTheme;
        document.documentElement.dataset.theme = nextTheme;
        dom.themeSelect.value = nextTheme;
        if (persist) safeStorageSet(STORAGE_KEYS.theme, nextTheme);
    }

    function applyLocale(locale, persist = true) {
        const nextLocale = SUPPORTED_LOCALES.includes(locale) ? locale : "en";
        if (nextLocale !== state.locale) abortOperations("translate");
        state.locale = nextLocale;
        document.documentElement.lang = LOCALE_TAGS[nextLocale];
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.title = t("documentTitle");
        dom.languageSelect.value = nextLocale;
        document.querySelectorAll("[data-i18n]").forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
            element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
        });
        if (persist) safeStorageSet(STORAGE_KEYS.locale, nextLocale);

        if (state.translation?.locale !== nextLocale) {
            state.translation = null;
            state.showTranslated = false;
        }
        if (state.results.length) renderResults();
        if (state.article) renderArticle();
        if (state.signals) renderSignals(state.signals);
        renderLibrary();
        updateHealthUI();
        updateChatWelcome();
    }

    function normalizeSearchResult(item) {
        if (!item || typeof item !== "object") return null;
        const title = cleanText(item.title, 500);
        const link = safePubMedUrl(item.link);
        if (!title || !link) return null;
        return {
            title,
            link,
            date: cleanText(item.date, 40),
            pmid: cleanText(String(item.pmid || ""), 20),
        };
    }

    function parseDate(value) {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1900) return null;
        return date;
    }

    function formatDate(value) {
        const date = parseDate(value);
        if (!date) return t("unknownDate");
        try {
            return new Intl.DateTimeFormat(LOCALE_TAGS[state.locale], {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
            }).format(date);
        } catch (_error) {
            return value;
        }
    }

    function sortedResults() {
        const results = [...state.results];
        switch (dom.sortSelect.value) {
            case "newest":
                return results.sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
            case "oldest":
                return results.sort((a, b) => (parseDate(a.date)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.date)?.getTime() || Number.MAX_SAFE_INTEGER));
            case "title":
                return results.sort((a, b) => a.title.localeCompare(b.title, LOCALE_TAGS[state.locale]));
            default:
                return results;
        }
    }

    function renderResults() {
        dom.resultList.replaceChildren();
        const results = sortedResults();
        dom.resultCount.textContent = results.length === 1
            ? t("resultCountOne")
            : t("resultCountMany", { count: new Intl.NumberFormat(LOCALE_TAGS[state.locale]).format(results.length) });

        if (!results.length) {
            const item = document.createElement("li");
            item.className = "library-empty";
            item.textContent = t("noResults");
            dom.resultList.append(item);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const article of results) {
            const item = document.createElement("li");
            const button = document.createElement("button");
            const title = document.createElement("h3");
            const meta = document.createElement("div");
            const source = document.createElement("span");
            const date = document.createElement("span");

            button.type = "button";
            button.className = "result-card";
            button.setAttribute("aria-label", t("openArticleLabel", { title: article.title }));
            title.textContent = article.title;
            meta.className = "result-meta";
            source.textContent = t("pubMedSource");
            date.textContent = formatDate(article.date);
            meta.append(source, date);
            button.append(title, meta);
            button.addEventListener("click", () => analyzeArticle(article));
            item.append(button);
            fragment.append(item);
        }
        dom.resultList.append(fragment);
    }

    function addHistory(query) {
        const normalized = query.toLocaleLowerCase();
        state.history = [query, ...state.history.filter((item) => item.toLocaleLowerCase() !== normalized)].slice(0, 20);
        persistHistory();
        renderLibrary();
    }

    async function performSearch(query) {
        const cleanedQuery = cleanText(query, 200);
        setFieldError(dom.searchInput, dom.searchError, "");
        if (!cleanedQuery) {
            setFieldError(dom.searchInput, dom.searchError, t("searchRequired"));
            dom.searchInput.focus();
            return;
        }

        const { controller, sequence } = createOperation("search");
        abortOperations("analyze", "signals", "translate", "ask");
        state.article = null;
        state.translation = null;
        state.signals = null;
        dom.articleSection.hidden = true;
        dom.resultsSection.hidden = true;
        setBusy(dom.searchSubmit, true);
        addHistory(cleanedQuery);
        showLoading(t("searching", { query: cleanedQuery }));

        try {
            const data = await requestJSON("/search", {
                method: "POST",
                body: { query: cleanedQuery },
                signal: controller.signal,
                timeoutMs: 25000,
            });
            if (sequence !== state.sequence.search) return;
            const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
            state.results = items.map(normalizeSearchResult).filter(Boolean);
            dom.sortSelect.value = "relevance";
            renderResults();
            clearGlobalStatus();
            dom.resultsSection.hidden = false;
            dom.articleSection.hidden = true;
            focusHeading(dom.resultsTitle);
            dom.resultsSection.scrollIntoView({ block: "start", behavior: preferredScrollBehavior() });
        } catch (error) {
            if (error?.name === "AbortError") return;
            state.results = [];
            dom.resultsSection.hidden = true;
            showGlobalMessage(friendlyError(error, "unexpectedError"), "error");
            dom.globalStatus.focus({ preventScroll: true });
        } finally {
            finishOperation("search", controller);
            if (sequence === state.sequence.search) setBusy(dom.searchSubmit, false);
        }
    }

    function normalizeArticle(data, fallback) {
        const link = safePubMedUrl(data?.link) || fallback.link;
        const pmid = cleanText(String(data?.pmid || extractPmid(link) || ""), 20);
        return {
            title: cleanText(data?.title, 1000) || fallback.title,
            abstract: cleanText(data?.abstract, 200000),
            abstractAvailable: data?.abstract_available !== false && Boolean(cleanText(data?.abstract, 200000)),
            journal: cleanText(data?.journal, 500),
            link,
            pmid,
            summary: cleanText(data?.summary, 50000),
            method: cleanText(data?.method, 120),
            sourceSentenceCount: Number.isFinite(Number(data?.source_sentence_count)) ? Number(data.source_sentence_count) : null,
            analysisNote: cleanText(data?.analysis_note, 3000),
            date: fallback.date || "",
        };
    }

    function extractPmid(link) {
        const url = safePubMedUrl(link);
        if (!url) return "";
        return new URL(url).pathname.match(/\d+/)?.[0] || "";
    }

    async function analyzeArticle(article) {
        const normalizedFallback = normalizeSearchResult(article);
        if (!normalizedFallback) return;
        const { controller, sequence } = createOperation("analyze");
        abortOperations("signals", "translate", "ask");
        state.resultsScrollY = window.scrollY;
        state.translation = null;
        state.showTranslated = false;
        state.signals = null;
        dom.resultsSection.hidden = true;
        dom.articleSection.hidden = true;
        showLoading(t("loadingArticle"));

        try {
            const data = await requestJSON("/analyze", {
                method: "POST",
                body: { url: normalizedFallback.link },
                signal: controller.signal,
                timeoutMs: 45000,
            });
            if (sequence !== state.sequence.analyze) return;
            state.article = normalizeArticle(data, normalizedFallback);
            renderArticle();
            clearGlobalStatus();
            dom.articleSection.hidden = false;
            window.scrollTo({ top: dom.articleSection.offsetTop - 16, behavior: preferredScrollBehavior() });
            focusHeading(dom.articleTitle);
            fetchSignals(state.article);
        } catch (error) {
            if (error?.name === "AbortError") return;
            state.article = null;
            dom.resultsSection.hidden = false;
            showGlobalMessage(friendlyError(error, "articleLoadError"), "error");
            dom.globalStatus.focus({ preventScroll: true });
        } finally {
            finishOperation("analyze", controller);
        }
    }

    function displayedArticle() {
        if (state.showTranslated && state.translation?.locale === state.locale) return state.translation;
        return state.article;
    }

    function renderArticle() {
        if (!state.article) return;
        const display = displayedArticle();
        dom.articleTitle.textContent = display.title || state.article.title;
        dom.articleSummary.textContent = display.summary || t("summaryUnavailable");
        dom.articleAbstract.textContent = display.abstract || t("abstractUnavailable");
        const journal = state.article.journal || t("journalUnknown");
        dom.articleMeta.textContent = t("articleMeta", { journal, pmid: state.article.pmid || "—" });
        dom.pubmedLink.href = state.article.link;
        dom.pubmedLink.hidden = !state.article.link;

        const method = state.article.method || "extractive";
        dom.summaryMeta.textContent = Number.isFinite(state.article.sourceSentenceCount)
            ? t("summaryEvidence", { method, count: state.article.sourceSentenceCount })
            : t("summaryMethod", { method });
        dom.analysisNote.textContent = state.article.analysisNote;
        dom.analysisNote.hidden = !state.article.analysisNote;

        dom.questionInput.disabled = !state.article.abstractAvailable;
        dom.questionSubmit.disabled = !state.article.abstractAvailable;
        dom.readSummary.disabled = !display.summary || !("speechSynthesis" in window);
        if (!state.article.abstractAvailable) {
            setFieldError(dom.questionInput, dom.questionError, t("questionUnavailable"));
        } else {
            setFieldError(dom.questionInput, dom.questionError, "");
        }

        dom.translationTools.hidden = state.locale === "en";
        if (state.locale !== "en") {
            const unavailable = state.features.translation === false;
            dom.translateArticle.disabled = unavailable;
            if (unavailable) {
                dom.translationNote.textContent = t("translationUnavailable");
                dom.translateLabel.textContent = t("translateAction");
            } else if (state.showTranslated) {
                dom.translationNote.textContent = t("translatedNote");
                dom.translateLabel.textContent = t("showOriginalAction");
            } else if (state.translation?.locale === state.locale) {
                dom.translationNote.textContent = t("translationNote");
                dom.translateLabel.textContent = t("showTranslationAction");
            } else {
                dom.translationNote.textContent = t("translationNote");
                dom.translateLabel.textContent = t("translateAction");
            }
        }
        updateSaveButton();
    }

    function updateSaveButton() {
        if (!state.article) return;
        const saved = state.saves.some((item) => item.link === state.article.link);
        dom.saveArticle.classList.toggle("is-active", saved);
        dom.saveArticle.setAttribute("aria-pressed", String(saved));
        dom.saveArticleLabel.textContent = saved ? t("savedAction") : t("saveAction");
    }

    function toggleSave() {
        if (!state.article?.link) return;
        const index = state.saves.findIndex((item) => item.link === state.article.link);
        if (index >= 0) {
            state.saves.splice(index, 1);
            showToast(t("saveRemoved"));
        } else {
            state.saves.unshift({
                title: state.article.title,
                link: state.article.link,
                date: state.article.date,
            });
            state.saves = state.saves.slice(0, 50);
            showToast(t("saveAdded"));
        }
        persistSaves();
        updateSaveButton();
        renderLibrary();
    }

    function returnToResults() {
        abortOperations("analyze", "signals", "translate", "ask");
        window.speechSynthesis?.cancel();
        dom.articleSection.hidden = true;
        dom.resultsSection.hidden = false;
        clearGlobalStatus();
        focusHeading(dom.resultsTitle);
        window.scrollTo({ top: state.resultsScrollY, behavior: preferredScrollBehavior() });
    }

    async function translateArticle() {
        if (!state.article || state.locale === "en") return;
        if (state.features.translation === false) {
            showToast(t("translationUnavailable"));
            return;
        }
        if (state.translation?.locale === state.locale) {
            state.showTranslated = !state.showTranslated;
            renderArticle();
            return;
        }

        const { controller, sequence } = createOperation("translate");
        setBusy(dom.translateArticle, true);
        dom.translationNote.textContent = t("translating");
        try {
            const data = await requestJSON("/translate", {
                method: "POST",
                body: {
                    texts: [state.article.title, state.article.summary, state.article.abstract],
                    lang: state.locale,
                },
                signal: controller.signal,
                timeoutMs: 30000,
            });
            if (sequence !== state.sequence.translate) return;
            const translations = Array.isArray(data?.translations) ? data.translations : [];
            if (translations.length < 3) throw new RequestError("Incomplete translation response", 502);
            state.translation = {
                locale: state.locale,
                title: cleanText(translations[0], 1000) || state.article.title,
                summary: cleanText(translations[1], 50000) || state.article.summary,
                abstract: cleanText(translations[2], 200000) || state.article.abstract,
            };
            state.showTranslated = true;
            renderArticle();
            showToast(t("translationComplete"));
        } catch (error) {
            if (error?.name === "AbortError") return;
            if (error instanceof RequestError && error.status === 503) {
                state.features.translation = false;
                configureOptionalFeatures();
            }
            dom.translationNote.textContent = friendlyError(error, "translationFailed");
            showToast(t("translationFailed"));
        } finally {
            finishOperation("translate", controller);
            if (sequence === state.sequence.translate) {
                setBusy(dom.translateArticle, false);
                dom.translateArticle.disabled = state.features.translation === false;
            }
        }
    }

    const SIGNAL_KEYS = {
        citations: { label: "signalCitations", order: 0 },
        pmcavailability: { label: "signalPmc", order: 1 },
        recency: { label: "signalRecency", order: 2 },
        sourceactivity: { label: "signalSource", order: 3 },
        authoractivity: { label: "signalAuthor", order: 4 },
    };

    function canonicalSignalKey(value) {
        return String(value).toLocaleLowerCase().replace(/[^a-z]/g, "");
    }

    function describeValue(value, depth = 0) {
        if (value === null || value === undefined) return "";
        if (typeof value === "string") return cleanText(value, 2000);
        if (typeof value === "number" || typeof value === "boolean") {
            return typeof value === "number"
                ? new Intl.NumberFormat(LOCALE_TAGS[state.locale]).format(value)
                : String(value);
        }
        if (Array.isArray(value)) {
            return value.slice(0, 6).map((item) => describeValue(item, depth + 1)).filter(Boolean).join(" · ");
        }
        if (typeof value === "object" && depth < 2) {
            const preferred = value.description || value.detail || value.explanation || value.note;
            if (preferred) return describeValue(preferred, depth + 1);
            return Object.entries(value).slice(0, 5).map(([key, item]) => {
                const detail = describeValue(item, depth + 1);
                return detail ? `${key.replaceAll("_", " ")}: ${detail}` : "";
            }).filter(Boolean).join(" · ");
        }
        return "";
    }

    function normalizeSignals(data) {
        const components = data?.components;
        if (!components || typeof components !== "object") return [];
        const details = data?.details && typeof data.details === "object" ? data.details : {};
        return Object.entries(components).map(([key, rawScore]) => {
            const canonical = canonicalSignalKey(key);
            const config = SIGNAL_KEYS[canonical] || { label: null, order: 99 };
            const numeric = Number(rawScore);
            if (!Number.isFinite(numeric)) return null;
            const detailKey = Object.keys(details).find((item) => canonicalSignalKey(item) === canonical);
            return {
                key,
                label: config.label ? t(config.label) : cleanText(key, 100),
                order: config.order,
                score: Math.max(0, Math.min(100, numeric)),
                detail: describeValue(detailKey ? details[detailKey] : null),
            };
        }).filter(Boolean).sort((a, b) => a.order - b.order).slice(0, 5);
    }

    function renderSignals(payload) {
        dom.signalList.replaceChildren();
        dom.signalsStatus.textContent = "";
        const signals = normalizeSignals(payload);
        if (!signals.length) {
            dom.signalsStatus.textContent = t("signalsUnavailable");
            dom.signalDisclosure.hidden = true;
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const signal of signals) {
            const group = document.createElement("div");
            const term = document.createElement("dt");
            const definition = document.createElement("dd");
            const heading = document.createElement("div");
            const name = document.createElement("span");
            const value = document.createElement("span");
            const progress = document.createElement("progress");
            const detail = document.createElement("span");

            group.className = "signal-item";
            heading.className = "signal-heading";
            name.className = "signal-name";
            value.className = "signal-value";
            detail.className = "signal-detail";
            name.textContent = signal.label;
            value.textContent = `${Math.round(signal.score)}%`;
            heading.append(name, value);
            term.append(heading);
            progress.max = 100;
            progress.value = signal.score;
            progress.setAttribute("aria-label", `${signal.label}: ${t("signalScore", { score: Math.round(signal.score) })}`);
            definition.append(progress);
            if (signal.detail) {
                detail.textContent = signal.detail;
                definition.append(detail);
            }
            group.append(term, definition);
            fragment.append(group);
        }
        dom.signalList.append(fragment);

        const methodology = describeValue(payload?.methodology) || t("methodologyUnavailable");
        const limitations = describeValue(payload?.limitations) || t("limitationsUnavailable");
        dom.signalsMethodology.textContent = methodology;
        dom.signalsLimitations.textContent = limitations;
        dom.signalDisclosure.hidden = false;
    }

    async function fetchSignals(article) {
        const pmid = article.pmid || extractPmid(article.link);
        dom.signalList.replaceChildren();
        dom.signalDisclosure.hidden = true;
        if (!pmid) {
            dom.signalsStatus.textContent = t("signalsUnavailable");
            return;
        }
        const { controller, sequence } = createOperation("signals");
        dom.signalsStatus.textContent = t("signalsLoading");
        try {
            const data = await requestJSON(`/signals/${encodeURIComponent(pmid)}`, {
                signal: controller.signal,
                timeoutMs: 25000,
            });
            if (sequence !== state.sequence.signals || state.article?.pmid !== article.pmid) return;
            state.signals = data;
            renderSignals(data);
        } catch (error) {
            if (error?.name === "AbortError") return;
            dom.signalsStatus.textContent = friendlyError(error, "signalsUnavailable");
            dom.signalDisclosure.hidden = true;
        } finally {
            finishOperation("signals", controller);
        }
    }

    async function askQuestion(event) {
        event.preventDefault();
        setFieldError(dom.questionInput, dom.questionError, "");
        if (!state.article?.abstractAvailable) {
            setFieldError(dom.questionInput, dom.questionError, t("questionUnavailable"));
            return;
        }
        const question = cleanText(dom.questionInput.value, 500);
        if (!question) {
            setFieldError(dom.questionInput, dom.questionError, t("questionRequired"));
            dom.questionInput.focus();
            return;
        }

        const { controller, sequence } = createOperation("ask");
        setBusy(dom.questionSubmit, true);
        dom.answerBox.hidden = false;
        dom.answerText.textContent = t("questionLoading");
        dom.answerMeta.textContent = "";
        try {
            const data = await requestJSON("/ask", {
                method: "POST",
                body: { question, context: state.article.abstract },
                signal: controller.signal,
                timeoutMs: 30000,
            });
            if (sequence !== state.sequence.ask) return;
            const found = data?.found === true;
            const answer = cleanText(data?.answer, 10000);
            dom.answerText.textContent = answer || t("answerNotFound");
            if (found) {
                const rawScore = Number(data?.score);
                const normalizedScore = Number.isFinite(rawScore) ? (rawScore <= 1 ? rawScore : rawScore / 100) : null;
                const scoreText = normalizedScore === null
                    ? "—"
                    : new Intl.NumberFormat(LOCALE_TAGS[state.locale], { style: "percent", maximumFractionDigits: 1 }).format(Math.max(0, Math.min(1, normalizedScore)));
                dom.answerMeta.textContent = t("answerFound", { score: scoreText });
            } else {
                dom.answerMeta.textContent = t("answerNotFound");
            }
        } catch (error) {
            if (error?.name === "AbortError") return;
            dom.answerText.textContent = friendlyError(error, "questionFailed");
            dom.answerMeta.textContent = "";
        } finally {
            finishOperation("ask", controller);
            if (sequence === state.sequence.ask) setBusy(dom.questionSubmit, false);
        }
    }

    function speak(text) {
        if (!("speechSynthesis" in window) || !text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = LOCALE_TAGS[state.locale];
        utterance.rate = 0.96;
        window.speechSynthesis.speak(utterance);
    }

    function renderLibrary() {
        renderHistory();
        renderSaves();
        dom.clearHistory.disabled = state.history.length === 0;
    }

    function renderHistory() {
        dom.historyList.replaceChildren();
        if (!state.history.length) {
            const empty = document.createElement("li");
            empty.className = "library-empty";
            empty.textContent = t("historyEmpty");
            dom.historyList.append(empty);
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const query of state.history) {
            const item = document.createElement("li");
            const button = document.createElement("button");
            item.className = "library-item";
            button.type = "button";
            button.className = "library-item-main";
            button.textContent = query;
            button.setAttribute("aria-label", t("openHistoryLabel", { query }));
            button.addEventListener("click", () => {
                dom.libraryDialog.close();
                dom.searchInput.value = query;
                performSearch(query);
            });
            item.append(button);
            fragment.append(item);
        }
        dom.historyList.append(fragment);
    }

    function renderSaves() {
        dom.savesList.replaceChildren();
        if (!state.saves.length) {
            const empty = document.createElement("li");
            empty.className = "library-empty";
            empty.textContent = t("savesEmpty");
            dom.savesList.append(empty);
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const article of state.saves) {
            const item = document.createElement("li");
            const open = document.createElement("button");
            const remove = document.createElement("button");
            const removeText = document.createElement("span");
            item.className = "library-item";
            open.type = "button";
            open.className = "library-item-main";
            open.textContent = article.title;
            open.setAttribute("aria-label", t("openSavedLabel", { title: article.title }));
            open.addEventListener("click", () => {
                dom.libraryDialog.close();
                analyzeArticle(article);
            });
            remove.type = "button";
            remove.className = "button button-quiet library-remove";
            remove.setAttribute("aria-label", t("removeSavedLabel", { title: article.title }));
            remove.append(makeIcon("icon-trash"));
            removeText.textContent = t("removeAction");
            removeText.className = "visually-hidden";
            remove.append(removeText);
            remove.addEventListener("click", () => {
                state.saves = state.saves.filter((itemToKeep) => itemToKeep.link !== article.link);
                persistSaves();
                renderLibrary();
                updateSaveButton();
                showToast(t("saveRemoved"));
            });
            item.append(open, remove);
            fragment.append(item);
        }
        dom.savesList.append(fragment);
    }

    function openDialog(dialog, trigger) {
        state.dialogTriggers.set(dialog, trigger);
        if (!dialog.open) dialog.showModal();
        const firstControl = dialog.querySelector("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)");
        window.requestAnimationFrame(() => firstControl?.focus());
    }

    function bindDialog(dialog) {
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener("close", () => {
            state.dialogTriggers.get(dialog)?.focus();
            state.dialogTriggers.delete(dialog);
        });
    }

    function updateChatWelcome() {
        const welcome = dom.chatLog.querySelector("[data-chat-welcome]");
        if (welcome) welcome.querySelector(".chat-message-text").textContent = t("chatWelcome");
    }

    function appendChatMessage(sender, text, options = {}) {
        const message = document.createElement("article");
        const label = document.createElement("span");
        const body = document.createElement("p");
        message.className = `chat-message ${sender === "user" ? "is-user" : "is-assistant"}`;
        if (options.welcome) message.dataset.chatWelcome = "true";
        label.className = "chat-message-label";
        body.className = "chat-message-text";
        label.textContent = sender === "user" ? t("chatUser") : t("chatAssistant");
        body.textContent = cleanText(text, 15000);
        message.append(label, body);

        if (sender !== "user" && !options.pending && "speechSynthesis" in window) {
            const actions = document.createElement("div");
            const readButton = document.createElement("button");
            actions.className = "chat-message-actions";
            readButton.type = "button";
            readButton.className = "button button-quiet";
            readButton.append(makeIcon("icon-volume"));
            const readLabel = document.createElement("span");
            readLabel.textContent = t("readMessage");
            readButton.append(readLabel);
            readButton.addEventListener("click", () => speak(body.textContent));
            actions.append(readButton);
            message.append(actions);
        }
        dom.chatLog.append(message);
        dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
        return message;
    }

    function initializeChat() {
        if (state.chatInitialized) return;
        state.chatInitialized = true;
        appendChatMessage("assistant", state.features.chat === false ? t("chatUnavailable") : t("chatWelcome"), { welcome: true });
    }

    async function sendChatMessage(event) {
        event.preventDefault();
        setFieldError(dom.chatInput, dom.chatError, "");
        if (state.features.chat === false) {
            setFieldError(dom.chatInput, dom.chatError, t("chatUnavailable"));
            return;
        }
        const message = cleanText(dom.chatInput.value, 1500);
        if (!message) {
            setFieldError(dom.chatInput, dom.chatError, t("chatRequired"));
            dom.chatInput.focus();
            return;
        }

        appendChatMessage("user", message);
        dom.chatInput.value = "";
        const pending = appendChatMessage("assistant", t("chatThinking"), { pending: true });
        const { controller, sequence } = createOperation("chat");
        setBusy(dom.chatSubmit, true);
        try {
            const data = await requestJSON("/chat", {
                method: "POST",
                body: { message, conversation_id: state.conversationId },
                signal: controller.signal,
                timeoutMs: 45000,
            });
            if (sequence !== state.sequence.chat) return;
            pending.remove();
            appendChatMessage("assistant", cleanText(data?.reply, 15000) || t("chatFailed"));
        } catch (error) {
            if (error?.name === "AbortError") {
                pending.remove();
                return;
            }
            if (error instanceof RequestError && error.status === 503) {
                state.features.chat = false;
                configureOptionalFeatures();
            }
            pending.querySelector(".chat-message-text").textContent = friendlyError(error, "chatFailed");
        } finally {
            finishOperation("chat", controller);
            if (sequence === state.sequence.chat) {
                setBusy(dom.chatSubmit, false);
                dom.chatSubmit.disabled = state.features.chat === false;
            }
        }
    }

    function featureFlag(features, name) {
        const value = features?.[name];
        if (typeof value === "boolean") return value;
        if (value && typeof value === "object" && typeof value.available === "boolean") return value.available;
        return null;
    }

    function configureOptionalFeatures() {
        const translationDisabled = state.features.translation === false;
        const chatDisabled = state.features.chat === false;
        if (state.article && state.locale !== "en") renderArticle();
        dom.chatInput.disabled = chatDisabled;
        dom.chatSubmit.disabled = chatDisabled;
        dom.chatOpen.title = chatDisabled ? t("chatUnavailable") : "";
        if (chatDisabled) {
            setFieldError(dom.chatInput, dom.chatError, t("chatUnavailable"));
            updateChatWelcome();
        }
        if (translationDisabled && state.article) dom.translationNote.textContent = t("translationUnavailable");
    }

    function updateHealthUI() {
        dom.serviceLine.classList.remove("is-ready", "is-offline");
        if (!state.health) {
            dom.serviceStatus.textContent = t("serviceUnknown");
            return;
        }
        const hasDisabledFeature = Object.values(state.features).some((value) => value === false);
        dom.serviceLine.classList.add("is-ready");
        dom.serviceStatus.textContent = hasDisabledFeature ? t("serviceDegraded") : t("serviceReady");
    }

    async function checkHealth() {
        try {
            const data = await requestJSON("/health", { timeoutMs: 8000 });
            state.health = data || { status: "ok" };
            const translationFlag = featureFlag(data?.features, "translation");
            const chatFlag = featureFlag(data?.features, "chat");
            if (translationFlag !== null) state.features.translation = translationFlag;
            if (chatFlag !== null) state.features.chat = chatFlag;
        } catch (_error) {
            state.health = null;
        }
        configureOptionalFeatures();
        updateHealthUI();
    }

    function bindEvents() {
        dom.languageSelect.addEventListener("change", (event) => applyLocale(event.target.value));
        dom.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
        dom.searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
            performSearch(dom.searchInput.value);
        });
        dom.searchInput.addEventListener("input", () => {
            if (dom.searchInput.hasAttribute("aria-invalid")) setFieldError(dom.searchInput, dom.searchError, "");
        });
        dom.sortSelect.addEventListener("change", renderResults);
        dom.backToResults.addEventListener("click", returnToResults);
        dom.saveArticle.addEventListener("click", toggleSave);
        dom.translateArticle.addEventListener("click", translateArticle);
        dom.readSummary.addEventListener("click", () => speak(displayedArticle()?.summary));
        dom.questionForm.addEventListener("submit", askQuestion);
        dom.questionInput.addEventListener("input", () => {
            if (dom.questionInput.hasAttribute("aria-invalid")) setFieldError(dom.questionInput, dom.questionError, "");
        });
        dom.libraryOpen.addEventListener("click", () => {
            renderLibrary();
            openDialog(dom.libraryDialog, dom.libraryOpen);
        });
        dom.clearHistory.addEventListener("click", () => {
            if (!state.history.length || !window.confirm(t("confirmClearHistory"))) return;
            state.history = [];
            persistHistory();
            renderLibrary();
            showToast(t("historyCleared"));
        });
        dom.chatOpen.addEventListener("click", () => {
            initializeChat();
            openDialog(dom.chatDialog, dom.chatOpen);
        });
        dom.chatForm.addEventListener("submit", sendChatMessage);
        dom.chatInput.addEventListener("input", () => {
            if (dom.chatInput.hasAttribute("aria-invalid")) setFieldError(dom.chatInput, dom.chatError, "");
        });
        dom.chatDialog.addEventListener("cancel", () => {
            window.speechSynthesis?.cancel();
        });
        dom.chatDialog.addEventListener("close", () => {
            abortOperations("chat");
            setBusy(dom.chatSubmit, false);
            dom.chatSubmit.disabled = state.features.chat === false;
            window.speechSynthesis?.cancel();
        });
        bindDialog(dom.libraryDialog);
        bindDialog(dom.chatDialog);
    }

    function initialize() {
        applyTheme(state.theme, false);
        applyLocale(state.locale, false);
        renderLibrary();
        bindEvents();
        configureOptionalFeatures();
        checkHealth();
    }

    initialize();
})();
