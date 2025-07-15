// This file handles all communication with the GitHub API to fetch dynamic content.

/* -------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------- */
const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/";

// Repositories
const REPOS = {
    NEWS   : "UnofficialCrusaderPatch/UnofficialCrusaderPatch", // contains NEWS.md
    STORE  : "UnofficialCrusaderPatch/UCP3-extensions-store",    // branch‑aware store
    CREDITS: "UnofficialCrusaderPatch/UCP3-GUI"                  // credits.md lives here
};

// Paths inside those repositories
const PATHS = {
    NEWS   : "NEWS.md",                  // single markdown file
    STORE  : "",                         // root directory
    CREDITS: "main/src/assets/credits.md" // credits markdown
};

/* -------------------------------------------------------------
   VERY SMALL LOCAL CACHE (5‑minute TTL) – keeps us under GitHub's
   60 unauthenticated requests / hour limit.
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
        .then(r => asJson ? r.json() : r.text())
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
        "ucpVer",
        "https://api.github.com/repos/UnofficialCrusaderPatch/UnofficialCrusaderPatch/releases/latest",
        true
    ).then(data => data?.tag_name?.replace(/^v/i, "") || null);
}

/* -------------------------------------------------------------
   STORE HELPERS (branch‑aware)
------------------------------------------------------------- */
function branchRef(branch) {
    return branch ? "?ref=" + branch : "";
}

function fetchStoreItems(branch = "") {
    const url = GITHUB_API_BASE + REPOS.STORE +
                "/contents/" + PATHS.STORE + branchRef(branch);
    const key = "storeList_" + (branch || "root");

    return fetchWithCache(key, url, true).then(data => {
        if (data?.message === "Not Found" && branch) {
            return fetchStoreItems("");
        }
        return data;
    });
}

function fetchDirectoryContents(path, branch = "") {
    const url = GITHUB_API_BASE + REPOS.STORE +
                "/contents/" + path + branchRef(branch);
    const key = "dir_" + path + "_" + (branch || "root");

    return fetchWithCache(key, url, true).then(data => {
        if (data?.message === "Not Found" && branch) {
            return fetchDirectoryContents(path, "");
        }
        return data;
    });
}

/* -------------------------------------------------------------
   NEWS & CREDIT HELPERS
------------------------------------------------------------- */
function fetchNewsMarkdown() {
    const url = GITHUB_RAW_BASE + REPOS.NEWS + "/HEAD/" + PATHS.NEWS;
    return fetchRawText(url);
}

function fetchFileContentByUrl(downloadUrl) {
    return fetchRawText(downloadUrl);
}

function fetchCredits() {
    const url = GITHUB_RAW_BASE + REPOS.CREDITS + "/" + PATHS.CREDITS;
    return fetchRawText(url);
}

/* -------------------------------------------------------------
   DEFINITION / YAML TAG UTILITIES
------------------------------------------------------------- */
function parseTagsFromYaml(yamlContent) {
    try {
        const doc  = YAML.parse(yamlContent);
        const tags = doc?.tags;
        return Array.isArray(tags) ? tags.map(t => String(t)) : [];
    } catch (e) {
        console.warn("YAML parse failed", e);
        return [];
    }
}

/* -------------------------------------------------------------
   PUBLIC API – expose selected helpers globally so main.js and ui.js
   can call them without using ES‑module syntax. We attach to window.
------------------------------------------------------------- */
Object.assign(window, {
    // constants (useful elsewhere)
    REPOS,
    PATHS,
    // low level
    fetchApiJson,
    fetchRawText,
    fetchWithCache,
    // versions
    fetchGuiVersion,
    fetchUcpVersion,
    // store
    fetchStoreItems,
    fetchDirectoryContents,
    // news / credits
    fetchNewsMarkdown,
    fetchCredits,
    // yaml util
    parseTagsFromYaml,
    fetchFileContentByUrl
});
