// This is the main entry point for the website's JavaScript.
// It orchestrates the UI, API calls, and event handling.

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const appState = {
        currentLang: 'en',
        availableLangs: {},
        translations: {},
        faqData: {},
        wiki: {
            sidebarMd: null,
            mainMd: null,
            currentPage: 'Home'
        },
        versions: { gui: null, ucp: null },
        store: {
            raw: null,
            items: [],
            allTags: new Set(),
            selectedTags: [],
            searchQuery: ''
        }
    };
    
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

    const T = (key) => appState.translations[key] || `[${key}]`;

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
    
    function createVideoFacades(container) {
        const iframes = container.querySelectorAll('iframe[src*="youtube.com"]');
        iframes.forEach(iframe => {
            const videoIdMatch = iframe.src.match(/embed\/([^?]+)/);
            if (!videoIdMatch) return;
            const videoId = videoIdMatch[1];
            
            const facade = document.createElement('div');
            facade.className = 'video-facade';
            facade.dataset.videoId = videoId;
            
            const img = document.createElement('img');
            img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            img.alt = 'Video thumbnail';
            img.loading = 'lazy';
            img.onerror = () => { img.src = `https://i.ytimg.com/vi/${videoId}/default.jpg`; };
            
            const playIcon = document.createElement('div');
            playIcon.className = 'play-icon';
            
            facade.appendChild(img);
            facade.appendChild(playIcon);
            
            iframe.replaceWith(facade);
        });
    }

    function preloadStoreData() {
        if (!appState.versions.ucp) {
            console.warn("UCP version not available, cannot preload store yet.");
            return;
        }
        
        storeDataPromise = (async () => {
            try {
                const storeObj = await fetchStoreYaml(appState.versions.ucp);
                appState.store.raw = storeObj;
                appState.store.items = storeObj.extensions.list;
                storeObj.extensions.list.forEach(ext => {
                    (ext.definition.tags || []).forEach(t => appState.store.allTags.add(t));
                });
            } catch (e) {
                console.error("Failed to preload store data:", e);
                appState.store.raw = 'error';
                throw e;
            }
        })();
    }

    async function switchTab(tabId) {
        tabNav.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        renderLoading(tabContentArea, T);
        const isTabStillActive = () => tabNav.querySelector('.active')?.dataset.tab === tabId;

        try {
            switch (tabId) {
                case 'overview':
                    tabContentArea.innerHTML = renderOverview(T);
                    break;
                case "news":
                    const markdown = await fetchNewsMarkdown();
                    if (isTabStillActive()) {
                        const newsItems = markdown ? [{ name: PATHS.NEWS, content: markdown }] : null;
                        tabContentArea.innerHTML = renderNews(newsItems, T);
                    }
                    break;
                case "store":
                    await storeDataPromise;
                    if (isTabStillActive()) renderStoreTab();
                    break;
                case 'wiki':
                    await renderWikiTab();
                    break;
                case 'faq':
                    let data = appState.faqData[appState.currentLang];
                    if (!data) {
                        data = await fetchLocalJson(`lang/faq-${appState.currentLang}.json`) || 
                               await fetchLocalJson(`lang/faq-en.json`);
                        appState.faqData[appState.currentLang] = data;
                    }

                    if (isTabStillActive()) {
                        tabContentArea.innerHTML = renderFaq(data, T);
                        createVideoFacades(tabContentArea);
                    }
                    break;
                default:
                    tabContentArea.innerHTML = renderOverview(T);
            }
        } catch (error) {
            console.error(`Failed to load tab "${tabId}":`, error);
            if (isTabStillActive()) {
                tabContentArea.innerHTML = createParchmentBox(
                    `<p style="color:red">Could not load content for this tab.</p>
                     <p>Please try again later or check the browser console for errors.</p>`
                );
            }
        }
    }

    function renderStoreTab() {
        const { searchQuery, selectedTags, items, allTags } = appState.store;
        const query = searchQuery.toLowerCase();
        
        const filteredItems = items.filter(ext => {
            const nameMatch = (ext.definition["display-name"] || ext.definition.name || '').toLowerCase().includes(query);
            const tagsOK = selectedTags.length === 0 || (ext.definition.tags || []).some(t => selectedTags.includes(t));
            return nameMatch && tagsOK;
        });

        const sortedTags = Array.from(allTags).sort();
        const tagDropdown = sortedTags.map(tag =>
            `<label><input type="checkbox" class="ucp-tag-cb" value="${tag}" ${selectedTags.includes(tag) ? "checked" : ""}> ${tag}</label>`
        ).join("<br>");

        const controlsHTML = `
            <div class="store-controls">
                <input type="search" id="store-search" placeholder="Search…" value="${searchQuery}" class="ucp-search-input">
                <div style="position: relative; display: inline-block;">
                    <button id="tag-btn" class="ucp-button-small">Tags ▼</button>
                    <div id="tag-menu" class="ucp-tag-menu hidden">${tagDropdown}</div>
                </div>
            </div>
        `;

        const rows = filteredItems.map(ext =>
            `<div class="ucp-store-row" data-id="${ext.definition.name}">${ext.definition["display-name"] || ext.definition.name}</div>`
        ).join("");

        const storeLayoutHTML = `
            <div class="store-container">
                <div class="store-headers-and-controls">
                    <h2 class="ucp-header-font">Online Content</h2>
                    ${controlsHTML}
                    <h2 class="ucp-header-font">Description</h2>
                </div>
                <div class="store-content-split">
                    <div class="parchment-box ucp-store-list-container">
                        <div class="ucp-store-list-items">${rows}</div>
                    </div>
                    <div class="parchment-box ucp-store-desc-container">
                        <div id="store-desc" class="ucp-store-desc">
                            <p>Select an item from the list on the left.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        tabContentArea.innerHTML = storeLayoutHTML;

        // --- RE-WIRE EVENTS ---
        document.getElementById("store-search").addEventListener("input", e => {
            appState.store.searchQuery = e.target.value;
            renderStoreTab();
        });
        
        document.querySelectorAll(".ucp-store-row").forEach(row => {
            row.addEventListener("click", async (e) => {
                document.querySelectorAll(".ucp-store-row").forEach(r => r.classList.remove("sel"));
                row.classList.add("sel");
                const ext = items.find(item => item.definition.name === row.dataset.id);
                const descContainer = document.getElementById("store-desc");
                descContainer.innerHTML = `<p>${T('loading')}</p>`;

                try {
                    if (!ext.definition.tags_fetched) {
                        const def = await fetchDefinitionYaml(ext);
                        Object.assign(ext.definition, def);
                        (def.tags || []).forEach(t => appState.store.allTags.add(t));
                        ext.definition.tags_fetched = true;
                    }
                    
                    const urls = buildDescriptionUrl(ext, appState.currentLang);
                    let md = "";
                    for (const u of urls) {
                        md = await fetchRawText(u).catch(() => null);
                        if (md) break;
                    }
                    if (!md) md = "_No description available._";
                    
                    const descriptionHeader = `
                        <div class="description-header">
                            <h2 class="ucp-header-font">${ext.definition["display-name"] || ext.definition.name}</h2>
                            <div class="meta-info">
                                <span>Author: ${ext.definition.author || 'Unknown'}</span>
                                <span>Version: ${ext.definition.version || 'N/A'}</span>
                            </div>
                        </div>
                    `;

                    descContainer.innerHTML = `${descriptionHeader}<div class="prose">${marked.parse(md)}</div>`;
                } catch (err) {
                    descContainer.innerHTML = `<p style="color:red">Could not load details for this item.</p>`;
                }
            });
        });

        document.getElementById("tag-btn").onclick = () => document.getElementById("tag-menu").classList.toggle("hidden");
        
        document.querySelectorAll(".ucp-tag-cb").forEach(cb => {
            cb.onchange = e => {
                const val = e.target.value;
                if (e.target.checked) appState.store.selectedTags.push(val);
                else appState.store.selectedTags = selectedTags.filter(t => t !== val);
                renderStoreTab();
            };
        });
        }

        async function renderWikiTab() {
        // Load sidebar and initial page content only once.
        if (!appState.wiki.sidebarMd) {
            try {
                const [sidebarMd, mainMd] = await Promise.all([
                    fetchWikiPageMarkdown('_Sidebar'),
                    fetchWikiPageMarkdown('Home')
                ]);
                appState.wiki.sidebarMd = sidebarMd;
                appState.wiki.mainMd = mainMd;
            } catch (e) {
                console.error("Wiki fetch failed", e);
                tabContentArea.innerHTML = createParchmentBox(
                    `<p style="color:red">Could not load the wiki.</p>`
                );
                return; // Use return instead of break
            }
        }

        // Render the initial wiki structure.
        tabContentArea.innerHTML = renderWiki(appState.wiki.sidebarMd, appState.wiki.mainMd, T);

        // Add a single event listener to the container to handle all wiki link clicks.
        tabContentArea.addEventListener('click', async (e) => {
            const link = e.target.closest('a');
            
            // Check if it's an internal wiki link (relative path)
            if (link && link.href && link.hostname === location.hostname) {
                // Ensure this listener only acts if we are on the wiki tab
                const activeTab = tabNav.querySelector('.active')?.dataset.tab;
                if (activeTab !== 'wiki') return;
                
                e.preventDefault(); // Stop the browser from navigating away
                
                const pageName = link.getAttribute('href').split('/').pop();
                if (!pageName || pageName === appState.wiki.currentPage) return; // Don't reload same page
                
                const mainPane = document.getElementById('wiki-main-content');
                mainPane.innerHTML = `<p>${T('loading')}</p>`;
                
                try {
                    const newMd = await fetchWikiPageMarkdown(pageName);
                    appState.wiki.mainMd = newMd;
                    appState.wiki.currentPage = pageName;
                    mainPane.innerHTML = marked.parse(newMd);
                } catch (err) {
                    mainPane.innerHTML = `<p style="color:red">Could not load page: ${pageName}</p>`;
                }
            }
        });
    }

    async function loadLanguage(lang) {
        let data = await fetchLocalJson(`lang/${lang}.json`);
        if (!data) {
            console.warn(`Translation for '${lang}' not found. Falling back to 'en'.`);
            lang = 'en';
            data = await fetchLocalJson(`lang/en.json`);
        }
        appState.translations = data;
        appState.currentLang = lang;
        document.documentElement.lang = lang;
        if (langSelector.value !== lang) {
            langSelector.value = lang;
        }
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.id === 'footer-version-info' && el.dataset.i18n === 'loaded') return;
            if (T(key) !== `[${key}]`) el.textContent = T(key);
        });

        const activeTab = tabNav.querySelector('.active')?.dataset.tab || 'overview';
        await switchTab(activeTab);
    }

    async function init() {
        tabNav.style.pointerEvents = 'none';
        tabNav.style.opacity = '0.7';

        // ATTACH ALL EVENT LISTENERS
        tabNav.addEventListener('click', (e) => {
            const tabButton = e.target.closest('button[data-tab]');
            if (tabButton) {
                switchTab(tabButton.dataset.tab);
            }
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
                
                const videoContainer = document.createElement('div');
                videoContainer.className = 'relative w-full';
                videoContainer.style.paddingTop = '56.25%';
                videoContainer.appendChild(iframe);

                facade.replaceWith(videoContainer);
                return;
            }
            
            const tagMenu = document.getElementById("tag-menu");
            const tagBtn = document.getElementById("tag-btn");
            if (tagMenu && !tagMenu.classList.contains('hidden')) {
                if (!tagMenu.contains(e.target) && e.target !== tagBtn) {
                    tagMenu.classList.add("hidden");
                }
            }
        });

        // START NON-BLOCKING BACKGROUND TASKS
        Promise.all([fetchGuiVersion(), fetchUcpVersion()]).then(([guiVer, ucpVer]) => {
            appState.versions = { gui: guiVer, ucp: ucpVer };
            const footerInfo = document.getElementById("footer-version-info");
            footerInfo.dataset.i18n = 'loaded'; 
            footerInfo.textContent = `GUI ${guiVer || "-"} | UCP ${ucpVer || "-"}`;
            preloadStoreData();
        }).catch(err => {
            console.error("Failed to fetch versions:", err);
            const footerInfo = document.getElementById("footer-version-info");
            footerInfo.dataset.i18n = 'loaded';
            footerInfo.textContent = "Version info unavailable";
        });

        // PERFORM SEQUENTIAL UI SETUP
        try {
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
            
            await loadLanguage(appState.currentLang);

        } catch (error) {
            console.error("Fatal error during initialization:", error);
            tabContentArea.innerHTML = createParchmentBox(
                `<p style="color:red">The application could not be started. Please try refreshing the page.</p>`
            );
        } finally {
            // RE-ENABLE INTERACTION
            tabNav.style.pointerEvents = 'auto';
            tabNav.style.opacity = '1';
        }
    }

    init();
});
