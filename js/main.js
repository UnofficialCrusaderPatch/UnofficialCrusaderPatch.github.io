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
        versions: { gui: null, ucp: null },
        store: {
            raw: null,
            items: [],
            allTags: new Set(),
            selectedTags: [],
            searchQuery: ''
        }
    };
    
    // Promise to hold the asynchronous loading of the store data
    let storeDataPromise = null;

    // --- DOM ELEMENTS ---
    const tabNav = document.getElementById('tab-nav');
    const tabContentArea = document.getElementById('tab-content-area');
    const langSelector = document.getElementById('languageSelector');
    const creditsModal = document.getElementById('creditsModal');
    const creditsBtn = document.getElementById('creditsBtn');
    const closeCreditsBtn = document.getElementById('closeCreditsBtn');
    const creditsContent = document.getElementById('creditsContent');
    const downloadBtn = document.getElementById("downloadBtn");

    /**
     * Fetches the installer URL from the latest GitHub release.
     */
    async function fetchInstallerUrl() {
        try {
            const data = await fetchWithCache(
                "guiLatest",
                "https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/latest"
            );
            const asset = data?.assets?.find(a => /setup\.exe$/i.test(a.name));
            return asset ? asset.browser_download_url : data?.html_url;
        } catch (error) {
            console.error("Could not fetch installer link:", error);
            return "https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases"; // Fallback link
        }
    }

    /**
     * Translates a key using the loaded language file.
     * @param {string} key - The key from the translation file.
     * @returns {string} - The translated string.
     */
    const T = (key) => appState.translations[key] || `[${key}]`;

    /**
     * Fetches a local JSON file (e.g., for translations, FAQ).
     * @param {string} url - The URL of the JSON file.
     * @returns {Promise<object|null>}
     */
    async function fetchLocalJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
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
     * Pre-loads the heavy store data in the background.
     */
    function preloadStoreData() {
        if (!appState.versions.ucp) {
            console.error("UCP version not available, cannot preload store.");
            return;
        }
        
        // This promise will be awaited only when the user clicks the 'store' tab.
        storeDataPromise = (async () => {
            try {
                const storeObj = await fetchStoreYaml(appState.versions.ucp);
                appState.store.raw = storeObj;
                appState.store.items = storeObj.extensions.list;

                // Collect all tags from the main recipe file
                for (const ext of storeObj.extensions.list) {
                    (ext.definition.tags || []).forEach(t => appState.store.allTags.add(t));
                }
                
                // Asynchronously fetch missing tags from individual definition.yml files
                const definitionPromises = storeObj.extensions.list.map(ext => {
                    if (!Array.isArray(ext.definition.tags)) {
                        return fetchDefinitionYaml(ext).then(def => {
                            ext.definition.tags = def.tags || [];
                            (def.tags || []).forEach(t => appState.store.allTags.add(t));
                        }).catch(() => { /* Ignore failures, just means no extra tags */ });
                    }
                    return Promise.resolve();
                });
                
                // We don't need to wait for all definitions to load before the store is usable.
                // This can happen in the background.
                Promise.all(definitionPromises).then(() => {
                    console.log("All store definitions loaded and tags updated.");
                });

            } catch (e) {
                console.error("Failed to preload store data:", e);
                appState.store.raw = 'error'; // Mark as failed
                throw e; // Propagate error to the handler in switchTab
            }
        })();
    }

    /**
     * Handles switching between tabs asynchronously.
     * @param {string} tabId - The ID of the tab to switch to.
     */
    async function switchTab(tabId) {
        tabNav.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        renderLoading(tabContentArea, T);

        // Helper to check if the user is still on the same tab before rendering
        const isTabStillActive = () => tabNav.querySelector('.active')?.dataset.tab === tabId;

        switch (tabId) {
            case 'overview':
                tabContentArea.innerHTML = renderOverview(T);
                break;

            case "news":
                fetchNewsMarkdown().then(markdown => {
                    if (!isTabStillActive()) return;
                    const newsItems = markdown ? [{ name: PATHS.NEWS, content: markdown }] : null;
                    tabContentArea.innerHTML = renderNews(newsItems, T);
                }).catch(err => {
                    console.error("Failed to load news:", err);
                    if (isTabStillActive()) tabContentArea.innerHTML = createParchmentBox(`<p>${T('news_error')}</p>`);
                });
                break;

            case "store":
                try {
                    // Wait for the preloading to finish if it hasn't already.
                    // If it's done, this resolves instantly.
                    if (appState.store.raw !== 'error') {
                       await storeDataPromise;
                    }
                    if (appState.store.raw === 'error' || !appState.store.raw) {
                       throw new Error("Store data is not available.");
                    }
                    
                    // If we are here, data is loaded. Render the UI.
                    renderStoreTab();

                } catch (e) {
                    console.error("Store failed to load:", e);
                    if (isTabStillActive()) {
                        tabContentArea.innerHTML = createParchmentBox(
                            `<p style="color:red">Could not load content store.</p><p>Please try again later or check the browser console for errors.</p>`
                        );
                    }
                }
                break;
            
            case 'ai-format':
            case 'faq':
                const dataType = tabId === 'faq' ? 'faq' : 'ai';
                const cacheKey = tabId === 'faq' ? 'faqData' : 'aiData';
                const renderFunc = tabId === 'faq' ? renderFaq : renderAiFormat;

                let data = appState[cacheKey][appState.currentLang];
                if (!data) {
                    data = await fetchLocalJson(`lang/${dataType}-${appState.currentLang}.json`);
                    if (!data) { // Fallback to English
                        data = await fetchLocalJson(`lang/${dataType}-en.json`);
                    }
                    appState[cacheKey][appState.currentLang] = data; // Cache it
                }
                if (isTabStillActive()) {
                    tabContentArea.innerHTML = renderFunc(data, T);
                }
                break;

            default:
                tabContentArea.innerHTML = renderOverview(T);
        }
    }

    /**
     * Renders the store tab content and wires up its events.
     * This is separated because it's complex and only called when the store data is ready.
     */
    function renderStoreTab() {
        const query = appState.store.searchQuery.toLowerCase();
        const selectedTags = appState.store.selectedTags;
        
        const filteredItems = appState.store.items.filter(ext => {
            const nameMatch = (ext.definition["display-name"] || ext.definition.name || '').toLowerCase().includes(query);
            const tagsOK = selectedTags.length === 0 || (ext.definition.tags || []).some(t => selectedTags.includes(t));
            return nameMatch && tagsOK;
        });

        const sortedTags = Array.from(appState.store.allTags).sort();
        const tagDropdown = sortedTags.map(tag =>
            `<label><input type="checkbox" class="ucp-tag-cb" value="${tag}" ${selectedTags.includes(tag) ? "checked" : ""}> ${tag}</label>`
        ).join("<br>");

        const tagButton = `<div style="position: relative; display: inline-block;">
            <button id="tag-btn" class="ucp-button-small" style="margin-left:8px">Tags ▼</button>
            <div id="tag-menu" class="ucp-tag-menu hidden">${tagDropdown}</div>
        </div>`;

        const rows = filteredItems.map((ext, i) =>
            `<div class="ucp-store-row" data-idx="${i}">${ext.definition["display-name"]}</div>`
        ).join("");

        const listPane = `
            <div class="ucp-store-list">
                <div style="display:flex; align-items:center; gap:6px">
                    <input type="search" id="store-search" placeholder="Search…" value="${appState.store.searchQuery}" class="ucp-store-search">
                    ${tagButton}
                </div>
                <div class="ucp-store-list-items" style="margin-top: 8px;">${rows}</div>
            </div>`;

        const rightPane = `<div id="store-desc" class="ucp-store-desc"><p>Select an item…</p></div>`;
        tabContentArea.innerHTML = createParchmentBox(`<div class="ucp-store-split">${listPane}${rightPane}</div>`);

        // --- WIRE EVENTS ---
        document.getElementById("store-search").addEventListener("input", e => {
            appState.store.searchQuery = e.target.value;
            renderStoreTab(); // Re-render
        });
        
        document.querySelectorAll(".ucp-store-row").forEach(row => {
            row.addEventListener("click", async () => {
                document.querySelectorAll(".ucp-store-row").forEach(r => r.classList.remove("sel"));
                row.classList.add("sel");
                const ext = filteredItems[Number(row.dataset.idx)];
                const descContainer = document.getElementById("store-desc");
                descContainer.innerHTML = `<p>${T('loading')}</p>`;

                const urls = buildDescriptionUrl(ext, appState.currentLang);
                let md = "";
                for (const u of urls) {
                    md = await fetchRawText(u).catch(() => null);
                    if (md) break;
                }
                if (!md) md = "_No description available._";
                
                descContainer.innerHTML = `<h2 class="ucp-header-font">${ext.definition["display-name"]}</h2><div class="prose">${marked.parse(md)}</div>`;
            });
        });

        document.getElementById("tag-btn").onclick = () => document.getElementById("tag-menu").classList.toggle("hidden");
        
        document.querySelectorAll(".ucp-tag-cb").forEach(cb => {
            cb.onchange = e => {
                const val = e.target.value;
                if (e.target.checked) {
                    appState.store.selectedTags.push(val);
                } else {
                    appState.store.selectedTags = appState.store.selectedTags.filter(t => t !== val);
                }
                renderStoreTab(); // Re-render
            };
        });
    }

    /**
     * Loads a new language, fetches translations, and re-renders the current tab.
     * @param {string} lang - The language code (e.g., 'en', 'de').
     */
    async function loadLanguage(lang) {
        let data = await fetchLocalJson(`lang/${lang}.json`);
        if (!data) { // Fallback to English
            console.warn(`Translation for '${lang}' not found. Falling back to 'en'.`);
            lang = 'en';
            data = await fetchLocalJson(`lang/en.json`);
        }
        appState.translations = data;
        appState.currentLang = lang;
        document.documentElement.lang = lang;
        langSelector.value = lang;
        
        // Re-translate all static text on the page
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (T(key) !== `[${key}]`) {
                el.textContent = T(key);
            }
        });

        const activeTab = tabNav.querySelector('.active')?.dataset.tab || 'overview';
        switchTab(activeTab);
    }

    /**
     * Initializes the application.
     */
    async function init() {
        // Fetch languages and populate dropdown
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

        // Fetch versions and start preloading store data in the background
        Promise.all([fetchGuiVersion(), fetchUcpVersion()]).then(([guiVer, ucpVer]) => {
            appState.versions = { gui: guiVer, ucp: ucpVer };
            document.getElementById("footer-version-info").textContent = `GUI ${guiVer || "-"} | UCP ${ucpVer || "-"}`;
            preloadStoreData(); // Kick off the heavy lifting
        }).catch(err => {
            console.error("Failed to fetch versions:", err);
            document.getElementById("footer-version-info").textContent = "Version info unavailable";
        });

        // --- EVENT LISTENERS (attached immediately) ---
        tabNav.addEventListener('click', (e) => {
            if (e.target.matches('button[data-tab]')) switchTab(e.target.dataset.tab);
        });

        langSelector.addEventListener('change', (e) => loadLanguage(e.target.value));

        creditsBtn.addEventListener('click', async () => {
            creditsModal.classList.remove('hidden');
            creditsContent.innerHTML = T('loading');
            const markdown = await fetchCredits();
            creditsContent.innerHTML = markdown ? marked.parse(markdown) : 'Could not load credits.';
        });

        closeCreditsBtn.addEventListener('click', () => creditsModal.classList.add('hidden'));
        creditsModal.addEventListener('click', (e) => {
            if (e.target === creditsModal) creditsModal.classList.add('hidden');
        });

        downloadBtn.addEventListener("click", async () => {
            downloadBtn.disabled = true;
            const url = await fetchInstallerUrl();
            downloadBtn.disabled = false;
            if (url) window.open(url, "_blank");
        });

        // Event delegation for video facades
        document.addEventListener('click', (e) => {
            const facade = e.target.closest('.video-facade');
            if (facade) {
                const videoId = facade.dataset.videoId;
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', '');
                iframe.className = 'w-full h-full absolute top-0 left-0';
                facade.replaceWith(iframe);
            }
            
            // Close tag menu if clicking outside
            const tagMenu = document.getElementById("tag-menu");
            const tagBtn = document.getElementById("tag-btn");
            if (tagMenu && !tagMenu.classList.contains('hidden')) {
                if (!tagMenu.contains(e.target) && e.target !== tagBtn) {
                    tagMenu.classList.add("hidden");
                }
            }
        });

        // Initial load
        await loadLanguage(appState.currentLang);
    }

    init();
});
