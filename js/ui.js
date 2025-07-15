// This file contains all functions that manipulate the DOM to render content.

/**
 * Renders the content for the Overview tab.
 * @param {function} T - The translation function.
 * @returns {string} - The HTML string for the overview tab.
 */
function renderOverview(T) {
    return `
        <h2 class="ucp-header-font">${T('overview_title')}</h2>
        <p class="mb-6">${T('overview_intro')}</p>
        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-ucp-dark-parchment p-4 rounded-md">
                <h3 class="ucp-header-font">${T('overview_quickstart_title')}</h3>
                <p class="mb-3">${T('overview_quickstart_text')}</p>
                <a href="https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases" target="_blank" class="ucp-button-download inline-block px-4 py-2 rounded-md">${T('download_now')}</a>
            </div>
            <div class="bg-ucp-dark-parchment p-4 rounded-md">
                <h3 class="ucp-header-font">${T('overview_contribute_title')}</h3>
                <p>${T('overview_contribute_text')}</p>
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
    if (!newsItems || newsItems.length === 0) {
        return `<p>${T('news_error')}</p>`;
    }
    const content = newsItems.map(item => {
        const date = item.name.split('_')[0].replace(/-/g, '.');
        return `
            <div class="news-item">
                <h3 class="ucp-header-font">${date}</h3>
                <div class="prose max-w-none">${marked.parse(item.content)}</div>
            </div>
        `;
    }).join('');
    return `<h2 class="ucp-header-font">${T('news_title')}</h2><div class="space-y-6">${content}</div>`;
}

/**
 * Renders the store content grid with search and filter controls.
 * @param {Array<object>} storeItems - The filtered list of items to display.
 * @param {function} T - The translation function.
 * @param {Array<string>} allTags - All unique tags available for filtering.
 * @param {Array<string>} selectedTags - The currently selected tags.
 * @param {string} searchQuery - The current search query.
 * @returns {string} - The HTML string for the store tab.
 */
function renderStore(storeItems, T, allTags = [], selectedTags = [], searchQuery = '') {
    const filterUI = `
        <div class="flex flex-wrap gap-4 mb-6 items-center">
            <div class="relative flex-grow">
                <input type="search" id="store-search" placeholder="${T('store_search_placeholder')}" value="${searchQuery}" class="w-full p-2 rounded-md bg-ucp-dark-parchment border-2 border-ucp-stone-border focus:border-ucp-gold focus:outline-none text-ucp-text placeholder-ucp-text/70">
                <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-ucp-stone-border"></i>
            </div>
            <div class="relative">
                <button id="tag-filter-btn" class="ucp-button-small h-full px-4">${T('store_filter_tags')} <i class="fas fa-chevron-down ml-2 text-xs"></i></button>
                <div id="tag-filter-dropdown" class="hidden absolute right-0 mt-2 w-64 bg-ucp-brown p-4 rounded-md shadow-lg z-20">
                    <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        ${allTags.map(tag => `
                            <label class="flex items-center gap-2 text-ucp-parchment cursor-pointer hover:text-ucp-gold">
                                <input type="checkbox" class="tag-checkbox" value="${tag}" ${selectedTags.includes(tag) ? 'checked' : ''}>
                                ${tag}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    let content;
    if (!storeItems) {
        content = `<p>${T('store_error')}</p>`;
    } else if (storeItems.length === 0) {
        content = `<p>${T('store_no_results')}</p>`;
    } else {
        content = storeItems
            .map(item => `
                <div class="store-item">
                    <h3 class="ucp-header-font text-xl">${item.name}</h3>
                    ${item.definition && item.definition.tags ? `<div class="flex flex-wrap gap-2 mt-2">${item.definition.tags.map(tag => `<span class="text-xs bg-ucp-stone-border text-white px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
                    <a href="${item.html_url}" target="_blank" class="text-sm hover:underline mt-4 inline-block">${T('view_on_github')} &rarr;</a>
                </div>
            `).join('');
    }

    return `
        <h2 class="ucp-header-font">${T('store_title')}</h2>
        <p class="mb-6">${T('store_intro')}</p>
        ${filterUI}
        <div class="store-grid">${content}</div>
    `;
}


/**
 * Renders the AI Format parameter tables.
 * @param {object} aiData - The parsed JSON data for AI parameters.
 * @param {function} T - The translation function.
 * @returns {string} - The HTML string for the AI Format tab.
 */
function renderAiFormat(aiData, T) {
    if (!aiData || !aiData.categories) {
        return `<p>${T('ai_format_error')}</p>`;
    }
    let html = `<p class="mb-6">${T('ai_format_intro')}</p>`;
    for (const category of aiData.categories) {
        html += `<h3 class="ucp-header-font mt-6 mb-2">${category.title}</h3>`;
        html += `<div class="overflow-x-auto"><table class="ai-param-table"><thead><tr>
            <th>${T('ai_param_field')}</th>
            <th>${T('ai_param_values')}</th>
            <th>${T('ai_param_description')}</th>
        </tr></thead><tbody>`;
        category.params.forEach((param, index) => {
            html += `<tr class="${index % 2 === 0 ? 'bg-black bg-opacity-5' : ''}">
                <td class="font-semibold">${param.field}</td>
                <td>${param.values}</td>
                <td>${param.description}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
    }
    return `<h2 class="ucp-header-font">${T('ai_format_title')}</h2>${html}`;
}

/**
 * Renders the FAQ list.
 * @param {Array<object>} faqData - The parsed JSON data for the FAQ.
 * @param {function} T - The translation function.
 * @returns {string} - The HTML string for the FAQ tab.
 */
function renderFaq(faqData, T) {
    if (!faqData) {
        return `<p>${T('faq_error')}</p>`;
    }
    const content = faqData.map(item => `
        <div class="faq-item">
            <h3 class="font-bold text-lg">${item.question}</h3>
            <div class="mt-1">${item.answer}</div>
        </div>
    `).join('');
    return `<h2 class="ucp-header-font">${T('faq_title')}</h2><div class="space-y-6">${content}</div>`;
}

/**
 * Renders the loading state into a container.
 * @param {HTMLElement} container - The element to show the loading message in.
 * @param {function} T - The translation function.
 */
function renderLoading(container, T) {
    container.innerHTML = `<div class="text-center p-8">${T('loading')}</div>`;
}
