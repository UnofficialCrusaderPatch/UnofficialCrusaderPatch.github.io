// This file contains all functions that manipulate the DOM to render content.

/**
 * Creates the main content wrapper with a parchment background AND its custom scrollbar INSIDE.
 * @param {string} innerHTML - The HTML content to place inside the box.
 * @returns {string}
 */
function createParchmentBox(innerHTML) {
    return `
        <div class="parchment-box">
            <div class="parchment-content-wrapper">
                ${innerHTML}
            </div>
            <div class="custom-scrollbar">
                <div class="scrollbar-top"></div>
                <div class="scrollbar-track">
                    <div class="chain-visuals">
                        <!-- This is now intentionally empty. All visuals are on its background. -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders a list of news items.
 * @param {Array<object>} newsItems - Array of news items with {name, content}.
 * @param {function} T - The translation function.
 * @returns {string} - The HTML string for the news list.
 */
function renderNews(newsItems, T) {
    let content;
    if (!newsItems || newsItems.length === 0) {
        content = `<p>${T('news_error')}</p>`;
    } else {
        content = newsItems.map(item => {
            const htmlContent = item.content ? marked.parse(item.content) : '';
            return `<div class="news-item prose max-w-none">${htmlContent}</div>`;
        }).join('<hr class="border-ucp-stone-border/20 my-6">');
    }
    const html = `<h2 class="ucp-header-font">${T('news_title')}</h2><div class="space-y-6">${content}</div>`;
    return createParchmentBox(html);
}


function renderWiki(sidebarHtml, mainMd, T, renderer) {
    if (!mainMd) {
        return createParchmentBox(`<p>${T('wiki_error') || 'Could not load the wiki content.'}</p>`);
    }

    const mainContentHtml = marked.parse(mainMd, { renderer: renderer });

    // This version adds a header and a collapse button to the sidebar structure.
    return `
        <div class="wiki-container">
            <nav id="wiki-sidebar" class="parchment-box">
                <div class="parchment-content-wrapper">
                    <div class="wiki-sidebar-header">
                        <h3 class="ucp-header-font">Navigation</h3>
                        <button id="wiki-sidebar-toggle" class="ucp-button-small">Collapse</button>
                    </div>
                    <div id="wiki-sidebar-content">${sidebarHtml}</div>
                </div>
                <div class="custom-scrollbar">
                    <div class="scrollbar-top"></div>
                    <div class="scrollbar-track"><div class="chain-visuals"></div></div>
                </div>
            </nav>
            
            <main id="wiki-main-content-wrapper" class="parchment-box">
                <div class="parchment-content-wrapper">${mainContentHtml}</div>
                <div class="custom-scrollbar">
                    <div class="scrollbar-top"></div>
                    <div class="scrollbar-track"><div class="chain-visuals"></div></div>
                </div>
            </main>
            
            <aside id="wiki-toc" class="parchment-box">
                <div class="parchment-content-wrapper">
                    <div class="wiki-sidebar-header">
                        <h3 class="ucp-header-font">On This Page</h3>
                    </div>
                    <div id="wiki-toc-content"></div>
                </div>
                 <div class="custom-scrollbar">
                    <div class="scrollbar-top"></div>
                    <div class="scrollbar-track"><div class="chain-visuals"></div></div>
                </div>
            </aside>
        </div>
    `;
}

function renderLoading(container, T) {
    const html = `<div class="text-center p-8">${T('loading')}</div>`;
    container.innerHTML = createParchmentBox(html);
}
