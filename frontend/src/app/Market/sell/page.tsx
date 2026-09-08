import type { Metadata } from "next";
import { Suspense } from "react";
import { SellFlowClient } from "@/components/SellFlowClient";
import type { References, Store } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فروش فرش به ما", description: "ثبت درخواست بررسی و خرید فرش توسط کارشناسان فرش شبستری" };
const API_URL = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000/api/v1";

export default async function SellPage() { let references: References = {}; let store: Store | null = null; try { const [refs, storeResponse] = await Promise.all([fetch(`${API_URL}/references/`, { cache: "no-store" }), fetch(`${API_URL}/store/`, { cache: "no-store" })]); if (refs.ok) references = await refs.json(); if (storeResponse.ok) store = await storeResponse.json(); } catch {} return <Suspense fallback={<main className="loading-state">در حال آماده‌سازی فرم…</main>}><SellFlowClient references={references} store={store} /></Suspense>; }
