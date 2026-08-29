import { Suspense } from "react";
import { MarketClient } from "@/components/MarketClient";
import type { Metadata } from "next";
import type { PaginatedProducts, References } from "@/lib/types";

export const dynamic = "force-dynamic";

const API_URL = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000/api/v1";

export const metadata: Metadata = {
  title: "بازار فرش ایران | Iran Carpet Market",
  description: "ویترین فرش‌های دستباف و ماشینی ایران با مشخصات کامل و تماس مستقیم با فروشنده.",
};

export default async function MarketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams;
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => Array.isArray(value) ? value.forEach((item) => params.append(key, item)) : value && params.set(key, value));
  if (!params.has("lang")) params.set("lang", "fa");
  let products: PaginatedProducts | null = null;
  let references: References = {};
  try {
    const [productsResponse, referencesResponse] = await Promise.all([
      fetch(`${API_URL}/products/?${params}`, { cache: "no-store" }),
      fetch(`${API_URL}/references/`, { cache: "no-store" }),
    ]);
    if (productsResponse.ok) products = await productsResponse.json();
    if (referencesResponse.ok) references = await referencesResponse.json();
  } catch { /* Client fallback handles a temporarily unavailable API. */ }
  return (
    <Suspense fallback={<main className="loading-state">در حال آماده‌سازی گالری…</main>}>
      <MarketClient initialData={products} initialReferences={references} />
    </Suspense>
  );
}
