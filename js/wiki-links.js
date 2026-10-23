// Shared URL handling for Markdown authored relative to its source file.
const WikiLinks = (() => {
    const docsRoot = 'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UCP-Wiki/main/docs/';

    function route(page, fragment = '') {
        return '#wiki/' + page.split('/').map(encodeURIComponent).join('/') +
            (fragment ? '#' + encodeURIComponent(fragment) : '');
    }

    function parseHash(hash) {
        const match = /^#?wiki(?:\/([^#]*))?(?:#(.*))?$/.exec(hash);
        if (!match) return null;
        try {
            return {
                page: decodeURIComponent(match[1] || 'Home').replace(/\.md$/i, ''),
                fragment: decodeURIComponent(match[2] || '')
            };
        } catch {
            return null;
        }
    }

    function resource(href, page) {
        return new URL(href, new URL(page + '.md', docsRoot)).href;
    }

    function link(href, page) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return href;
        const routed = parseHash(href);
        if (routed) return route(routed.page, routed.fragment);
        if (href.startsWith('#')) return route(page, href.slice(1));
        const target = new URL(resource(href, page));
        if (!target.href.startsWith(docsRoot)) return target.href;
        const path = decodeURIComponent(target.pathname.slice(new URL(docsRoot).pathname.length));
        if (/\.md$/i.test(path) || !/\.[^/]+$/.test(path)) {
            return route(path.replace(/\.md$/i, ''), decodeURIComponent(target.hash.slice(1)));
        }
        return target.href;
    }

    function slug(text) {
        return text.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/\s/g, '-');
    }

    return { route, parseHash, resource, link, slug };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WikiLinks;
