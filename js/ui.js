// This file contains all functions that manipulate the DOM to render content.

/**
 * Creates the main content wrapper with a parchment background.
 * @param {string} innerHTML - The HTML content to place inside the box.
 * @returns {string}
 */
function createParchmentBox(innerHTML) {
    return `<div class="parchment-box">${innerHTML}</div>`;
}

/**
 * Renders the content for the Overview tab.
 * @param {function} T - The translation function.
 * @returns {string} - The HTML string for the overview tab.
 */
function renderOverview(T) {
    const content = `
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
    return createParchmentBox(content);
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


function renderAiFormat(aiData, T) {
    let content;
    if (!aiData || !aiData.categories) {
        content = `<p>${T('ai_format_error')}</p>`;
    } else {
        content = `<p class="mb-6">${T('ai_format_intro')}</p>`;
        for (const category of aiData.categories) {
            content += `<h3 class="ucp-header-font mt-6 mb-2">${category.title}</h3>`;
            content += `<div class="overflow-x-auto"><table class="ai-param-table"><thead><tr>
                <th>${T('ai_param_field')}</th>
                <th>${T('ai_param_values')}</th>
                <th>${T('ai_param_description')}</th>
            </tr></thead><tbody>`;
            category.params.forEach((param, index) => {
                content += `<tr class="${index % 2 === 0 ? 'bg-black bg-opacity-5' : ''}">
                    <td class="font-semibold">${param.field}</td>
                    <td>${param.values}</td>
                    <td>${param.description}</td>
                </tr>`;
            });
            content += `</tbody></table></div>`;
        }
    }
    const html = `<h2 class="ucp-header-font">${T('ai_format_title')}</h2>${content}`;
    return createParchmentBox(html);
}

function renderFaq(faqData, T) {
    let content;
    if (!faqData) {
        content = `<p>${T('faq_error')}</p>`;
    } else {
        // The answer field can contain HTML, including iframes.
        // The replacement to a facade will happen in main.js after this is rendered.
        content = faqData.map(item => `
            <div class="faq-item">
                <h3 class="font-bold text-lg">${item.question}</h3>
                <div class="mt-1 prose max-w-none">${item.answer}</div>
            </div>
        `).join('');
    }
    const html = `<h2 class="ucp-header-font">${T('faq_title')}</h2><div class="space-y-6">${content}</div>`;
    return createParchmentBox(html);
}

function renderLoading(container, T) {
    const html = `<div class="text-center p-8">${T('loading')}</div>`;
    container.innerHTML = createParchmentBox(html);
}
