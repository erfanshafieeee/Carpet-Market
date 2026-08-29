const endpoint = process.env.QA_CDP_ENDPOINT ?? "http://127.0.0.1:9333";
const frontendOrigin = process.env.QA_FRONTEND_ORIGIN ?? "http://localhost:3000";
const mobile = process.env.QA_ADMIN_MOBILE;
const password = process.env.QA_ADMIN_PASSWORD;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!mobile || !password) {
  throw new Error("QA_ADMIN_MOBILE and QA_ADMIN_PASSWORD are required.");
}

let targets;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    if (targets.length) break;
  } catch {
    // Chrome is still starting.
  }
  await delay(250);
}
if (!targets?.length) throw new Error("Chrome DevTools endpoint did not become ready.");

const socket = new WebSocket(targets[0].webSocketDebuggerUrl);
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
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    browserErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
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

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

await Promise.all([command("Page.enable"), command("Runtime.enable")]);
await command("Page.navigate", { url: `${frontendOrigin}/Admin` });
await delay(1800);

await evaluate(`(() => {
  const inputs = document.querySelectorAll('form input');
  if (inputs.length < 2) throw new Error('Login form was not found.');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setValue.call(inputs[0], ${JSON.stringify(mobile)});
  inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  setValue.call(inputs[1], ${JSON.stringify(password)});
  inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('form').requestSubmit();
})()`);
await delay(2500);

const result = await evaluate(`({
  path: location.pathname,
  metrics: document.querySelectorAll('.metric-card').length,
  visibleError: document.querySelector('[role="alert"]')?.textContent ?? ''
})`);
result.browserErrors = [...new Set(browserErrors)].filter((error) => !error.includes("favicon.ico"));
result.passed = result.path === "/Admin/dashboard" && result.metrics === 4 && result.browserErrors.length === 0;

console.log(JSON.stringify(result, null, 2));
socket.close();
if (!result.passed) process.exitCode = 1;
