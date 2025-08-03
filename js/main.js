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
    
    const wikiRenderer = new marked.Renderer();
    wikiRenderer.image = function(href, title, text) {
        const url = (typeof href === 'object' && href !== null) ? href.href : href;

        // Now, perform the null/empty check on the extracted URL string
        if (!url) {
            return text;
        }

        // Proceed with the logic, but using the 'url' variable
        if (!/^(https?:)?\/\//.test(url)) {
            const currentPagePath = appState.wiki.currentPage || '';
            const lastSlash = currentPagePath.lastIndexOf('/');
            const basePath = (lastSlash > -1) ? currentPagePath.substring(0, lastSlash) : '';
            
            const absoluteHref = `${GITHUB_RAW_BASE}${REPOS.WIKI}/main/docs/${basePath ? basePath + '/' : ''}${url.replace('./', '')}`;
            
            return `<img src="${absoluteHref}" alt="${text}"${title ? ` title="${title}"` : ''}>`;
        }
        
        return `<img src="${url}" alt="${text}"${title ? ` title="${title}"` : ''}>`;
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

    async function switchTab(tabId, updateHistory = true) {
        tabNav.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Only update history if this is a new navigation action
        if (updateHistory) {
            // For wiki, we preserve the full hash path if it exists
            const currentHash = window.location.hash.substring(1);
            if (tabId === 'wiki' && currentHash.startsWith('wiki/')) {
                history.pushState(null, '', `#${currentHash}`);
            } else {
                history.pushState(null, '', `#${tabId}`);
            }
        }

        renderLoading(tabContentArea, T);
        const isTabStillActive = () => tabNav.querySelector('.active')?.dataset.tab === tabId;

        try {
            switch (tabId) {
                case 'overview':
                    const overviewMd = await fetchOverviewMarkdown(appState.currentLang);
                    if (isTabStillActive()) {
                        const overviewHtml = marked.parse(overviewMd);
                        tabContentArea.innerHTML = createParchmentBox(
                            `<div class="prose">${overviewHtml}</div>`
                        );
                    }
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
                    const faqMd = await fetchFaqMarkdown(appState.currentLang);
                    if (isTabStillActive()) {
                        const faqHtml = marked.parse(faqMd);
                        tabContentArea.innerHTML = createParchmentBox(
                            `<h2 class="ucp-header-font">${T('faq_title')}</h2><div class="prose">${faqHtml}</div>`
                        );
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

    function updateStoreList() {
        const { searchQuery, selectedTags, items } = appState.store;
        const query = searchQuery.toLowerCase();

        const filteredItems = items
            .filter(ext => {
                const nameMatch = (ext.definition["display-name"] || ext.definition.name || '').toLowerCase().includes(query);
                const tagsOK = selectedTags.length === 0 || (ext.definition.tags || []).some(t => selectedTags.includes(t));
                return nameMatch && tagsOK;
            })
            // ADD THIS LINE TO SORT THE RESULTS ALPHABETICALLY
            .sort((a, b) => {
                const nameA = a.definition["display-name"] || a.definition.name || '';
                const nameB = b.definition["display-name"] || b.definition.name || '';
                return nameA.localeCompare(nameB);
            });

        const rows = filteredItems.map(ext =>
            `<div class="ucp-store-row" data-id="${ext.definition.name}">${ext.definition["display-name"] || ext.definition.name}</div>`
        ).join("");

        const listContainer = document.querySelector('.ucp-store-list-items');
        if (listContainer) {
            listContainer.innerHTML = rows;
            // After creating the new rows, make them clickable
            attachStoreRowListeners();
        }
    }

    function attachStoreRowListeners() {
        const { items } = appState.store;
        // The incorrect line "const T = appState.translations;" has been removed.
        // The function will now correctly use the 'T' function from the parent scope.

        document.querySelectorAll(".ucp-store-row").forEach(row => {
            row.addEventListener("click", async (e) => {
                document.querySelectorAll(".ucp-store-row").forEach(r => r.classList.remove("sel"));
                row.classList.add("sel");
                const ext = items.find(item => item.definition.name === row.dataset.id);
                const descContainer = document.getElementById("store-desc");
                descContainer.innerHTML = `<p>${T('loading')}</p>`; // This will now work correctly

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
                    descContainer.closest('.parchment-content-wrapper')?.dispatchEvent(new Event('scroll'));
                } catch (err) {
                    descContainer.innerHTML = `<p style="color:red">Could not load details for this item.</p>`;
                }
            });
        });

        const toggleBtn = document.getElementById('store-list-toggle');
        const gridSplit = document.querySelector('.store-content-split');

        if (toggleBtn && gridSplit) {
            toggleBtn.addEventListener('click', () => {
                // We toggle a class on the parent grid container
                gridSplit.classList.toggle('list-collapsed');
                
                // Check if it's collapsed and update the button text
                const isCollapsed = gridSplit.classList.contains('list-collapsed');
                toggleBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
            });
        }
    }

    function renderStoreTab() {
        const { searchQuery, selectedTags, allTags } = appState.store;
        
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

        const storeLayoutHTML = `
            <div class="store-container">
                <div class="store-headers-and-controls">
                    <div class="store-list-header">
                        <h2 class="ucp-header-font">Online Content</h2>
                        <button id="store-list-toggle" class="ucp-button-small">Collapse</button>
                    </div>
                    ${controlsHTML}
                    <h2 class="ucp-header-font">Description</h2>
                </div>
                <div class="store-content-split">
                    <div id="store-list-panel" class="parchment-box ucp-store-list-container">
                        <div class="parchment-content-wrapper">
                            <div class="ucp-store-list-items"></div>
                        </div>
                        <div class="custom-scrollbar">
                            <div class="scrollbar-top"></div>
                            <div class="scrollbar-track"><div class="chain-visuals"></div></div>
                        </div>
                    </div>
                    <div class="parchment-box ucp-store-desc-container">
                        <div class="parchment-content-wrapper">
                            <div id="store-desc" class="ucp-store-desc prose">
                                <p>Select an item from the list on the left.</p>
                            </div>
                        </div>
                        <div class="custom-scrollbar">
                            <div class="scrollbar-top"></div>
                            <div class="scrollbar-track"><div class="chain-visuals"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        tabContentArea.innerHTML = storeLayoutHTML;

        // --- RE-WIRE EVENTS ---
        document.getElementById("store-search").addEventListener("input", e => {
            appState.store.searchQuery = e.target.value;
            updateStoreList(); // Only update the list, don't re-render everything
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
                updateStoreList(); // Only update the list
            };
        });
        
        // Populate the list for the first time
        updateStoreList();
        
        initializeAllCustomScrollbars();
    }

    /**
     * Recursively renders the wiki file tree into an HTML list for the sidebar.
     * @param {Array} tree - The nested array of files and directories.
     * @returns {string} - The generated HTML string.
     */
    function renderSidebarFromTree(tree) {
        let html = '<ul>';
        for (const item of tree) {
            if (item.type === 'dir') {
                html += `<li><span class="folder">${item.name.replace(/-/g, ' ')}</span>`;
                html += renderSidebarFromTree(item.children);
                html += '</li>';
            } else {
                // WICHTIG: Das href-Attribut MUSS mit #wiki/ beginnen
                html += `<li><a href="#wiki/${item.path}" data-path="${item.path}">${item.name.replace(/-/g, ' ')}</a></li>`;
            }
        }
        html += '</ul>';
        return html;
    }

    /**
     * Scans the main wiki content for h2/h3 headers and generates a table of contents.
     */
    function generateTableOfContents() {
        const mainPane = document.querySelector('#wiki-main-content-wrapper .parchment-content-wrapper');
        const tocPane = document.getElementById('wiki-toc-content'); // <-- UPDATED ID
        if (!mainPane || !tocPane) return;

        // ... rest of the function is the same
        const headers = mainPane.querySelectorAll('h2, h3');
        if (headers.length < 2) {
            tocPane.innerHTML = '';
            return;
        }
        let tocHtml = '<ul>';
        headers.forEach((header, index) => {
            const id = `header-${index}`;
            header.id = id;
            const indentClass = header.tagName === 'H3' ? 'indent' : '';
            tocHtml += `<li class="${indentClass}"><a href="#${id}">${header.textContent}</a></li>`;
        });
        tocHtml += '</ul>';
        tocPane.innerHTML = tocHtml;
    }

    async function loadWikiPage(pagePath) {
        // This is the main <main> element which IS the parchment box
        const mainParchmentBox = document.getElementById('wiki-main-content-wrapper'); 
        
        // FIND the inner content area that needs updating
        const mainContentArea = mainParchmentBox.querySelector('.parchment-content-wrapper');
        const tocPane = document.getElementById('wiki-toc-content');

        // Handle cases where elements might not be found
        if (!mainContentArea || !tocPane) {
            console.error("Wiki content or TOC element not found!");
            return;
        }

        // UPDATE only the inner HTML for the loading message
        mainContentArea.innerHTML = `<p>${T('loading')}</p>`;
        tocPane.innerHTML = '';
        
        try {
            const newMd = await fetchWikiPageMarkdown(pagePath, appState.currentLang);
            appState.wiki.mainMd = newMd;
            appState.wiki.currentPage = pagePath;

            // UPDATE only the inner HTML with the new, parsed content
            mainContentArea.innerHTML = marked.parse(newMd, { renderer: wikiRenderer }); // Use our custom renderer
            
            generateTableOfContents();
            initializeAllCustomScrollbars(); // Re-check scrollbars as content height changed
            mainContentArea.scrollTop = 0; // Scroll to top
        } catch (err) {
            mainContentArea.innerHTML = `<p style="color:red">Could not load page: ${pagePath}</p>`;
        }
    }

    async function renderWikiTab() {
        const hash = window.location.hash.substring(1);
        let targetPage = 'Home';
        if (hash.startsWith('wiki/')) {
            // Decode URI component to handle spaces or special chars in filenames
            targetPage = decodeURIComponent(hash.substring(5));
        }

        // First-time load: fetch the file tree and the initial page
        if (!appState.wiki.sidebarTree) {
            renderLoading(tabContentArea, T);
            try {
                const [tree, mainMd] = await Promise.all([
                    fetchWikiTree(),
                    fetchWikiPageMarkdown(targetPage, appState.currentLang) // This line is updated
                ]);
                appState.wiki.sidebarTree = tree;
                appState.wiki.mainMd = mainMd;
                appState.wiki.currentPage = targetPage;
            } catch (e) {
                console.error("Wiki fetch failed", e);
                tabContentArea.innerHTML = renderWiki(null, `Error loading page: ${targetPage}`, T);
                return;
            }
        }
        // Subsequent load: if the page is different, fetch only the new page
        else if (appState.wiki.currentPage !== targetPage) {
            try {
                appState.wiki.mainMd = await fetchWikiPageMarkdown(targetPage, appState.currentLang);
                appState.wiki.currentPage = targetPage;
            } catch (e) {
                console.error(`Failed to fetch wiki page: ${targetPage}`, e);
                appState.wiki.mainMd = `<p style="color:red">Could not load page: ${targetPage}</p>`;
            }
        }

        // Render the page structure
        const sidebarHtml = renderSidebarFromTree(appState.wiki.sidebarTree);
        tabContentArea.innerHTML = renderWiki(sidebarHtml, appState.wiki.mainMd, T, wikiRenderer);
        generateTableOfContents();
        initializeAllCustomScrollbars();

        // Attach the master event listener only once
        if (tabContentArea.dataset.wikiListenerAttached === 'true') return;
        tabContentArea.dataset.wikiListenerAttached = 'true';

        tabContentArea.addEventListener('click', async (e) => {
            // Only run logic if the wiki tab is active
            if (tabNav.querySelector('.active')?.dataset.tab !== 'wiki') return;

            // Handle sidebar collapse/expand button
            const toggleButton = e.target.closest('#wiki-sidebar-toggle');
            if (toggleButton) {
                const sidebar = document.getElementById('wiki-sidebar');
                sidebar.classList.toggle('is-collapsed');
                toggleButton.textContent = sidebar.classList.contains('is-collapsed') ? 'Expand' : 'Collapse';
                return;
            }

            // --- NEW, ROBUST LINK HANDLING LOGIC ---
            const link = e.target.closest('a');
            if (!link) return; // Click was not on a link

            const href = link.getAttribute('href');
            if (!href) return; // Link has no href

            // Allow external links (starting with http/https/mailto) and new tabs to work normally
            if (href.startsWith('http') || href.startsWith('mailto:') || link.target === '_blank') {
                return;
            }

            // Allow on-page anchors (from Table of Contents) to scroll the page
            if (href.startsWith('#') && !href.startsWith('#wiki/')) {
                return;
            }

            // If we've reached this point, it's an internal link our app must handle.
            // Prevent the browser from navigating away.
            e.preventDefault();

            let pagePath;
            if (href.startsWith('#wiki/')) {
                // A pre-formatted link from the left sidebar
                pagePath = decodeURIComponent(href.substring(6));
            } else {
                // A relative link from within the markdown content, like "Page.md" or "Folder/Page.md"
                // The links in your wiki are root-relative (to the `docs` folder), so we just clean them up.
                pagePath = href.replace(/\.md$/, ''); // Remove .md extension
            }

            // Construct the final URL hash
            const targetHash = `#wiki/${encodeURIComponent(pagePath)}`;

            // Don't re-process if we're already on this page
            if (window.location.hash === targetHash) {
                return;
            }

            // Update the URL and load the new page content
            history.pushState(null, '', targetHash);
            await loadWikiPage(pagePath);
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
            const hash = window.location.hash.substring(1) || 'overview';
            const tabId = hash.split('/')[0] || 'overview';

            if (document.querySelector(`[data-tab="${tabId}"]`)) {
                // We don't want to push a new history state when going back/forward
                switchTab(tabId, false); 
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
            if (e.target === creditsModal) {
                isPotentialOverlayClick = true;
            }
        });

        creditsModal.addEventListener('mouseup', (e) => {
            if (e.target === creditsModal && isPotentialOverlayClick) {
                creditsModal.classList.add('hidden');
            }
            isPotentialOverlayClick = false;
        });

        downloadBtn.addEventListener("click", async () => {
            downloadBtn.disabled = true;
            const url = await fetchInstallerUrl(); 
            downloadBtn.disabled = false;
            if (url) window.open(url, "_blank");
        });

        // --- Video Click Handler ---
        document.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.video-thumbnail');
            if (thumbnail) {
                const container = thumbnail.closest('.video-container-static');
                const videoId = container.dataset.videoId;
                const iframe = container.querySelector('iframe');
                
                // Set the src with autoplay and show the video
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
                container.classList.add('is-playing');
            }

            // --- Tag Menu Click Logic (we keep this part) ---
            const tagMenu = document.getElementById("tag-menu");
            if (tagMenu && !tagMenu.classList.contains('hidden')) {
                const tagBtn = document.getElementById("tag-btn");
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

            // Routing Logic
            const hash = window.location.hash.substring(1) || 'overview';
            const initialTab = hash.split('/')[0] || 'overview';

            if (document.querySelector(`[data-tab="${initialTab}"]`)) {
                // Call the content loading logic directly for the correct tab
                await switchTab(initialTab, false); 
            } else {
                await switchTab('overview', false);
            }

        } catch (error) {
            console.error("Fatal error during initialization:", error);
            tabContentArea.innerHTML = createParchmentBox(
                `<p style="color:red">The application could not be started.</p>`
            );
        } finally {
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
            const BOTTOM_CAP_HEIGHT = 18; // IMPORTANT: Must match CSS height of .chain-bottom-cap

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
