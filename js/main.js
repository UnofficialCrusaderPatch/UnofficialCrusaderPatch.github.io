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
            items: [],
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
                const markdown = await fetchNewsMarkdown();
                tabContentArea.innerHTML = renderNews(
                    markdown ? [{ name: PATHS.NEWS, content: markdown }] : null,
                    T
                );
                break;
            case "store": {
                /* -------------------------------------------------- LOAD ONCE */
                if (!appState.store.raw) {
                    try {
                        const storeObj = await fetchStoreYaml(appState.versions.ucp);  // api.js helper
                        appState.store.raw = storeObj;
                        appState.store.items = storeObj.extensions.list;
                        // collect tags (deduplicate + sort)
                        const tagSet = new Set();
                        storeObj.extensions.list.forEach(ext => {
                            (ext.definition.tags || []).forEach(t => tagSet.add(t));
                        });
                        appState.store.allTags = Array.from(tagSet).sort();
                        if (!Array.isArray(appState.store.selectedTags) ||
                            appState.store.selectedTags.length === 0)
                            appState.store.selectedTags = [];   // none selected ⇒ show all
                    } catch (e) {
                        console.error("Store fetch failed", e);
                        tabContentArea.innerHTML = createParchmentBox(
                            `<p style="color:red">Could not load content store.</p>`
                        );
                        break;
                    }
                }                

                /* ---------------------------------------------- build tag dropdown */
                const tagDropdown = appState.store.allTags
                    .map(
                        tag =>
                            `<label><input type="checkbox" class="ucp-tag-cb"
                                    value="${tag}" ${appState.store.selectedTags.includes(tag) ? "checked":""}>
                            ${tag}</label>`
                    )
                    .join("<br>");

                const tagButton = `<button id="tag-btn" class="ucp-button-small"
                                    style="margin-left:8px">Tags ▼</button>
                                <div id="tag-menu" class="ucp-tag-menu hidden">${tagDropdown}</div>`;

                /* -------------------------------------------------- SEARCH + FILTER */
                const query = appState.store.searchQuery.toLowerCase();

                const filtered = appState.store.items.filter(ext => {
                    const nameMatch = ext.definition["display-name"]
                        .toLowerCase()
                        .includes(query);

                    const tagsOK =
                        appState.store.selectedTags.length === 0 ||
                        (ext.definition.tags || []).some(t =>
                            appState.store.selectedTags.includes(t)
                        );

                    return nameMatch && tagsOK;
                });

                /* -------------------------------------------------- BUILD HTML */
                const rows = filtered
                    .map(
                        (ext, i) =>
                            `<div class="ucp-store-row" data-idx="${i}">
                                ${ext.definition["display-name"]}
                            </div>`
                    )
                    .join("");

                const listPane = `
                    <div style="display:flex; align-items:center; gap:6px">
                        <input type="search" id="store-search"
                            placeholder="Search…" value="${appState.store.searchQuery}"
                            class="ucp-store-search">
                        ${tagButton}
                    </div>
                    <div class="ucp-store-list">${rows}</div>`;

                const rightPane = `<div id="store-desc" class="ucp-store-desc">
                                    <p>Select an item…</p>
                                </div>`;

                tabContentArea.innerHTML = createParchmentBox(
                    `<div class="ucp-store-split">${listPane}${rightPane}</div>`
                );

                /* -------------------------------------------------- WIRE EVENTS */
                document
                    .getElementById("store-search")
                    .addEventListener("input", e => {
                        appState.store.searchQuery = e.target.value;
                        switchTab("store");         // re‑render
                    });

                document.querySelectorAll(".ucp-store-row").forEach(row => {
                    row.addEventListener("click", async () => {
                        document
                            .querySelectorAll(".ucp-store-row")
                            .forEach(r => r.classList.remove("sel"));
                        row.classList.add("sel");

                        const ext = filtered[Number(row.dataset.idx)];
                        const descObj = pickDescription(
                            ext.contents.description,
                            appState.currentLang
                        );

                        let md = "";
                        if (descObj.method === "inline") md = descObj.content;
                        else if (descObj.method === "online")
                            md = await fetchRawText(descObj.url);

                        document.getElementById("store-desc").innerHTML =
                            `<h2 class="ucp-header-font">${ext.definition["display-name"]}</h2>` +
                            `<div class="prose">${marked.parse(md)}</div>`;
                    });
                });

                document.getElementById("tag-btn").onclick = () =>
                    document.getElementById("tag-menu").classList.toggle("hidden");

                document.querySelectorAll(".ucp-tag-cb").forEach(cb => {
                    cb.onchange = e => {
                        const val = e.target.value;
                        if (e.target.checked)
                            appState.store.selectedTags.push(val);
                        else
                            appState.store.selectedTags =
                                appState.store.selectedTags.filter(t => t !== val);
                        switchTab("store");      // rerender
                    };
                });
                break;
            }
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

        // Initial load
        await loadLanguage(appState.currentLang);
        switchTab('overview');
    }

    init();
});
