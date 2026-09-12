const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.KASHIMO_TEST_URL || 'http://localhost:4173/kashimo/';
const key = 'kashimo_transactions';
const dateKey = offset => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const record = (id, extra = {}) => ({ id, userId: 'local-user', counterparty: id, amount: 1000, type: 'lent', status: 'pending', reminders: [], createdAt: new Date().toISOString(), ...extra });
const fixtures = [
    record('a', { counterparty: 'ゆい', amount: 12000, dueDate: dateKey(1), memo: '旅行のチケット' }),
    record('b', { counterparty: '佐藤', amount: 3800, type: 'borrowed', dueDate: dateKey(3), memo: 'ランチ代' }),
    record('c', { counterparty: '田中', amount: 2400, status: 'completed', dueDate: dateKey(-4), memo: 'カフェ' }),
    record('d', { counterparty: '七海', amount: 5000, memo: 'プレゼント' }),
];
const waitFor = async (check, message) => {
    for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(r => setTimeout(r, 100)); }
    throw new Error(message);
};
(async () => {
    fs.mkdirSync('test-results', { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: process.env.KASHIMO_BROWSER_CHANNEL || 'chrome' });
    const results = [];
    const logResult = message => { results.push(message); console.log('PASS: ' + message); };
    const errors = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const records = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), key);
    const seed = async data => {
        await page.goto(base);
        await page.evaluate(({key,data}) => localStorage.setItem(key, JSON.stringify(data)), {key,data});
        await page.reload();
        await page.getByText('いまの貸し借り', { exact: true }).waitFor();
    };
    const tab = name => ['貸した','借りた','すべて'].includes(name) ? page.getByRole('tab', {name, exact: true}).click() : page.getByText(name, {exact: true}).last().click();
    const selectMode = () => page.getByRole('button', { name: '選択', exact: true }).click();
    const selectAll = () => page.getByRole('checkbox', { name: '表示中の取引をすべて選択' }).click();
    const deleteButton = () => page.getByRole('button', { name: '選択した取引を削除', exact: true });
    try {
        await seed(fixtures);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.waitForTimeout(350); await page.screenshot({ path: 'docs/home-mobile.png' });
        await tab('記録');
        await page.getByText('お金の記録', { exact: true }).waitFor();
        await page.waitForTimeout(350); await page.screenshot({ path: 'docs/list-mobile.png' });
        await selectMode();
        assert.equal(await deleteButton().isDisabled(), true);
        await selectAll();
        await deleteButton().click();
        await page.getByText('4件の取引を削除しますか？', {exact:true}).waitFor();
        await page.waitForTimeout(350); await page.screenshot({path:'docs/bulk-delete-mobile.png'});
        await page.getByRole('button', { name: 'キャンセル', exact:true }).last().click();
        assert.equal((await records()).length, 4);
        logResult('Bulk confirmation cancellation preserves all records');
        await tab('貸した');
        assert.equal(await deleteButton().isDisabled(), true);
        await selectAll();
        await page.getByRole('checkbox', {name:'田中の取引を選択',exact:true}).click();
        await deleteButton().click();
        await page.getByRole('button',{name:'2件を削除',exact:true}).click();
        await page.getByText('2件の取引を削除しました',{exact:true}).waitFor();
        assert.deepEqual((await records()).map(t=>t.id).sort(),['b','c']);
        logResult('Filtered selection deletes only selected IDs, preserving hidden and deselected records');
        await page.reload();
        await page.getByText('いまの貸し借り',{exact:true}).waitFor();
        assert.equal(await page.getByText('¥0',{exact:true}).count(),1);
        assert.equal(await page.getByText('¥3,800',{exact:true}).count()>=1,true);
        logResult('Reload preserves deletion and dashboard totals update');
        await tab('記録'); await selectMode(); await selectAll(); await deleteButton().click();
        await page.getByRole('button',{name:'2件を削除',exact:true}).click();
        await page.getByText('記録はまだありません',{exact:true}).waitFor();
        assert.equal((await records()).length,0);
        await page.reload(); await page.getByText('いまの貸し借り',{exact:true}).waitFor();
        assert.equal((await records()).length,0);
        logResult('Delete-all empty state persists after restart');

        await seed(fixtures);
        await tab('記録'); await selectMode();
        await page.getByRole('checkbox',{name:'ゆいの取引を選択',exact:true}).click();
        await page.evaluate(() => {
            window.__originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(k,v) { if(k === 'kashimo_transactions') throw new DOMException('Denied','QuotaExceededError'); return window.__originalSetItem.call(this,k,v); };
        });
        await deleteButton().click(); await page.getByRole('button',{name:'1件を削除',exact:true}).click();
        await page.getByText('削除できませんでした',{exact:true}).waitFor();
        assert.equal((await records()).length,4);
        await page.getByRole('button',{name:'確認',exact:true}).click();
        await page.getByText('削除できませんでした',{exact:true}).waitFor({state:'hidden'});
        assert.equal(await page.getByRole('checkbox',{name:'ゆいの取引を選択'}).isChecked(),true);
        await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
        await deleteButton().click(); await page.getByRole('button',{name:'1件を削除',exact:true}).click();
        await page.getByText('1件の取引を削除しました',{exact:true}).waitFor();
        logResult('Storage error preserves data and selection; retry succeeds');

        await seed([]);
        await tab('追加');
        await page.getByRole('textbox',{name:'相手の名前',exact:true}).fill('テスト友だち');
        await page.getByRole('textbox',{name:'金額',exact:true}).fill('2500');
        await page.getByRole('textbox',{name:'メモ',exact:true}).fill('端末内のテスト');
        await page.waitForTimeout(350); await page.screenshot({path:'docs/add-mobile.png'});
        await page.getByRole('button',{name:'登録する',exact:true}).click();
        await page.getByRole('button',{name:'確認',exact:true}).click();
        await page.getByText('お金の記録',{exact:true}).waitFor();
        assert.equal((await records())[0].amount,2500);
        await page.getByRole('button',{name:/テスト友だち.*詳細を開く/}).click();
        await page.getByRole('button',{name:/編集/}).click();
        await page.getByRole('textbox',{name:'金額',exact:true}).fill('1500');
        await page.getByRole('button',{name:/保存する|変更を保存/}).click();
        await page.getByRole('button',{name:'確認',exact:true}).click();
        await page.getByText('+¥1,500',{exact:true}).waitFor();
        assert.equal((await records())[0].amount,1500);
        logResult('Existing create/edit flow works and returning detail refreshes immediately');

        await page.getByRole('button',{name:'精算完了',exact:true}).click();
        await page.getByRole('button',{name:'完了にする',exact:true}).click();
        await page.getByText('お金の記録',{exact:true}).waitFor();
        assert.equal((await records())[0].status,'completed');
        await page.getByRole('button',{name:/テスト友だち.*詳細を開く/}).click();
        await page.getByRole('button',{name:'精算を取り消す',exact:true}).click();
        await page.getByRole('button',{name:'戻す',exact:true}).click();
        await page.getByText('お金の記録',{exact:true}).waitFor();
        assert.equal((await records())[0].status,'pending');
        logResult('Existing completion and undo preserve the record and amount');

        await tab('設定');
        page.on('dialog', dialog => dialog.accept());
        const downloadPending=page.waitForEvent('download');
        await page.getByRole('button',{name:'ファイルにエクスポート (.json)',exact:true}).click();
        const download=await downloadPending;
        const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
        assert.equal(backup.version,1);
        assert.equal(backup.transactions[0].amount,1500);
        await page.evaluate(k=>localStorage.setItem(k,'[]'),key);
        const chooserPending=page.waitForEvent('filechooser');
        await page.getByRole('button',{name:'ファイルからインポート',exact:true}).click();
        const chooser=await chooserPending;
        await chooser.setFiles({name:'kashimo-test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
        await waitFor(async()=>(await records()).length===1,'Backup was not restored');
        await page.getByText('いまの貸し借り',{exact:true}).waitFor();
        assert.equal((await records())[0].amount,1500);
        logResult('Existing JSON export and restore round trip preserves records');

        await page.goto(base); await page.getByText('いまの貸し借り',{exact:true}).waitFor();
        await page.evaluate(() => navigator.serviceWorker.ready.then(()=>true));
        await waitFor(() => page.evaluate(() => !!navigator.serviceWorker.controller),'Service worker did not take control');
        const manifest = await page.evaluate(async () => {
            const href=document.querySelector('link[rel=manifest]').href;
            return (await fetch(href)).json();
        });
        assert.equal(manifest.display,'standalone');
        assert.equal(manifest.icons.length,2);
        const iconStatuses = await page.evaluate(async () => {
            const icons=[...document.images]; return icons.every(img=>img.complete && img.naturalWidth>0);
        });
        assert.equal(iconStatuses,true);
        await context.setOffline(true);
        await page.reload();
        await page.getByText('いまの貸し借り',{exact:true}).waitFor();
        await tab('記録');
        await page.getByText('テスト友だち',{exact:true}).waitFor();
        await context.setOffline(false);
        logResult('PWA manifest, local icons and offline cold reload retain records');

        await seed(fixtures);
        await context.close();
        for(const width of [320,768,1440]) {
            const c = await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
            const p = await c.newPage();
            p.on('pageerror',error=>errors.push(error.message));
            await p.goto(base); await p.getByText('いまの貸し借り',{exact:true}).waitFor();
            assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,'Horizontal overflow at '+width);
            await p.waitForTimeout(350); await p.screenshot({path:'docs/home-'+width+'.png'});
            await p.getByText('設定',{exact:true}).last().click();
            await p.getByText('あなたらしく、使おう。',{exact:true}).waitFor();
            assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
            await c.close();
        }
        logResult('320/390/768/1440 pixel layouts and settings render without horizontal overflow');
        assert.deepEqual(errors,[]);
        logResult('No uncaught browser runtime errors');
        fs.writeFileSync('test-results/e2e.json',JSON.stringify({passed:true,results},null,2));
        console.log(JSON.stringify({passed:true,results},null,2));
    } catch (error) {
        console.error(error);
        if(!page.isClosed()) {
            console.log((await page.locator('body').innerText()).slice(-3500));
            await page.waitForTimeout(350); await page.screenshot({path:'test-results/failure.png',fullPage:true});
        }
        fs.writeFileSync('test-results/e2e.json',JSON.stringify({passed:false,results,error:String(error),browserErrors:errors},null,2));
        process.exitCode=1;
    } finally { await browser.close(); }
})();

