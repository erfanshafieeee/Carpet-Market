import fs from "node:fs/promises";

const endpoint = process.env.QA_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const origin = process.env.QA_FRONTEND_ORIGIN ?? "http://localhost:3000";
const mobile = process.env.QA_ADMIN_MOBILE;
const password = process.env.QA_ADMIN_PASSWORD;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
if (!mobile || !password) throw new Error("QA_ADMIN_MOBILE and QA_ADMIN_PASSWORD are required.");

let targets;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try { targets = await fetch(`${endpoint}/json/list`).then((response) => response.json()); if (targets.some((item) => item.type === "page")) break; } catch {}
  await delay(250);
}
const target = targets?.find((item) => item.type === "page");
if (!target) throw new Error("Chrome DevTools endpoint is unavailable.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(new Error(message.error.message)); else promise.resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error" && !message.params.entry.url?.includes("favicon") && !message.params.entry.text.includes("/_next/hmr")) errors.push(`${message.params.entry.text} ${message.params.entry.url || ""}`.trim());
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => { const messageId = ++id; socket.send(JSON.stringify({ id: messageId, method, params })); return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject })); };
const evaluate = async (expression) => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
const navigate = async (url) => { await command("Page.navigate", { url }); await delay(1800); };
const screenshot = async (name) => { const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from(shot.data, "base64")); };

await Promise.all([command("Page.enable"), command("Runtime.enable"), command("Log.enable"), command("Network.enable")]);
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await command("Network.clearBrowserCookies");
await navigate(`${origin}/Admin`);
await evaluate(`(() => { const inputs=document.querySelectorAll('form input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(inputs[0],${JSON.stringify(mobile)}); inputs[0].dispatchEvent(new Event('input',{bubbles:true})); setter.call(inputs[1],${JSON.stringify(password)}); inputs[1].dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('form').requestSubmit(); })()`);
await delay(3000);
await navigate(`${origin}/Admin/requests`);
const checks = {};
checks.listRows = await evaluate("document.querySelectorAll('.requests-table tbody tr .table-product').length");
checks.stats = await evaluate("document.querySelectorAll('.request-mini-stats > div').length");
checks.toolbarFilters = await evaluate("document.querySelectorAll('.request-toolbar select').length");
checks.rangeDefault = await evaluate("document.querySelector('#request-range')?.value");
checks.rangeOptions = await evaluate("[...document.querySelectorAll('#request-range option')].map((option) => option.value)");
await evaluate("(() => { const select=document.querySelector('#request-range'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,'custom'); select.dispatchEvent(new Event('change',{bubbles:true})); })()");
await delay(500);
checks.customRangeVisible = await evaluate("Boolean(document.querySelector('.request-date-filter .jalali-range'))");
await screenshot("implementation-v2-admin-requests");
await evaluate("document.querySelector('.requests-table .table-product')?.click()");
await delay(3000);
checks.detailLoaded = await evaluate("Boolean(document.querySelector('.request-detail-grid'))");
checks.galleryImages = await evaluate("document.querySelectorAll('.request-thumbs button').length");
checks.statusOptions = await evaluate("document.querySelectorAll('.request-status-action option').length");
checks.historyItems = await evaluate("document.querySelectorAll('.request-history li').length");
await screenshot("implementation-v2-admin-request-detail");
await navigate(`${origin}/Admin/dashboard`);
checks.dashboardTabs = await evaluate("document.querySelectorAll('[role=tab]').length");
checks.overviewMetrics = await evaluate("document.querySelectorAll('#dashboard-overview .metric-card').length");
await screenshot("implementation-v2-dashboard-overview");
await evaluate("document.querySelectorAll('[role=tab]')[1]?.click()");
await delay(1200);
checks.sellAnalytics = await evaluate("Boolean(document.querySelector('.sell-dashboard-section'))");
checks.sellAnalyticsPanels = await evaluate("document.querySelectorAll('.sell-insights-grid .admin-panel').length");
checks.analyticsContainsPii = await evaluate("/09\\d{9}/.test(document.querySelector('#dashboard-insights')?.innerText || '')");
await evaluate("document.querySelector('.sell-dashboard-section')?.scrollIntoView({block:'start'})");
await delay(500);
await screenshot("implementation-v2-dashboard-insights");
checks.errors = [...new Set(errors)];
checks.passed = checks.listRows > 0 && checks.stats === 3 && checks.toolbarFilters === 2 && checks.rangeDefault === "all" && JSON.stringify(checks.rangeOptions) === JSON.stringify(["all", "7", "30", "90", "custom"]) && checks.customRangeVisible && checks.detailLoaded && checks.galleryImages > 0 && checks.statusOptions === 4 && checks.historyItems > 0 && checks.dashboardTabs === 2 && checks.overviewMetrics === 4 && checks.sellAnalytics && checks.sellAnalyticsPanels === 6 && !checks.analyticsContainsPii && checks.errors.length === 0;
console.log(JSON.stringify(checks, null, 2));
socket.close();
