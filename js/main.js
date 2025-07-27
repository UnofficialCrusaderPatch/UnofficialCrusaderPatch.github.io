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
        history.pushState(null, '', '#' + tabId);

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
        initializeAllCustomScrollbars();
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
        initializeAllCustomScrollbars();
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
        initializeAllCustomScrollbars();
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

        window.addEventListener('popstate', () => {
            const tabIdFromHash = window.location.hash.substring(1) || 'overview';
            if (document.querySelector(`[data-tab="${tabIdFromHash}"]`)) {
                switchTab(tabIdFromHash);
            }
        });

        langSelector.addEventListener('change', (e) => loadLanguage(e.target.value));

        creditsBtn.addEventListener('click', async () => {
            creditsModal.classList.remove('hidden');
            
            // Find the new target for our content
            const creditsTarget = document.getElementById('creditsContent');
            if (!creditsTarget) return;

            creditsTarget.innerHTML = `<p>${T('loading')}</p>`;

            // Fetch the markdown content
            const markdown = await fetchCredits();
            const creditsHtml = markdown ? marked.parse(markdown) : 'Could not load credits.';
            
            // Inject the final HTML
            creditsTarget.innerHTML = creditsHtml;

            initializeAllCustomScrollbars();
        });

        let isPotentialOverlayClick = false;

        closeCreditsBtn.addEventListener('click', () => {
            creditsModal.classList.add('hidden');
        });

        creditsModal.addEventListener('mousedown', (e) => {
            // Only register a potential close if the click STARTS on the overlay itself.
            if (e.target === creditsModal) {
                isPotentialOverlayClick = true;
            }
        });

        creditsModal.addEventListener('mouseup', (e) => {
            // Only close if the click ENDS on the overlay AND it started there.
            if (e.target === creditsModal && isPotentialOverlayClick) {
                creditsModal.classList.add('hidden');
            }
            // Reset the flag after every mouseup, no matter what.
            isPotentialOverlayClick = false;
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
            
            // 1. Load the language text first, without switching tabs.
            await loadLanguage(appState.currentLang);

            // 2. NOW, determine the correct tab from the URL hash.
            const initialTab = window.location.hash.substring(1) || 'overview';

            // 3. Switch to that tab.
            if (document.querySelector(`[data-tab="${initialTab}"]`)) {
                // We don't need to await this on initial load.
                switchTab(initialTab);
            } else {
                // Fallback if the hash is invalid for some reason.
                switchTab('overview');
            }

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

    /**
     * Finds all custom scrollbars that haven't been initialized yet and activates them.
     */
    function initializeAllCustomScrollbars() {
        // The container is now the parchment-box itself.
        const scrollbarContainers = document.querySelectorAll('.parchment-box:not([data-scrollbar-active])');

        scrollbarContainers.forEach(container => {
            // Mark as active to prevent re-initializing
            container.dataset.scrollbarActive = 'true';

            // --- Element References (Find children within this specific container) ---
            const contentWrapper = container.querySelector('.parchment-content-wrapper');
            const track = container.querySelector('.scrollbar-track');
            const chainVisuals = container.querySelector('.chain-visuals');

            if (!contentWrapper || !track || !chainVisuals) {
                return;
            }

            // --- Constants ---
            const BOTTOM_CAP_HEIGHT = 8; // IMPORTANT: Must match CSS height of .chain-bottom-cap

            // --- State Variables ---
            let isDragging = false;
            let startY;
            let startScrollTop;
            let scrollInterval;

            // --- Core Function: Update chain length from content scroll (REVISED LOGIC) ---
            function updateChain() {
                requestAnimationFrame(() => {
                    const scrollHeight = contentWrapper.scrollHeight;
                    const clientHeight = contentWrapper.clientHeight;
                    
                    if (scrollHeight <= clientHeight) {
                        chainVisuals.style.display = 'none';
                        return;
                    }
                    chainVisuals.style.display = 'flex';

                    const trackHeight = track.clientHeight;
                    const maxScrollTop = scrollHeight - clientHeight;
                    const scrollTop = contentWrapper.scrollTop;
                    
                    // Calculate the percentage of the content that has been scrolled
                    const scrollPercentage = maxScrollTop > 0 ? (scrollTop / maxScrollTop) : 0;

                    // This is the available space for the chain to "grow" into, excluding the cap's final position
                    const availableTrackHeight = trackHeight - BOTTOM_CAP_HEIGHT;

                    // The length of the middle part of the chain is the percentage of the available track height
                    const middleChainHeight = scrollPercentage * availableTrackHeight;
                    
                    // The total height of the visual container is the middle part plus the cap itself.
                    // This correctly positions the bottom cap at the scrolled percentage.
                    const totalChainHeight = middleChainHeight + BOTTOM_CAP_HEIGHT;

                    chainVisuals.style.height = `${totalChainHeight}px`;
                });
            }

            // --- Event Handlers for Dragging the Chain ---
            chainVisuals.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                startY = e.clientY;
                startScrollTop = contentWrapper.scrollTop;
            });

            const mouseMoveHandler = (e) => {
                if (!isDragging) return;
                e.preventDefault();

                const deltaY = e.clientY - startY;
                const trackHeight = track.clientHeight;
                const scrollHeight = contentWrapper.scrollHeight;
                const clientHeight = contentWrapper.clientHeight;
                
                const scrollableDist = scrollHeight - clientHeight;
                const trackDist = trackHeight > BOTTOM_CAP_HEIGHT ? trackHeight - BOTTOM_CAP_HEIGHT : 1;
                
                const scrollDelta = deltaY * (scrollableDist / trackDist);
                contentWrapper.scrollTop = startScrollTop + scrollDelta;
            };
            document.addEventListener('mousemove', mouseMoveHandler);

            const mouseUpHandler = () => {
                isDragging = false;
            };
            document.addEventListener('mouseup', mouseUpHandler);
            
            // --- Event Handlers for Clicking the Track ---
            const startContinuousScroll = (direction) => {
                if (scrollInterval) clearInterval(scrollInterval);
                scrollInterval = setInterval(() => {
                    contentWrapper.scrollTop += 10 * direction;
                }, 16);
            };
            
            const stopContinuousScroll = () => {
                clearInterval(scrollInterval);
            };
            
            track.addEventListener('mousedown', (e) => {
                if (e.target !== track) return;
                const rect = track.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const chainHeight = chainVisuals.offsetHeight;
                
                if (clickY > chainHeight) {
                    startContinuousScroll(1);
                }
            });
            
            document.addEventListener('mouseup', stopContinuousScroll);
            document.addEventListener('mouseleave', stopContinuousScroll);

            // --- Initial & Dynamic Updates ---
            contentWrapper.addEventListener('scroll', updateChain);
            new ResizeObserver(updateChain).observe(contentWrapper);
            new ResizeObserver(updateChain).observe(container);
            updateChain();
        });
    }

    init();
});
