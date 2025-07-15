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

function fetchFileContentByUrl(downloadUrl) {
    return fetchRawText(downloadUrl);
}

function fetchCredits() {
    const url = GITHUB_RAW_BASE + REPOS.CREDITS + "/" + PATHS.CREDITS;
    return fetchRawText(url);
}

/* ------------------------------------------------------------------
   Make sure window.YAML is available before we call YAML.parse()
   ------------------------------------------------------------------ */
function ensureYamlReady(timeoutMs = 3000) {
    if (typeof YAML !== "undefined") return Promise.resolve();

    return new Promise((resolve, reject) => {
        const started = Date.now();

        const id = setInterval(() => {
            if (typeof YAML !== "undefined") {
                clearInterval(id);
                resolve();
            } else if (Date.now() - started > timeoutMs) {
                clearInterval(id);
                reject(new Error("YAML still not loaded"));
            }
        }, 50);
    });
}

/* -------------------------------------------------------------
   STORE (YAML) HELPERS
------------------------------------------------------------- */
function fetchStoreYaml(version) {
    // Primary: raw file from the tag
    const rawUrl =
        `${GITHUB_RAW_BASE}UnofficialCrusaderPatch/` +
        `UCP3-extensions-store/v${version}/recipe.yml`;

    // Fallback: jsDelivr CDN (always CORS‑enabled)
    const cdnUrl =
        `https://cdn.jsdelivr.net/gh/UnofficialCrusaderPatch/` +
        `UCP3-extensions-store@v${version}/recipe.yml`;

    return fetchWithCache(`storeYaml_${version}`, rawUrl, false)
        .catch(() => fetchWithCache(`storeYamlCDN_${version}`, cdnUrl, false))
        .then(text => {
            if (!text) throw new Error("empty YAML");
            return ensureYamlReady().then(() => YAML.parse(text));
        });
}

/* chooses best description block for the language the page is in */
function pickDescription(descArr, lang) {
    if (!Array.isArray(descArr) || !descArr.length) return "";
    const exact = descArr.find(d => d.language === lang);
    const en    = descArr.find(d => d.language === "en");
    const deflt = descArr.find(d => d.language === "default");
    return exact || en || deflt || descArr[0];
}



/* -------------------------------------------------------------
   PER‑EXTENSION  helpers  (tags + description)
------------------------------------------------------------- */

/*  download and cache definition.yml so we get the tags array
    raw.githubusercontent.com/{owner}/{tag}/{location?}/definition.yml     */
function fetchDefinitionYaml(ext) {
    const repo  = ext.contents.source.url;              // owner/repo
    const ref   = ext.contents.source["github-sha"] ||
                  ext.contents.source["github-tag"];
    const loc   = ext.contents.source.location
                    ? ext.contents.source.location + "/"
                    : "";

    const url =
        GITHUB_RAW_BASE + repo + "/" + ref + "/" + loc + "definition.yml";

    return fetchWithCache("def_" + repo + "_" + ref + "_" + loc, url, false)
        .then(text => (typeof YAML !== "undefined" ? YAML.parse(text) : {}));
}

/*  build the URL for description‑<lang>.md, fall back to en → default */
function buildDescriptionUrl(ext, lang) {
    const repo  = ext.contents.source.url;
    const ref   = ext.contents.source["github-sha"] ||
                  ext.contents.source["github-tag"];
    const loc   = ext.contents.source.location
                    ? ext.contents.source.location + "/"
                    : "";
    const tryLangs = [lang, "en", "default"];

    return tryLangs.map(l =>
        GITHUB_RAW_BASE + repo + "/" + ref + "/" + loc +
        "locale/description-" + l + ".md"
    );
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
    // news / credits
    fetchNewsMarkdown,
    fetchCredits,
    // yaml utils
    fetchDefinitionYaml,
    buildDescriptionUrl,
    fetchFileContentByUrl,
    fetchStoreYaml,
    pickDescription
});
