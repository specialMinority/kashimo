const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto('https://specialminority.github.io/kashimo/',{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    await page.getByText('いまの貸し借り',{exact:true}).waitFor();
    const result=await page.evaluate(async()=>({
      title:document.title,
      manifest:await fetch('./manifest.webmanifest').then(r=>r.json()),
      script:[...document.scripts].map(s=>s.src).find(s=>s.includes('/_expo/')),
      images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),
    }));
    assert.equal(result.manifest.display,'standalone'); assert.equal(result.images,true);
    await page.getByRole('tab',{name:'記録',exact:true}).click();
    await page.getByText('お金の記録',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    fs.mkdirSync('test-results',{recursive:true});
    fs.writeFileSync('test-results/live-smoke.json',JSON.stringify({passed:true,...result},null,2));
    console.log(JSON.stringify({passed:true,...result},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
