const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

test('direct installer lookup follows GUI releases and ignores the old repository cache', async () => {
    let now = 1000000;
    let version = '1.2.3';
    const requests = [];
    const cache = new Map([['installerUrl', JSON.stringify({ time: now, data: {
        assets: [{ name: 'old.exe', browser_download_url: 'https://example.test/old.exe' }]
    } })]]);
    const context = vm.createContext({
        console: { log() {}, error() {} },
        Date: { now: () => now },
        localStorage: { getItem: k => cache.get(k) || null, setItem: (k,v) => cache.set(k,v) },
        fetch: async url => {
            requests.push(url);
            return { ok: true, json: async () => ({ tag_name: 'v' + version, assets: [
                { name: 'latest.json', browser_download_url: 'https://example.test/latest.json' },
                { name: `GUI_${version}_setup.exe`, browser_download_url: `https://example.test/${version}.exe` }
            ] }) };
        }
    });
    vm.runInContext(fs.readFileSync(require.resolve('../js/api.js'), 'utf8'), context);
    assert.equal(await context.fetchInstallerUrl(), 'https://example.test/1.2.3.exe');
    assert.equal(await context.fetchGuiVersion(), '1.2.3');
    assert.deepEqual(requests, ['https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/latest']);

    now += 301000;
    version = '1.2.4';
    assert.equal(await context.fetchInstallerUrl(), 'https://example.test/1.2.4.exe');
    assert.equal(await context.fetchGuiVersion(), '1.2.4');
    assert.equal(requests.length, 2);
});
