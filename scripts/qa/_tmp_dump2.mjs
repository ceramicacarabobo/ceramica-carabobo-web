import {chromium} from 'playwright'
const url = process.argv[2]
const sel = process.argv[3]
const w = Number(process.argv[4]||390)
const h = Number(process.argv[5]||900)
const b = await chromium.launch()
const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage()
await p.goto(url, {waitUntil:'networkidle'})
await p.waitForTimeout(3200)
await p.evaluate(() => { document.documentElement.removeAttribute('data-telon'); document.querySelectorAll('#telon,[data-screen-label="Telon"]').forEach(e=>e.remove()) })
const html = await p.evaluate((s) => document.querySelector(s)?.outerHTML, sel)
console.log(html)
await b.close()
