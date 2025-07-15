// This file handles all communication with the GitHub API to fetch dynamic content.

const GITHUB_API_BASE = 'https://api.github.com/repos/';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/';

// --- API ENDPOINTS ---
const REPOS = {
    NEWS: 'UnofficialCrusaderPatch/UnofficialCrusaderPatch.github.io',
    STORE: 'UnofficialCrusaderPatch/UCP-Store-SVN',
    CREDITS: 'UnofficialCrusaderPatch/UCP3-GUI'
};

const PATHS = {
    NEWS: 'news',
    STORE: 'store',
    CREDITS: 'main/src/assets/credits.md'
};

/**
 * A generic helper function to fetch JSON data from the GitHub API.
 * @param {string} url - The API URL to fetch.
 * @returns {Promise<object|null>} - The parsed JSON data or null on error.
 */
async function fetchApiJson(url) {
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!response.ok) {
            throw new Error(`GitHub API request failed: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
        return null;
    }
}

/**
 * A generic helper function to fetch raw text content (like Markdown).
 * @param {string} url - The raw content URL to fetch.
 * @returns {Promise<string|null>} - The text content or null on error.
 */
async function fetchRawText(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch raw content: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
        return null;
    }
}

/**
 * Fetches the list of news files from the GitHub repository.
 * @returns {Promise<object[]|null>} - An array of file objects or null on error.
 */
async function fetchNewsList() {
    const url = `${GITHUB_API_BASE}${REPOS.NEWS}/contents/${PATHS.NEWS}`;
    return await fetchApiJson(url);
}

/**
 * Fetches the content of a single file given its direct download URL.
 * @param {string} downloadUrl - The download_url of the file.
 * @returns {Promise<string|null>} - The text content of the file.
 */
async function fetchFileContentByUrl(downloadUrl) {
    return await fetchRawText(downloadUrl);
}

/**
 * Fetches the list of items (modules, packs) from the store repository.
 * @returns {Promise<object[]|null>} - An array of directory/file objects.
 */
async function fetchStoreItems() {
    const url = `${GITHUB_API_BASE}${REPOS.STORE}/contents/${PATHS.STORE}`;
    return await fetchApiJson(url);
}

/**
 * Fetches the contents of a directory within the store repository.
 * @param {string} path - The path to the directory relative to the repo root.
 * @returns {Promise<object[]|null>}
 */
async function fetchDirectoryContents(path) {
    const url = `${GITHUB_API_BASE}${REPOS.STORE}/contents/${path}`;
    return await fetchApiJson(url);
}


/**
 * Fetches the credits.md file content.
 * @returns {Promise<string|null>} - The Markdown content of the credits file.
 */
async function fetchCredits() {
    const url = `${GITHUB_RAW_BASE}${REPOS.CREDITS}/${PATHS.CREDITS}`;
    return await fetchRawText(url);
}
