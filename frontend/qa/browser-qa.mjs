import fs from "node:fs/promises";

const endpoint = "http://127.0.0.1:9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let targets;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.length) break;
  } catch { /* Chrome is still starting. */ }
  await delay(250);
}
if (!targets?.length) throw new Error("Chrome DevTools endpoint did not become ready.");

const socket = new WebSocket(targets[0].webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;
const errors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(`${message.params.entry.text} ${message.params.entry.url ?? ""}`.trim());
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function navigate(url) {
  await command("Page.navigate", { url });
  await delay(1800);
}

await Promise.all([command("Page.enable"), command("Runtime.enable"), command("Log.enable")]);
const checks = {};

await navigate("http://127.0.0.1:3000/Market?lang=fa");
checks.marketCards = await evaluate("document.querySelectorAll('.product-card').length");
checks.marketHasImages = await evaluate("[...document.querySelectorAll('.product-card img')].every(img => img.complete && img.naturalWidth > 0)");
await evaluate("document.querySelector('.product-card')?.click()");
await delay(1800);
checks.detailLoaded = await evaluate("Boolean(document.querySelector('.detail-copy h1'))");
await evaluate("document.querySelector('.contact-button')?.click()");
checks.contactModal = await evaluate("Boolean(document.querySelector('[role=dialog] .contact-phone'))");

await navigate("http://127.0.0.1:3000/Admin");
const loginState = await evaluate("({ path: location.pathname, inputs: document.querySelectorAll('form input').length })");
if (loginState.path === "/Admin" && loginState.inputs >= 2) {
  await evaluate(`(() => {
    const inputs = document.querySelectorAll('form input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(inputs[0], '09120000000'); inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    set.call(inputs[1], 'Demo1234!'); inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form').requestSubmit();
  })()`);
  await delay(2200);
}
checks.adminAuthenticated = await evaluate("location.pathname === '/Admin/dashboard'");
checks.dashboardMetrics = await evaluate("document.querySelectorAll('.metric-card').length");
const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await fs.writeFile(new URL("./implementation-admin-dashboard.png", import.meta.url), Buffer.from(screenshot.data, "base64"));

await navigate("http://127.0.0.1:3000/Admin/products");
checks.adminProducts = await evaluate("document.querySelectorAll('.products-table tbody tr').length");

await navigate("http://127.0.0.1:8010/Heritage-Gallery%20(1).html");
await evaluate("sessionStorage.setItem('hg-demo-admin', 'yes'); location.href = '?view=admin-dashboard&lang=fa'");
await delay(1800);
checks.sourceDashboard = await evaluate("Boolean(document.querySelector('.stats-grid'))");
const sourceDashboardScreenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await fs.writeFile(new URL("./source-admin-dashboard.png", import.meta.url), Buffer.from(sourceDashboardScreenshot.data, "base64"));
checks.errors = [...new Set(errors)].filter((error) => !error.includes("favicon.ico"));
checks.passed = checks.marketCards > 0 && checks.marketHasImages && checks.detailLoaded && checks.contactModal && checks.adminAuthenticated && checks.dashboardMetrics === 4 && checks.adminProducts > 0 && checks.sourceDashboard && checks.errors.length === 0;

console.log(JSON.stringify(checks, null, 2));
socket.close();
