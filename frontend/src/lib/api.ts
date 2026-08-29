const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

function cookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((item) => item.startsWith(`${name}=`))?.split("=")[1] ?? "";
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch(`${API_URL}/auth/csrf/`, { credentials: "include", cache: "no-store" });
    if (!csrfResponse.ok) throw new Error("دریافت توکن امنیتی انجام نشد.");
    const csrfPayload = await csrfResponse.json() as { csrfToken?: string };
    const csrfToken = csrfPayload.csrfToken ?? decodeURIComponent(cookie("csrftoken"));
    if (!csrfToken) throw new Error("توکن امنیتی در دسترس نیست.");
    headers.set("X-CSRFToken", csrfToken);
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error("درخواست با خطا مواجه شد.") as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

