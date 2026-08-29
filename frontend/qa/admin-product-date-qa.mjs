import fs from "node:fs/promises";

const endpoint = process.env.QA_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const frontendOrigin = process.env.QA_FRONTEND_ORIGIN ?? "http://localhost:3000";
const mobile = process.env.QA_ADMIN_MOBILE;
const password = process.env.QA_ADMIN_PASSWORD;
const firstImage = process.env.QA_FIRST_IMAGE;
const secondImage = process.env.QA_SECOND_IMAGE;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!mobile || !password || !firstImage || !secondImage) throw new Error("Admin credentials and two QA image paths are required.");

let targets;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.some((target) => target.type === "page")) break;
  } catch {
    // Chrome is still starting.
  }
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
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") browserErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
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
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return returnByValue ? result.result.value : result.result;
}

async function navigate(path) {
  await command("Page.navigate", { url: `${frontendOrigin}${path}` });
  await delay(1800);
}

async function selectFile(path) {
  const input = await evaluate("document.querySelector('input[type=file]')", false);
  if (!input.objectId) throw new Error("Product image input was not found.");
  const node = await command("DOM.describeNode", { objectId: input.objectId });
  await command("DOM.setFileInputFiles", { files: [path], backendNodeId: node.node.backendNodeId });
  await delay(500);
}

await Promise.all([command("Page.enable"), command("Runtime.enable"), command("DOM.enable")]);
await command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

await navigate("/Admin");
await evaluate(`(() => {
  const inputs = document.querySelectorAll('form input');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setValue.call(inputs[0], ${JSON.stringify(mobile)}); inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  setValue.call(inputs[1], ${JSON.stringify(password)}); inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('form').requestSubmit();
})()`);
await delay(2200);

await navigate("/Admin/products/new");
await selectFile(firstImage);
const previewsAfterFirst = await evaluate("document.querySelectorAll('.image-previews > div').length");
await selectFile(secondImage);
const previewsAfterSecond = await evaluate("document.querySelectorAll('.image-previews > div').length");
await evaluate("document.querySelectorAll('.image-previews > div')[1]?.querySelector('.cover-action')?.click()");
const pendingCoverCount = await evaluate("document.querySelectorAll('.image-previews > .pending-cover').length");
const secondPreviewIsCover = await evaluate("document.querySelectorAll('.image-previews > div')[1]?.classList.contains('pending-cover') ?? false");

await navigate("/Admin/dashboard");
await evaluate(`(() => {
  const select = document.querySelector('.dashboard-range select');
  const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setValue.call(select, 'custom');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await delay(500);
await evaluate("document.querySelector('.jalali-field')?.click()");
await delay(500);
const calendarDays = await evaluate("document.querySelectorAll('.jalali-day').length");
const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await fs.writeFile(new URL("./implementation-jalali-date-picker.png", import.meta.url), Buffer.from(screenshot.data, "base64"));

await evaluate("document.querySelectorAll('.jalali-day:not(.outside)')[8]?.click()");
await delay(300);
await evaluate("document.querySelectorAll('.jalali-day:not(.outside)')[16]?.click()");
await delay(500);
const selectedDateFields = await evaluate("document.querySelectorAll('.jalali-field.has-value').length");

const result = {
  previewsAfterFirst,
  previewsAfterSecond,
  pendingCoverCount,
  secondPreviewIsCover,
  calendarDays,
  selectedDateFields,
  browserErrors: [...new Set(browserErrors)].filter((error) => !error.includes("favicon.ico"))
};
result.passed = result.previewsAfterFirst === 1
  && result.previewsAfterSecond === 2
  && result.pendingCoverCount === 1
  && result.secondPreviewIsCover
  && result.calendarDays === 42
  && result.selectedDateFields === 2
  && result.browserErrors.length === 0;

console.log(JSON.stringify(result, null, 2));
socket.close();
if (!result.passed) process.exitCode = 1;
