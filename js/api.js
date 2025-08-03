// This file handles all communication with the GitHub API to fetch dynamic content.

/* -------------------------------------------------------------
    CONSTANTS
------------------------------------------------------------- */
const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/";

// Repositories
const REPOS = {
    NEWS   : "UnofficialCrusaderPatch/UnofficialCrusaderPatch", // contains NEWS.md
    STORE  : "UnofficialCrusaderPatch/UCP3-extensions-store",   // branch‑aware store
    CREDITS: "UnofficialCrusaderPatch/UCP3-GUI",                // credits.md lives here
    WIKI   : "UnofficialCrusaderPatch/UCP-Wiki"                 // The repo the wiki belongs to
};

// Paths inside those repositories
const PATHS = {
    NEWS   : "NEWS.md",                                     // single markdown file
    STORE  : "",                                            // root directory
    CREDITS: "main/src/components/credits/credits.md"
};

/* -------------------------------------------------------------
    VERY SMALL LOCAL CACHE (5‑minute TTL)
------------------------------------------------------------- */
const CACHE_SECONDS = 300; // 5 minutes

function fetchWithCache(key, url, asJson = true) {
    const now = Date.now();
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached && now - cached.time < CACHE_SECONDS * 1000) {
        return Promise.resolve(cached.data);
    }

    const headers = {
        "Accept": "application/vnd.github.v3+json"
    };

    // Use the Personal Access Token if it's available (from js/config.js)
    // This dramatically increases the API rate limit for development.
    if (typeof GITHUB_PAT !== 'undefined' && GITHUB_PAT) {
        headers['Authorization'] = `token ${GITHUB_PAT}`;
    }

    return fetch(url, { headers }) // Pass the updated headers object
        .then(r => {
            if (!r.ok) {
                 // Throw an error that includes the status for easier debugging
                throw new Error(`GitHub API request failed: ${r.status}`);
            }
            return asJson ? r.json() : r.text();
        })
        .then(data => {
            localStorage.setItem(key, JSON.stringify({ time: now, data }));
            return data;
        });
}

/* -------------------------------------------------------------
    GENERIC LOW‑LEVEL HELPERS
------------------------------------------------------------- */
function fetchApiJson(url) {
    return fetchWithCache("json_" + url, url, true);
}

function fetchRawText(url) {
    return fetchWithCache("raw_" + url, url, false);
}

/* -------------------------------------------------------------
    VERSION HELPERS (latest GUI & UCP releases)
------------------------------------------------------------- */
function fetchGuiVersion() {
    return fetchWithCache(
        "guiVer",
        "https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/latest",
        true
    ).then(data => data?.tag_name?.replace(/^v/i, "") || null);
}

function fetchUcpVersion() {
    return fetchWithCache(
        "ucpCoreVer",
        "https://api.github.com/repos/UnofficialCrusaderPatch/UnofficialCrusaderPatch3/releases/latest",
        true
    ).then(data => data?.tag_name?.replace(/^v/i, "") || null);
}

function fetchInstallerUrl() {
    const cacheKey = "installerUrl";
    const url = "https://api.github.com/repos/UnofficialCrusaderPatch/UnofficialCrusaderPatch/releases/latest";

    return fetchWithCache(cacheKey, url, true).then(data => {
        if (!data || !data.assets || data.assets.length === 0) {
            console.error("No assets found in the latest release.");
            return null;
        }

        const installerAsset = data.assets.find(asset => 
            asset.name.toLowerCase().endsWith('.exe')
        );

        if (!installerAsset) {
            console.error("No .exe installer asset found in the latest release.");
            return null;
        }

        return installerAsset.browser_download_url;
    }).catch(err => {
        console.error("Failed to fetch installer URL:", err);
        return null;
    });
}

/* -------------------------------------------------------------
    Overview Markdown
------------------------------------------------------------- */

function fetchOverviewMarkdown(lang) {
    const defaultUrl = 'md/overview-en.md';
    const localizedUrl = `md/overview-${lang}.md`;

    // Try to fetch the localized version first, if it fails, fetch the English default.
    return fetch(localizedUrl)
        .then(response => {
            if (!response.ok) return fetch(defaultUrl);
            return response;
        })
        .then(response => response.text())
        .catch(() => fetch(defaultUrl).then(res => res.text()));
}

/* -------------------------------------------------------------
    NEWS & CREDIT HELPERS
------------------------------------------------------------- */
function fetchNewsMarkdown(lang) {
    // We'll assume you create local news files like you did for the overview
    const defaultUrl = 'md/news-en.md';
    const localizedUrl = `md/news-${lang}.md`;

    // This logic is similar to the new overview function
    return fetch(localizedUrl)
        .then(response => {
            if (!response.ok) return fetch(defaultUrl);
            return response;
        })
        .then(response => response.text())
        .catch(() => fetch(defaultUrl).then(res => res.text()));
}

function fetchCredits() {
    const url = GITHUB_RAW_BASE + REPOS.CREDITS + "/" + PATHS.CREDITS;
    return fetchRawText(url);
}

/* -------------------------------------------------------------
  WIKI HELPERS
------------------------------------------------------------- */
function fetchWikiPageMarkdown(pageName, lang) {
    // This will try to fetch from a structure like /docs/de/Home.md
    // and fall back to /docs/Home.md
    const localizedUrl = `${GITHUB_RAW_BASE}${REPOS.WIKI}/main/docs/${lang}/${pageName}.md`;
    const defaultUrl = `${GITHUB_RAW_BASE}${REPOS.WIKI}/main/docs/${pageName}.md`;

    return fetchRawText(localizedUrl)
        .catch(() => fetchRawText(defaultUrl));
}

/**
 * Fetches the entire wiki file structure in a single, non-recursive API call.
 * This is vastly more efficient than recursively calling the 'contents' endpoint.
 */
async function fetchWikiTree() {
    // This API endpoint gets the entire file list recursively in one go.
    const url = `${GITHUB_API_BASE}${REPOS.WIKI}/git/trees/main?recursive=1`;
    const cacheKey = `tree_recursive_${REPOS.WIKI}`;

    const { tree: flatTree } = await fetchWithCache(cacheKey, url, true);

    const root = [];
    const dirs = {}; // A map to quickly find directory objects

    // Filter for only markdown files within the 'docs/' directory
    const wikiFiles = flatTree.filter(item =>
        item.path.startsWith('docs/') &&
        item.path.endsWith('.md') &&
        item.type === 'blob'
    );

    for (const item of wikiFiles) {
        // Path relative to 'docs/', e.g., "User-Guides/Getting-Started/Installation.md"
        const relativePath = item.path.substring(5);
        const parts = relativePath.split('/');
        const fileName = parts.pop().replace(/\.md$/, '');

        let currentLevel = root;
        let pathAccumulator = '';

        // Create directory structures as needed
        for (const part of parts) {
            pathAccumulator += (pathAccumulator ? '/' : '') + part;
            
            let dirNode = dirs[pathAccumulator];
            if (!dirNode) {
                dirNode = {
                    name: part.replace(/-/g, ' '),
                    type: 'dir',
                    children: []
                };
                dirs[pathAccumulator] = dirNode;
                currentLevel.push(dirNode);
            }
            currentLevel = dirNode.children;
        }

        // Add the file to the final correct level
        currentLevel.push({
            name: fileName.replace(/-/g, ' '),
            path: relativePath.replace(/\.md$/, ''),
            type: 'file'
        });
    }
    
    // Sort folders first, then files, at every level
    const sortNodes = (nodes) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.type === 'dir') sortNodes(node.children);
        });
    };
    
    sortNodes(root);
    return root;
}

/* -------------------------------------------------------------
     STORE (YAML) HELPERS
------------------------------------------------------------- */
function fetchStoreYaml(version) {
    const rawUrl = `${GITHUB_RAW_BASE}UnofficialCrusaderPatch/UCP3-extensions-store/${version}/recipe.yml`;
    const cdnUrl = `https://cdn.jsdelivr.net/gh/UnofficialCrusaderPatch/UCP3-extensions-store@${version}/recipe.yml`;

    return fetchWithCache(`storeYaml_${version}`, rawUrl, false)
        .catch(() => fetchWithCache(`storeYamlCDN_${version}`, cdnUrl, false))
        .then(text => {
            if (!text) throw new Error("Empty YAML file received from store.");
            if (typeof window.jsyaml === 'undefined') {
                throw new Error("YAML parser (js-yaml) not loaded.");
            }
            return window.jsyaml.load(text); // Use the official library
        });
}

function fetchDefinitionYaml(ext) {
    const repo  = ext.contents.source.url;
    const ref   = ext.contents.source["github-sha"] || ext.contents.source["github-tag"];
    const loc   = ext.contents.source.location ? `${ext.contents.source.location}/` : "";
    const url = `${GITHUB_RAW_BASE}${repo}/${ref}/${loc}definition.yml`;

    return fetchWithCache(`def_${repo}_${ref}_${loc}`, url, false)
        .then(text => {
            if (typeof window.jsyaml !== 'undefined' && text) {
                return window.jsyaml.load(text);
            }
            return {}; // Return empty object on failure or if parser is missing
        }).catch(() => ({}));
}

/* build the URL for description‑<lang>.md, fall back to en → default */
function buildDescriptionUrl(ext, lang) {
    const repo  = ext.contents.source.url;
    const ref   = ext.contents.source["github-sha"] || ext.contents.source["github-tag"];
    const loc   = ext.contents.source.location ? `${ext.contents.source.location}/` : "";
    const tryLangs = [lang, "en", "default"];

    return tryLangs.map(l => `${GITHUB_RAW_BASE}${repo}/${ref}/${loc}locale/description-${l}.md`);
}

console.log("✅ api.js has been loaded and executed.");