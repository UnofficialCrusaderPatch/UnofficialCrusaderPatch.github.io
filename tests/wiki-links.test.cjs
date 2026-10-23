const assert = require('node:assert/strict');
const test = require('node:test');
const wiki = require('../js/wiki-links.js');

test('nested sibling and parent links retain their source directory', () => {
    assert.equal(wiki.link('Configuration.md', 'Modding-with-UCP/Creating-Extensions/Creating-a-Plugin'),
        '#wiki/Modding-with-UCP/Creating-Extensions/Configuration');
    assert.equal(wiki.link('../Creating-Extensions.md', 'Modding-with-UCP/Creating-Extensions/Creating-a-Plugin'),
        '#wiki/Modding-with-UCP/Creating-Extensions');
});

test('page fragments and existing deep links round-trip without becoming filenames', () => {
    const href = wiki.link('AI-Personality-Explained.md#resource-management', 'Stronghold-Crusader-Wiki/AI-Lords/AI-Editing-Tutorial');
    assert.deepEqual(wiki.parseHash(href), {
        page: 'Stronghold-Crusader-Wiki/AI-Lords/AI-Personality-Explained', fragment: 'resource-management'
    });
    assert.equal(wiki.link('#aiv-editor-improvements', 'Project'), '#wiki/Project#aiv-editor-improvements');
    assert.equal(wiki.link('#wiki/Home', 'Project'), '#wiki/Home');
    assert.equal(wiki.parseHash('#wiki/%E0%A4%A'), null);
});

test('spaces and punctuation in page names survive navigation', () => {
    const page = 'Project/Projectlist_deprecated (full list!)';
    assert.deepEqual(wiki.parseHash(wiki.route(page)), { page, fragment: '' });
});

test('images resolve against Markdown and external links remain external', () => {
    assert.equal(wiki.resource('./images/abbot_portrait.png', 'Stronghold-Crusader-Wiki/AI-Lords/Vanilla-Lords/Abbot'),
        'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UCP-Wiki/main/docs/Stronghold-Crusader-Wiki/AI-Lords/Vanilla-Lords/images/abbot_portrait.png');
    assert.equal(wiki.link('https://github.com/example/repo', 'Home'), 'https://github.com/example/repo');
    assert.equal(wiki.link('mailto:example@example.com', 'Home'), 'mailto:example@example.com');
});

test('heading slugs match the documented Markdown anchors', () => {
    assert.equal(wiki.slug('AIV-Editor Improvements'), 'aiv-editor-improvements');
    assert.equal(wiki.slug('Configuration (`options.yml` & `config.yml`)'), 'configuration-optionsyml--configyml');
});
