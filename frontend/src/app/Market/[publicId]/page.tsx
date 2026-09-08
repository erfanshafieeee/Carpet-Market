import { Suspense } from "react";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { Metadata } from "next";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
const API_URL = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000/api/v1";

async function getProduct(publicId: string, language: string) {
  try {
    const response = await fetch(`${API_URL}/products/${publicId}/?lang=${language}`, { cache: "no-store" });
    return response.ok ? await response.json() as Product : null;
  } catch { return null; }
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ publicId: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const [{ publicId }, search] = await Promise.all([params, searchParams]);
  const language = search.lang === "en" ? "en" : "fa";
  const product = await getProduct(publicId, language);
  if (!product) return { title: language === "fa" ? "فرش | فرش شبستری" : "Carpet | Shabestari Carpet" };
  return {
    title: `${product.title} | ${language === "fa" ? "فرش شبستری" : "Shabestari Carpet"}`,
    description: product.description || `${product.city.label} · ${product.length_cm} × ${product.width_cm} cm`,
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  };
}

export default async function ProductDetailPage({ params, searchParams }: { params: Promise<{ publicId: string }>; searchParams: Promise<{ lang?: string }> }) {
  const [{ publicId }, search] = await Promise.all([params, searchParams]);
  const product = await getProduct(publicId, search.lang === "en" ? "en" : "fa");
  return (
    <Suspense fallback={<main className="loading-state">در حال بارگذاری محصول…</main>}>
      <ProductDetailClient initialProduct={product} />
    </Suspense>
  );
}
