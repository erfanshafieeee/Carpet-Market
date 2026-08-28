"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiExternalLink, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";
import type { InventoryStatus, PaginatedAdminProducts } from "@/lib/types";

const fa = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const labels: Record<InventoryStatus, string> = { available: "موجود", reserved: "رزرو شده", sold: "فروخته شده" };

export function ProductsClient() {
  const [data, setData] = useState<PaginatedAdminProducts | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    const params = new URLSearchParams({ page_size: "48" });
    if (query) params.set("search", query);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    setError(false);
    apiFetch<PaginatedAdminProducts>(`/admin/products/?${params}`).then(setData).catch(() => setError(true));
  }, [query, status, type]);
  useEffect(() => { const timeout = setTimeout(load, 220); return () => clearTimeout(timeout); }, [load]);

  const updateStatus = async (publicId: string, inventory_status: InventoryStatus) => {
    await apiFetch(`/admin/products/${publicId}/status/`, { method: "PATCH", body: JSON.stringify({ inventory_status }) });
    load();
  };
  const remove = async (publicId: string, title: string) => {
    if (!window.confirm(`آیا «${title}» از نمایش عمومی حذف شود؟ تاریخچه آماری آن باقی می‌ماند.`)) return;
    await apiFetch(`/admin/products/${publicId}/`, { method: "DELETE" });
    load();
  };

  return <AdminShell><div className="admin-page-heading"><div><h1>محصولات فروشگاه</h1><p>قیمت، تصاویر و وضعیت هر فرش را به‌روز نگه دارید.</p></div><Link className="button button-primary" href="/Admin/products/new"><FiPlus />افزودن فرش</Link></div><div className="admin-toolbar"><label className="admin-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی عنوان، شهر بافت یا مشخصات…" /><FiSearch /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="available">موجود</option><option value="reserved">رزرو شده</option><option value="sold">فروخته شده</option></select><select value={type} onChange={(e) => setType(e.target.value)}><option value="">همه انواع</option><option value="handmade">دستباف</option><option value="machine">ماشینی</option></select></div>{error ? <div className="empty-state"><h2>دریافت محصولات انجام نشد</h2><button className="button" onClick={load}>تلاش دوباره</button></div> : !data ? <div className="loading-state">در حال دریافت محصولات…</div> : <div className="admin-table-wrap"><table className="products-table"><thead><tr><th>فرش</th><th>قیمت (تومان)</th><th>بازدید / تماس</th><th>وضعیت موجودی</th><th>عملیات</th></tr></thead><tbody>{data.results.map((product) => { const image = product.images.find((item) => item.is_cover) ?? product.images[0]; return <tr key={product.public_id}><td><Link className="table-product" href={`/Admin/products/${product.public_id}`}>{image && <img src={image.url} alt="" />}<div><strong>{product.title_fa}</strong><span>{fa(product.length_cm / 100)} × {fa(product.width_cm / 100)} متر</span></div></Link></td><td>{fa(product.price_toman)}</td><td>{fa(product.view_count)} / {fa(product.contact_count)}</td><td><select className="table-status" value={product.inventory_status} onChange={(e) => void updateStatus(product.public_id, e.target.value as InventoryStatus)}>{(Object.keys(labels) as InventoryStatus[]).map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select></td><td><div className="row-actions"><Link href={`/Admin/products/${product.public_id}`} aria-label="ویرایش"><FiEdit2 /></Link><Link href={`/Market/${product.public_id}?lang=fa`} aria-label="نمایش"><FiExternalLink /></Link><button onClick={() => void remove(product.public_id, product.title_fa)} aria-label="حذف"><FiTrash2 /></button></div></td></tr>; })}</tbody></table><footer>{fa(data.count)} محصول</footer></div>}</AdminShell>;
}
