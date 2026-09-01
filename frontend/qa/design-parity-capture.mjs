import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const endpoint = process.env.QA_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const frontendOrigin = process.env.QA_FRONTEND_ORIGIN ?? "http://localhost:3000";
const mobile = process.env.QA_ADMIN_MOBILE;
const password = process.env.QA_ADMIN_PASSWORD;
const designPath = process.env.QA_DESIGN_PATH;
const outputRoot = new URL("./design-parity/", import.meta.url);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!mobile || !password || !designPath) {
  throw new Error("Admin credentials and QA_DESIGN_PATH are required.");
}

await fs.mkdir(new URL("./source/", outputRoot), { recursive: true });
await fs.mkdir(new URL("./implementation/", outputRoot), { recursive: true });

let targets;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.some((target) => target.type === "page")) break;
  } catch {}
  await delay(250);
}

const target = targets?.find((candidate) => candidate.type === "page");
if (!target) throw new Error("Chrome DevTools page target did not become ready.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let messageId = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
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

async function evaluate(expression, returnByValue = true) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
    );
  }
  return returnByValue ? result.result.value : result.result;
}

async function setViewport(width, height) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
}

async function navigate(url, wait = 2600) {
  await command("Page.navigate", { url });
  await delay(wait);
}

async function screenshot(group, name) {
  const shot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    new URL(`./${group}/${name}.png`, outputRoot),
    Buffer.from(shot.data, "base64"),
  );
}

await Promise.all([
  command("Page.enable"),
  command("Runtime.enable"),
  command("Network.enable"),
]);

const designUrl = pathToFileURL(path.resolve(designPath));
const source = (view, extra = {}) => {
  const url = new URL(designUrl);
  url.searchParams.set("view", view);
  Object.entries(extra).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.href;
};

await setViewport(1440, 1000);
await navigate(source("market"));
await screenshot("source", "01-market-desktop");
const designProductUrl = await evaluate(
  "document.querySelector('[data-product]')?.href ?? ''",
);
if (designProductUrl) {
  await navigate(designProductUrl);
  await screenshot("source", "02-product-detail");
}
await navigate(source("login"));
await screenshot("source", "03-admin-login");
await evaluate("sessionStorage.setItem('hg-demo-admin', 'yes')");
for (const [name, view] of [
  ["04-admin-dashboard", "admin-dashboard"],
  ["05-admin-products", "admin-products"],
  ["06-admin-product-form", "admin-form"],
  ["07-admin-exchange-rate", "admin-fx"],
  ["08-admin-store", "admin-store"],
  ["10-admin-change-password", "admin-password"],
]) {
  await navigate(source(view));
  await screenshot("source", name);
}
await setViewport(390, 844);
await navigate(source("market"));
await screenshot("source", "09-market-mobile");

await command("Network.clearBrowserCookies");
await setViewport(1440, 1000);
await navigate(`${frontendOrigin}/Market?lang=fa`);
await screenshot("implementation", "01-market-desktop");
const implementationProductUrl = await evaluate(
  "document.querySelector('.product-card')?.href ?? ''",
);
if (implementationProductUrl) {
  await navigate(implementationProductUrl);
  await screenshot("implementation", "02-product-detail");
}
await navigate(`${frontendOrigin}/Admin`);
await screenshot("implementation", "03-admin-login");
await evaluate(`(() => {
  const inputs = document.querySelectorAll('form input');
  if (inputs.length < 2) return;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setValue.call(inputs[0], ${JSON.stringify(mobile)});
  inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  setValue.call(inputs[1], ${JSON.stringify(password)});
  inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('form').requestSubmit();
})()`);
await delay(2200);
for (const [name, route] of [
  ["04-admin-dashboard", "/Admin/dashboard"],
  ["05-admin-products", "/Admin/products"],
  ["06-admin-product-form", "/Admin/products/new"],
  ["07-admin-exchange-rate", "/Admin/exchange-rate"],
  ["08-admin-store", "/Admin/store"],
  ["10-admin-change-password", "/Admin/change-password"],
]) {
  await navigate(`${frontendOrigin}${route}`);
  await screenshot("implementation", name);
}
await setViewport(390, 844);
await navigate(`${frontendOrigin}/Market?lang=fa`);
await screenshot("implementation", "09-market-mobile");

console.log(
  JSON.stringify(
    {
      sourceScreenshots: 10,
      implementationScreenshots: 10,
      browserErrors: [...new Set(browserErrors)],
    },
    null,
    2,
  ),
);
socket.close();
