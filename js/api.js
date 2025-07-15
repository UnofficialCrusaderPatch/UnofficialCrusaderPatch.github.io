// This file handles all communication with the GitHub API to fetch dynamic content.

const GITHUB_API_BASE = 'https://api.github.com/repos/';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/';

// --- API ENDPOINTS ---
const REPOS = {
    NEWS: 'UnofficialCrusaderPatch/UnofficialCrusaderPatch',
    STORE : 'UnofficialCrusaderPatch/UCP3-extensions-store',
    CREDITS: 'UnofficialCrusaderPatch/UCP3-GUI'
};

const PATHS = {
    NEWS  : "NEWS.md",
    STORE : '',
    CREDITS: 'main/src/assets/credits.md'
};

// ---------- very small local cache to stay inside GitHub rate limits ----------
const cacheSeconds = 300;                           // 5 min
function fetchWithCache(key, url, isJson = true) {
    const now = Date.now();
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached && now - cached.time < cacheSeconds * 1000) {
        return Promise.resolve(cached.data);
    }
    return fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json" }
    })
        .then(r => isJson ? r.json() : r.text())
        .then(data => {
            localStorage.setItem(key, JSON.stringify({ time: now, data }));
            return data;
        });
}

// ---------- latest version helpers ----------
export async function fetchGuiVersion() {
    const data = await fetchWithCache(
        "guiVer",
        "https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/latest"
    );
    return data?.tag_name?.replace(/^v/i, "") || null;
}

export async function fetchUcpVersion() {
    const data = await fetchWithCache(
        "ucpVer",
        "https://api.github.com/repos/UnofficialCrusaderPatch/UnofficialCrusaderPatch/releases/latest"
    );
    return data?.tag_name?.replace(/^v/i, "") || null;
}

// ---------- branch query helper ----------
function branchRef(branch) {
    return branch ? "?ref=" + branch : "";
}

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
export async function fetchStoreItems(branch = "") {
    const url =
        GITHUB_API_BASE + REPOS.STORE + "/contents/" + PATHS.STORE + branchRef(branch);
    return await fetchWithCache("storeList_" + branch, url);
}

/**
 * Fetches the contents of a directory within the store repository.
 * @param {string} path - The path to the directory relative to the repo root.
 * @returns {Promise<object[]|null>}
 */
export async function fetchDirectoryContents(path, branch = "") {
    const url = GITHUB_API_BASE + REPOS.STORE + "/contents/" + path + branchRef(branch);
    return await fetchWithCache("dir_" + path + "_" + branch, url);
}


/**
 * Fetches the credits.md file content.
 * @returns {Promise<string|null>} - The Markdown content of the credits file.
 */
async function fetchCredits() {
    const url = `${GITHUB_RAW_BASE}${REPOS.CREDITS}/${PATHS.CREDITS}`;
    return await fetchRawText(url);
}
