import { Suspense } from "react";
import { SellSuccessClient } from "@/components/SellFlowClient";
import type { Store } from "@/lib/types";

export const dynamic = "force-dynamic";
const API_URL = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000/api/v1";
export default async function SuccessPage() { let store: Store | null = null; try { const response = await fetch(`${API_URL}/store/`, { cache: "no-store" }); if (response.ok) store = await response.json(); } catch {} return <Suspense fallback={<main className="loading-state">…</main>}><SellSuccessClient store={store} /></Suspense>; }
