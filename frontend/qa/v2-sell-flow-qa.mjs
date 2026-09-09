import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const endpoint = process.env.QA_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const origin = process.env.QA_FRONTEND_ORIGIN ?? "http://localhost:3000";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = new URL("./v2-sell-flow/", import.meta.url);
await fs.mkdir(output, { recursive: true });

let targets;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.some((item) => item.type === "page")) break;
  } catch {}
  await delay(250);
}
const target = targets?.find((item) => item.type === "page");
if (!target) throw new Error("Chrome DevTools endpoint is unavailable.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let id = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const promise = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(message.error.message));
    else promise.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error" && !message.params.entry.url?.includes("favicon") && !message.params.entry.text.includes("/_next/hmr")) browserErrors.push(`${message.params.entry.text} ${message.params.entry.url || ""}`.trim());
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

const command = (method, params = {}) => {
  const messageId = ++id;
  socket.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
};
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const navigate = async (url, wait = 1500) => { await command("Page.navigate", { url }); await delay(wait); };
const screenshot = async (name) => {
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(new URL(`${name}.png`, output), Buffer.from(shot.data, "base64"));
};

await Promise.all([command("Page.enable"), command("Runtime.enable"), command("Log.enable"), command("DOM.enable")]);
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, screenWidth: 1440, screenHeight: 1000, deviceScaleFactor: 1, mobile: false });

const designPath = decodeURIComponent(path.resolve(new URL("../../PRD&DESIGN/V2/Design-v2.html", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1")));
const designUrl = (view, code) => {
  const url = new URL(pathToFileURL(designPath));
  url.searchParams.set("view", view);
  url.searchParams.set("lang", "fa");
  if (code) url.searchParams.set("code", code);
  return url.href;
};

await navigate(designUrl("sell"));
await screenshot("source-step-1");
await navigate(`${origin}/Market/sell?lang=fa&step=1`);
await screenshot("implementation-step-1");
const progressMetrics = JSON.parse(await evaluate("JSON.stringify((() => { const rail=document.querySelector('.sell-summary'); const brand=document.querySelector('.sell-summary-brand'); const item=document.querySelector('.sell-progress li'); const circle=document.querySelector('.sell-progress li > span'); return {railWidth:Math.round(rail?.getBoundingClientRect().width||0),brandGap:parseFloat(getComputedStyle(brand).gap),itemGap:parseFloat(getComputedStyle(item).gap),circleWidth:Math.round(circle?.getBoundingClientRect().width||0)}; })())"));

await evaluate("document.querySelector('input[name=rug_type]')?.click()");
await delay(300);
const documentNode = await command("DOM.getDocument", { depth: -1 });
const inputNode = await command("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: '.sell-upload input[type=file]' });
const fixture = path.resolve(new URL("../public/images/brand-mark.png", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
await command("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [fixture] });
await delay(500);
const immediatePreview = JSON.parse(await evaluate("JSON.stringify((() => { const image=document.querySelector('.sell-photo-list img'); return {count:document.querySelectorAll('.sell-photo-list img').length,src:image?.getAttribute('src')||'',complete:Boolean(image?.complete),naturalWidth:image?.naturalWidth||0}; })())"));
await screenshot("implementation-upload-immediate");

const radioChecked = await evaluate("Boolean(document.querySelector('input[name=rug_type]')?.checked)");
await evaluate("document.querySelector('.sell-actions .button-primary')?.click()");
await delay(1500);
const stepAfterSubmit = await evaluate("new URL(location.href).searchParams.get('step')");
const reachedStepTwo = stepAfterSubmit === "2";
await evaluate("document.querySelector('.sell-actions .button:not(.button-primary)')?.click()");
await delay(900);
const previewAfterBack = JSON.parse(await evaluate("JSON.stringify((() => { const image=document.querySelector('.sell-photo-list img'); return {count:document.querySelectorAll('.sell-photo-list img').length,complete:Boolean(image?.complete),naturalWidth:image?.naturalWidth||0}; })())"));

await navigate(designUrl("sell-success", "SELL-2J6V8S"));
await screenshot("source-success");
await navigate(`${origin}/Market/sell/success?lang=fa&code=SELL-2J6V8S`);
await screenshot("implementation-success");
const successMetrics = JSON.parse(await evaluate("JSON.stringify((() => { const main=document.querySelector('.sell-success'); const logo=document.querySelector('.success-emblem img'); const check=document.querySelector('.success-icon'); const title=document.querySelector('.sell-success h1'); const tracking=document.querySelector('.tracking-card'); return {mainWidth:Math.round(main?.getBoundingClientRect().width||0),logoWidth:Math.round(logo?.getBoundingClientRect().width||0),checkWidth:Math.round(check?.getBoundingClientRect().width||0),titleColor:getComputedStyle(title).color,trackingBackground:getComputedStyle(tracking).backgroundColor,buttons:document.querySelectorAll('.success-actions .button').length,notice:Boolean(document.querySelector('.success-notice'))}; })())"));

const compare = new URL("compare.html", output);
await fs.writeFile(compare, "<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box}html,body{margin:0;background:#222;overflow:hidden}.pair{display:flex;width:100vw;height:100vh}.pair img{width:50%;height:100%;object-fit:fill}</style><div class=pair><img id=source><img id=implementation></div><script>const n=new URLSearchParams(location.search).get('n');source.src='./source-'+n+'.png';implementation.src='./implementation-'+n+'.png';<\/script>");
await command("Emulation.setDeviceMetricsOverride", { width: 2880, height: 1000, screenWidth: 2880, screenHeight: 1000, deviceScaleFactor: 1, mobile: false });
for (const name of ["step-1", "success"]) {
  const url = new URL(compare);
  url.searchParams.set("n", name);
  await navigate(url.href, 300);
  await screenshot(`comparison-${name}`);
}

const checks = {
  immediatePreview,
  progressMetrics,
  radioChecked,
  stepAfterSubmit,
  reachedStepTwo,
  previewAfterBack,
  successMetrics,
  browserErrors: [...new Set(browserErrors)],
};
checks.passed = immediatePreview.count === 1 && immediatePreview.src.startsWith("blob:") && immediatePreview.complete && immediatePreview.naturalWidth > 0 && progressMetrics.railWidth === 265 && progressMetrics.brandGap === 11 && progressMetrics.itemGap === 12 && progressMetrics.circleWidth === 31 && radioChecked && reachedStepTwo && previewAfterBack.count === 1 && previewAfterBack.complete && previewAfterBack.naturalWidth > 0 && successMetrics.logoWidth === 145 && successMetrics.checkWidth === 48 && successMetrics.titleColor === "rgb(41, 29, 25)" && successMetrics.trackingBackground === "rgb(238, 224, 206)" && successMetrics.buttons === 2 && successMetrics.notice && checks.browserErrors.length === 0;
console.log(JSON.stringify(checks, null, 2));
socket.close();
if (!checks.passed) process.exitCode = 1;
