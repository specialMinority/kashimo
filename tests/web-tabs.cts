// Browser regression for labels being flex-shrunk inside the bottom navigation.
// Run after build:web and preview:web. Each browser uses isolated, empty storage.
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.argv[2] || 'http://localhost:4173/kashimo/';
const output = path.join('test-results', url.startsWith('http://localhost:') ? 'web-tabs' : 'web-tabs-live');
const labels = ['ホーム', '記録', '追加', '設定'];
const scenarios = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'short-viewport', width: 390, height: 600 },
  // Simulates the reserved screen space; it is not a physical iPhone test.
  { name: 'safe-area', width: 390, height: 844, top: 44, bottom: 34 },
];

async function readLabelGeometry(page, label) {
  return page.getByRole('tab', { name: label, exact: true }).evaluate((tab, label) => {
    const text = [...tab.querySelectorAll('*')].find(el => el.textContent === label && !el.children.length);
    if (!text) throw new Error(`Missing visible text for ${label}`);
    const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const range = document.createRange(); range.selectNodeContents(text);
    const r = range.getBoundingClientRect();
    const clips = [];
    for (let el = text; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) clips.push(rect(el));
    }
    return {
      label, text: rect(text), tab: rect(tab),
      ink: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, clips,
      clientHeight: text.clientHeight, scrollHeight: text.scrollHeight,
      clientWidth: text.clientWidth, scrollWidth: text.scrollWidth,
    };
  }, label);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ url, passed: false, status: 'running', startedAt: new Date().toISOString() }, null, 2));
  const results = [];
  for (const engine of ['chromium', 'webkit']) {
    const browser = await ({ chromium, webkit })[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : {}) });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(url);
      assert.equal(response.status(), 200);
      await page.getByText('いまの貸し借り', { exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const script = await page.evaluate(() => [...document.scripts].map(s => s.src).find(src => src.includes('/_expo/')));
      for (const scenario of scenarios) {
        await page.setViewportSize({ width: scenario.width, height: scenario.height });
        await page.evaluate(({ top = 0, bottom = 0 }) => {
          const root = document.getElementById('root');
          root.style.paddingTop = `${top}px`; root.style.paddingBottom = `${bottom}px`;
        }, scenario);
        for (const selected of labels) {
          const tab = page.getByRole('tab', { name: selected, exact: true });
          await tab.click();
          await page.waitForFunction(label => document.querySelector(`[role="tab"][aria-label="${label}"]`)?.getAttribute('aria-selected') === 'true', selected);
          // Allow route transition and viewport layout to settle.
          await page.waitForTimeout(120);
          const geometry = [];
          for (const label of labels) {
            const g = await readLabelGeometry(page, label);
            const where = `${engine}/${scenario.name}/${selected}/${label}`;
            assert.ok(g.clientHeight >= g.scrollHeight, `${where}: label vertically clipped (${g.clientHeight}/${g.scrollHeight})`);
            assert.ok(g.clientWidth >= g.scrollWidth, `${where}: label horizontally clipped`);
            assert.ok(g.text.top >= g.tab.top && g.text.bottom <= g.tab.bottom + 0.5, `${where}: label outside tap target`);
            assert.ok(g.tab.height >= 44, `${where}: tap target too short`);
            assert.ok(g.text.bottom <= scenario.height - (scenario.bottom || 0), `${where}: label outside usable viewport`);
            for (const clip of g.clips) {
              assert.ok(g.ink.top >= clip.top - 0.5 && g.ink.bottom <= clip.bottom + 0.5, `${where}: text ink clipped vertically`);
              assert.ok(g.ink.left >= clip.left - 0.5 && g.ink.right <= clip.right + 0.5, `${where}: text ink clipped horizontally`);
            }
            geometry.push(g);
          }
          results.push({ engine, scenario: scenario.name, selected, script, geometry });
          if (scenario.name === 'phone') await page.screenshot({ path: path.join(output, `${engine}-${selected}.png`) });
        }
        await page.screenshot({ path: path.join(output, `${engine}-${scenario.name}-tabs.png`), clip: { x: 0, y: scenario.height - 120, width: scenario.width, height: 120 } });
      }
      assert.deepEqual(errors, [], `${engine}: unexpected browser error`);
      assert.equal(await page.evaluate(() => localStorage.getItem('kashimo_transactions')), null, 'Navigation must not create or change records');
    } finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ url, passed: true, checkedAt: new Date().toISOString(), checkedLabels: results.length * labels.length, results }, null, 2));
  console.log(`PASS: ${results.length * labels.length} label checks across Chrome/WebKit, 8 viewport layouts and all 4 selected tabs. ${output}`);
})().catch(error => {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ url, passed: false, checkedAt: new Date().toISOString(), error: String(error) }, null, 2));
  console.error(error); process.exitCode = 1;
});
