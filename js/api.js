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
    WIKI   : "UnofficialCrusaderPatch/UnofficialCrusaderPatch3" // The repo the wiki belongs to
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
    const now   = Date.now();
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached && now - cached.time < CACHE_SECONDS * 1000) {
        return Promise.resolve(cached.data);
    }

    return fetch(url, {
        headers: { "Accept": "application/vnd.github.v3+json" }
    })
        .then(r => {
            if (!r.ok) throw new Error(`GitHub API request failed: ${r.status}`);
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

/* -------------------------------------------------------------
    NEWS & CREDIT HELPERS
------------------------------------------------------------- */
function fetchNewsMarkdown() {
    const url = GITHUB_RAW_BASE + REPOS.NEWS + "/HEAD/" + PATHS.NEWS;
    return fetchRawText(url);
}

function fetchCredits() {
    const url = GITHUB_RAW_BASE + REPOS.CREDITS + "/" + PATHS.CREDITS;
    return fetchRawText(url);
}

/* -------------------------------------------------------------
  WIKI HELPERS
------------------------------------------------------------- */
function fetchWikiPageMarkdown(pageName) {
    // Wikis are their own git repos. The URL needs to point to the '.wiki'
    // repository and include the branch name (usually 'master' for wikis).
    const wikiRepo = `${REPOS.WIKI}.wiki`;
    const branch = 'master';
    const url = `${GITHUB_RAW_BASE}${wikiRepo}/${branch}/${pageName}.md`;
    return fetchRawText(url);
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
