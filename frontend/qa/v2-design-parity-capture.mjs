import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const endpoint = "http://127.0.0.1:9333";
const origin = "http://localhost:3000";
const designPath = process.env.QA_DESIGN_PATH;
const mobile = process.env.QA_ADMIN_MOBILE;
const password = process.env.QA_ADMIN_PASSWORD;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
if (!designPath || !mobile || !password) throw new Error("QA_DESIGN_PATH and admin credentials are required.");
const root = new URL("./v2-design-parity/", import.meta.url);
for (const folder of ["source", "implementation", "comparison"]) await fs.mkdir(new URL(`./${folder}/`, root), { recursive: true });

let targets;
for (let i = 0; i < 40; i += 1) { try { targets = await fetch(`${endpoint}/json/list`).then((r) => r.json()); if (targets.some((x) => x.type === "page")) break; } catch {} await delay(250); }
const target = targets?.find((x) => x.type === "page");
if (!target) throw new Error("Chrome CDP unavailable.");
const socket = new WebSocket(target.webSocketDebuggerUrl); const pending = new Map(); const errors = []; let messageId = 0;
socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(new Error(message.error.message)); else promise.resolve(message.result); } if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text); if (message.method === "Log.entryAdded" && message.params.entry.level === "error" && !message.params.entry.text.includes("/_next/hmr") && !message.params.entry.url?.includes("favicon")) errors.push(`${message.params.entry.text} ${message.params.entry.url || ""}`.trim()); });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => { const id = ++messageId; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
const evaluate = async (expression) => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
const viewport = (width, height) => command("Emulation.setDeviceMetricsOverride", { width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: 1, mobile: false });
const navigate = async (url, wait = 1500) => { await command("Page.navigate", { url }); await delay(wait); };
const shot = async (group, name) => { const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(new URL(`./${group}/${name}.png`, root), Buffer.from(result.data, "base64")); };
await Promise.all([command("Page.enable"), command("Runtime.enable"), command("Log.enable"), command("Network.enable")]);
const designFile = pathToFileURL(path.resolve(designPath));
const source = (view, extra = {}) => { const url = new URL(designFile); url.searchParams.set("view", view); url.searchParams.set("lang", "fa"); Object.entries(extra).forEach(([key, value]) => url.searchParams.set(key, value)); return url.href; };

await viewport(1440, 1000);
await navigate(source("market")); await shot("source", "01-market");
const sourceProduct = await evaluate("document.querySelector('[data-product]')?.href || ''"); if (sourceProduct) { await navigate(sourceProduct); await shot("source", "02-product-detail"); }
await navigate(source("sell")); await shot("source", "03-sell-step-1");
await evaluate("document.querySelector('input[name=type][value=handmade]')?.click(); document.querySelector('[data-action=sell-sample-image]')?.click(); document.querySelector('#sell-form')?.requestSubmit()"); await delay(900); await shot("source", "04-sell-step-2");
await evaluate(`(() => { const phone=document.querySelector('#sell-phone'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; if(phone){setter.call(phone,'09121234567');phone.dispatchEvent(new Event('input',{bubbles:true}));} const province=document.querySelector('#sell-province'); if(province){province.value='tehran';province.dispatchEvent(new Event('change',{bubbles:true}));} document.querySelector('#sell-form')?.requestSubmit(); })()`); await delay(900); await shot("source", "05-sell-step-3");
await navigate(source("sell-success", { code: "SELL-2J6V8S" })); await shot("source", "06-sell-success");
await navigate(source("login")); await shot("source", "07-admin-login");
await evaluate("sessionStorage.setItem('hg-demo-admin','yes')");
await navigate(source("admin-dashboard")); await shot("source", "08-dashboard-overview"); await evaluate("document.querySelectorAll('[role=tab]')[1]?.click()"); await delay(500); await shot("source", "09-dashboard-insights");
await navigate(source("admin-requests")); await shot("source", "10-admin-requests"); const sourceRequest = await evaluate("document.querySelector('.requests-table .table-product')?.href || ''"); if (sourceRequest) { await navigate(sourceRequest); await shot("source", "11-admin-request-detail"); }
await navigate(source("admin-products")); await shot("source", "12-admin-products"); await navigate(source("admin-form")); await shot("source", "13-admin-product-form");
await viewport(390, 844); await navigate(source("market")); await shot("source", "14-market-mobile"); await navigate(source("sell")); await shot("source", "15-sell-mobile");

await command("Network.clearBrowserCookies"); await viewport(1440, 1000);
await navigate(`${origin}/Market?lang=fa`); await shot("implementation", "01-market"); const productHref = await evaluate("document.querySelector('.product-card')?.href || ''"); if (productHref) { await navigate(productHref); await shot("implementation", "02-product-detail"); }
for (const [name, url] of [["03-sell-step-1", `${origin}/Market/sell?lang=fa&step=1`], ["04-sell-step-2", `${origin}/Market/sell?lang=fa&step=2`], ["05-sell-step-3", `${origin}/Market/sell?lang=fa&step=3`], ["06-sell-success", `${origin}/Market/sell/success?lang=fa&code=SELL-2J6V8S`]]) { await navigate(url); if (name === "04-sell-step-2" || name === "05-sell-step-3") { await evaluate("document.querySelector('.sell-workspace')?.scrollIntoView({block:'start'})"); await delay(250); } await shot("implementation", name); }
await navigate(`${origin}/Admin`); await shot("implementation", "07-admin-login"); await evaluate(`(() => { const inputs=document.querySelectorAll('form input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(inputs[0],${JSON.stringify(mobile)}); inputs[0].dispatchEvent(new Event('input',{bubbles:true})); setter.call(inputs[1],${JSON.stringify(password)}); inputs[1].dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('form').requestSubmit(); })()`); await delay(1800);
await navigate(`${origin}/Admin/dashboard`); await shot("implementation", "08-dashboard-overview"); await evaluate("document.querySelectorAll('[role=tab]')[1]?.click()"); await delay(500); await shot("implementation", "09-dashboard-insights");
await navigate(`${origin}/Admin/requests`); await shot("implementation", "10-admin-requests"); const requestHref = await evaluate("document.querySelector('.requests-table .table-product')?.href || ''"); if (requestHref) { await navigate(requestHref); await shot("implementation", "11-admin-request-detail"); }
await navigate(`${origin}/Admin/products`); await shot("implementation", "12-admin-products"); await navigate(`${origin}/Admin/products/new`); await shot("implementation", "13-admin-product-form");
await viewport(390, 844); await navigate(`${origin}/Market?lang=fa`); await shot("implementation", "14-market-mobile"); await navigate(`${origin}/Market/sell?lang=fa&step=1`); const mobileLayout = JSON.parse(await evaluate("JSON.stringify({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,hero:[document.querySelector('.sell-hero')?.offsetWidth,document.querySelector('.sell-hero')?.scrollWidth,getComputedStyle(document.querySelector('.sell-hero')).gridTemplateColumns],workspace:[document.querySelector('.sell-workspace')?.offsetWidth,document.querySelector('.sell-workspace')?.scrollWidth,getComputedStyle(document.querySelector('.sell-workspace')).display],overflow:[...document.querySelectorAll('body *')].filter((element)=>element.getBoundingClientRect().right>innerWidth+1||element.getBoundingClientRect().left< -1).slice(0,12).map((element)=>[element.tagName,element.className,Math.round(element.getBoundingClientRect().left),Math.round(element.getBoundingClientRect().right),element.scrollWidth])})")); await shot("implementation", "15-sell-mobile");

const fixture = new URL("./v2-design-parity/compare.html", import.meta.url); const names = ["01-market","02-product-detail","03-sell-step-1","04-sell-step-2","05-sell-step-3","06-sell-success","07-admin-login","08-dashboard-overview","09-dashboard-insights","10-admin-requests","11-admin-request-detail","12-admin-products","13-admin-product-form","14-market-mobile","15-sell-mobile"];
await fs.writeFile(fixture, `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#222;overflow:hidden}.pair{display:flex;width:100vw;height:100vh}.pair img{width:50%;height:100%;object-fit:fill}</style><div class="pair"><img id="source"><img id="implementation"></div><script>const n=new URLSearchParams(location.search).get('n');source.src='./source/'+n+'.png';implementation.src='./implementation/'+n+'.png';<\/script>`);
for (const name of names) { const mobileScreen = name.startsWith("14-") || name.startsWith("15-"); await viewport(mobileScreen ? 780 : 2880, mobileScreen ? 844 : 1000); const url = new URL(fixture); url.searchParams.set("n", name); await navigate(url.href, 300); await shot("comparison", name); }
console.log(JSON.stringify({ sourceScreenshots: names.length, implementationScreenshots: names.length, comparisons: names.length, mobileLayout, browserErrors: [...new Set(errors)] }, null, 2)); socket.close();
