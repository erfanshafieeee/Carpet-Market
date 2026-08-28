import { apiFetch } from "./api";
import type { Language } from "./types";

const SESSION_KEY = "irancarpet-anonymous-session";
const SESSION_TTL = 30 * 60 * 1000;

function sessionId() {
  if (typeof window === "undefined") return crypto.randomUUID();
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (stored?.id && now - stored.lastSeen < SESSION_TTL) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: stored.id, lastSeen: now }));
      return stored.id as string;
    }
  } catch {}
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastSeen: now }));
  return id;
}

export function track(event_type: string, language: Language, extras: Record<string, unknown> = {}) {
  const product_public_id = extras.product_public_id;
  const query = extras.query;
  const properties = Object.fromEntries(Object.entries(extras).filter(([key]) => !["product_public_id", "query"].includes(key)));
  void apiFetch("/analytics/events/", {
    method: "POST",
    body: JSON.stringify({ event_type, session_id: sessionId(), language, product_public_id, query, properties })
  }).catch(() => undefined);
}

