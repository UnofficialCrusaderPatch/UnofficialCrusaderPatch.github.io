// This is the main entry point for the website's JavaScript.
// It orchestrates the UI, API calls, and event handling.

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const appState = {
        currentLang: 'en',
        availableLangs: {},
        translations: {},
        faqData: {},
        aiData: {},
        store: {
            items: [], // The raw list of directories from GitHub
            definitions: {}, // A cache for fetched definitions: { 'itemName': definitionObject }
            allTags: [],
            selectedTags: [],
            searchQuery: ''
        }
    };

    // --- DOM ELEMENTS ---
    const tabNav = document.getElementById('tab-nav');
    const tabContentArea = document.getElementById('tab-content-area');
    const langSelector = document.getElementById('languageSelector');
    const creditsModal = document.getElementById('creditsModal');
    const creditsBtn = document.getElementById('creditsBtn');
    const closeCreditsBtn = document.getElementById('closeCreditsBtn');
    const creditsContent = document.getElementById('creditsContent');
    const downloadBtn = document.getElementById("downloadBtn");


    async function fetchInstallerUrl() {
        const data = await fetchWithCache(
            "guiLatest",
            "https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/latest"
        );
        const asset = data?.assets?.find(a => /setup\.exe$/i.test(a.name));
        return asset ? asset.browser_download_url : data?.html_url;
    }

    downloadBtn.addEventListener("click", async () => {
        downloadBtn.disabled = true;
        const url = await fetchInstallerUrl();
        downloadBtn.disabled = false;
        if (url) window.open(url, "_blank");
        else alert("Could not fetch installer link");
    });


    /**
     * Translates a key using the loaded language file.
     * @param {string} key - The key from the translation file.
     * @returns {string} - The translated string.
     */
    const T = (key) => appState.translations[key] || `[${key}]`;

    /**
     * Fetches a JSON file from the lang folder.
     * @param {string} url - The URL of the JSON file.
     * @returns {Promise<object|null>}
     */
    async function fetchLocalJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Return null specifically for 404 to trigger fallback
                if (response.status === 404) return null;
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error(`Failed to fetch local JSON from ${url}:`, e);
            return null;
        }
    }

    /**
     * A simple YAML parser to extract a list of tags.
     * @param {string} yamlContent - The string content of the definition.yml file.
     * @returns {Array<string>} - An array of tags.
     */
    function parseTagsFromYaml(yamlContent) {
        try {
            const doc = YAML.parse(yamlContent);
            const tags = doc?.tags;
            if (Array.isArray(tags)) return tags.map(t => String(t));
        } catch (e) {
            console.warn("YAML parse failed", e);
        }
        return [];
    }
    
    /**
     * Renders the store tab, applying current filters.
     */
    function renderFilteredStore() {
        const { items, definitions, allTags, selectedTags, searchQuery } = appState.store;
        const query = searchQuery.toLowerCase();

        const filteredItems = items.filter(item => {
            const definition = definitions[item.name] || {};
            const nameMatch = item.name.toLowerCase().includes(query);
            const itemTags = definition.tags || [];
            const tagMatch = selectedTags.length === 0 || selectedTags.every(t => itemTags.includes(t));
            return nameMatch && tagMatch;
        });

        const itemsWithDefs = filteredItems.map(item => ({...item, definition: definitions[item.name] }));
        tabContentArea.innerHTML = renderStore(itemsWithDefs, T, allTags, selectedTags, searchQuery);
        
        // Re-attach event listeners for the new filter UI
        document.getElementById('store-search')?.addEventListener('input', (e) => {
            appState.store.searchQuery = e.target.value;
            renderFilteredStore();
        });
        
        const tagBtn = document.getElementById('tag-filter-btn');
        const tagDropdown = document.getElementById('tag-filter-dropdown');
        tagBtn?.addEventListener('click', () => tagDropdown.classList.toggle('hidden'));
        
        document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tag = e.target.value;
                if (e.target.checked) {
                    appState.store.selectedTags.push(tag);
                } else {
                    appState.store.selectedTags = appState.store.selectedTags.filter(t => t !== tag);
                }
                renderFilteredStore();
            });
        });
    }

    /**
     * Handles switching between tabs.
     * @param {string} tabId - The ID of the tab to switch to.
     */
    async function switchTab(tabId) {
        tabNav.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        renderLoading(tabContentArea, T);

        switch (tabId) {
            case 'overview':
                tabContentArea.innerHTML = renderOverview(T);
                break;
            case "news":
                const markdown = await fetchRawText(
                    GITHUB_RAW_BASE + REPOS.NEWS + "/" + PATHS.NEWS
                );
                tabContentArea.innerHTML = renderNews(
                    markdown ? [{ name: PATHS.NEWS, content: markdown }] : null,
                    T
                );
                break;
            case 'store':
                const branch = appState.versions.ucp;
                if (appState.store.items.length === 0) {
                    const storeDirs = await fetchStoreItems(branch);
                    if (storeDirs && Array.isArray(storeDirs)) {
                        appState.store.items = storeDirs.filter(item => item.type === 'dir');
                        
                        const definitionsPromises = appState.store.items.map(async (item) => {
                            const dirContents = await fetchDirectoryContents(item.path, branch);
                            const defFile =
                                dirContents?.find(f => f.name === "definition.yml") ||
                                dirContents?.find(f => f.name === "definition.yaml");
                            if (defFile) {
                                const yamlContent = await fetchFileContentByUrl(defFile.download_url);
                                appState.store.definitions[item.name] = { tags: parseTagsFromYaml(yamlContent) };
                            }
                        });
                        await Promise.all(definitionsPromises);
                        
                        const allTags = new Set();
                        Object.values(appState.store.definitions).forEach(def => {
                            def?.tags?.forEach(tag => allTags.add(tag));
                        });
                        appState.store.allTags = Array.from(allTags).sort();
                        appState.store.selectedTags = [];
                    }
                }
                renderFilteredStore();
                break;
            case 'ai-format':
                let aiData = appState.aiData[appState.currentLang] || await fetchLocalJson(`lang/aic-${appState.currentLang}.json`);
                if (!aiData) { // Fallback to English
                    aiData = appState.aiData['en'] || await fetchLocalJson(`lang/aic-en.json`);
                }
                appState.aiData[appState.currentLang] = aiData; // Cache it
                tabContentArea.innerHTML = renderAiFormat(aiData, T);
                break;
            case 'faq':
                let faqData = appState.faqData[appState.currentLang] || await fetchLocalJson(`lang/faq-${appState.currentLang}.json`);
                if (!faqData) { // Fallback to English
                    faqData = appState.faqData['en'] || await fetchLocalJson(`lang/faq-en.json`);
                }
                appState.faqData[appState.currentLang] = faqData; // Cache it
                tabContentArea.innerHTML = renderFaq(faqData, T);
                break;
            default:
                tabContentArea.innerHTML = renderOverview(T);
        }
    }

    /**
     * Loads a new language, fetches translations, and re-renders the current tab.
     * @param {string} lang - The language code (e.g., 'en', 'de').
     */
    async function loadLanguage(lang) {
        let data = await fetchLocalJson(`lang/${lang}.json`);
        if (!data) { // If language file not found, fall back to English
            console.warn(`Translation for '${lang}' not found. Falling back to 'en'.`);
            data = await fetchLocalJson(`lang/en.json`);
            lang = 'en'; // Set current language to English for consistency
        }
        
        appState.translations = data;
        appState.currentLang = lang;
        document.documentElement.lang = lang;
        langSelector.value = lang; // Ensure dropdown reflects the actual loaded language
        
        const activeTab = tabNav.querySelector('.active').dataset.tab;
        switchTab(activeTab);
    }

    /**
     * Toggles the visibility of the credits modal.
     */
    async function toggleCreditsModal() {
        const isHidden = creditsModal.classList.contains('hidden');
        if (isHidden) {
            creditsContent.innerHTML = T('loading');
            const markdown = await fetchCredits();
            creditsContent.innerHTML = markdown ? marked.parse(markdown) : 'Could not load credits.';
        }
        creditsModal.classList.toggle('hidden');
    }

    /**
     * Initializes the application.
     */
    async function init() {
        // Fetch the list of available languages
        const languages = await fetchLocalJson('languages.json');
        if (languages) {
            appState.availableLangs = languages;
            Object.entries(languages).forEach(([code, name]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                langSelector.appendChild(option);
            });
        }

        // Fetch versioms and footer
        const [guiVer, ucpVer] = await Promise.all([
            fetchGuiVersion(),
            fetchUcpVersion()
        ]);
        appState.versions = { gui: guiVer, ucp: ucpVer };
        document.getElementById("footer-version-info").textContent =
            "GUI " + (guiVer || "-") + " | UCP " + (ucpVer || "-");

        // Add event listeners
        tabNav.addEventListener('click', (e) => {
            if (e.target.matches('button[data-tab]')) switchTab(e.target.dataset.tab);
        });
        langSelector.addEventListener('change', (e) => loadLanguage(e.target.value));
        creditsBtn.addEventListener('click', toggleCreditsModal);
        closeCreditsBtn.addEventListener('click', toggleCreditsModal);
        creditsModal.addEventListener('click', (e) => {
            if (e.target === creditsModal) toggleCreditsModal();
        });
        
        // Hide tag dropdown if clicked outside
        document.addEventListener('click', (e) => {
            const tagDropdown = document.getElementById('tag-filter-dropdown');
            const tagBtn = document.getElementById('tag-filter-btn');
            if (tagDropdown && !tagDropdown.contains(e.target) && !tagBtn?.contains(e.target)) {
                tagDropdown.classList.add('hidden');
            }
        });

        // Initial load
        await loadLanguage(appState.currentLang);
        switchTab('overview');
    }

    init();
});
