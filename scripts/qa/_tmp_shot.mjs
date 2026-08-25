import {chromium} from 'playwright'
const [,, url, sel, w, h, out] = process.argv
const b = await chromium.launch()
const p = await (await b.newContext({viewport:{width:+w,height:+h}})).newPage()
await p.goto(url, {waitUntil:'networkidle'})
await p.evaluate(() => { document.documentElement.removeAttribute('data-telon'); document.querySelector('#telon')?.remove() })
await p.evaluate(async () => {
  const paso = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += paso) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,200)) }
})
const el = p.locator(sel).first()
await el.scrollIntoViewIfNeeded()
await p.waitForTimeout(600)
await el.screenshot({path: out})
await b.close()
