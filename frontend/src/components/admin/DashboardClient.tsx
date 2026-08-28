"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiActivity, FiEye, FiPhone, FiPlus } from "react-icons/fi";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

const fa = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

export function DashboardClient() {
  const [range, setRange] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    const params = new URLSearchParams({ range });
    if (range === "custom" && from && to) { params.set("from", from); params.set("to", to); }
    apiFetch<DashboardData>(`/analytics/dashboard/?${params}`).then(setData).catch(() => setError(true));
  }, [range, from, to]);
  useEffect(() => { load(); }, [load]);
  return <AdminShell><div className="admin-page-heading"><div><h1>نمای کلی فروشگاه</h1><p>وضعیت موجودی و مسیر رسیدن مشتری به تماس</p></div><div className="dashboard-range"><select value={range} onChange={(e) => { setError(false); setRange(e.target.value); }}><option value="7">۷ روز اخیر</option><option value="30">۳۰ روز اخیر</option><option value="custom">بازه سفارشی</option></select>{range === "custom" && <><input aria-label="از تاریخ" type="date" value={from} onChange={(e) => { setError(false); setFrom(e.target.value); }} /><input aria-label="تا تاریخ" type="date" value={to} min={from} onChange={(e) => { setError(false); setTo(e.target.value); }} /></>}<Link className="button button-primary" href="/Admin/products/new"><FiPlus />افزودن فرش</Link></div></div>{error ? <div className="empty-state"><h2>دریافت آمار انجام نشد</h2><button className="button" onClick={() => { setError(false); load(); }}>تلاش دوباره</button></div> : !data ? <div className="loading-state">در حال محاسبه آمار…</div> : <DashboardContent data={data} />}</AdminShell>;
}

function DashboardContent({ data }: { data: DashboardData }) {
  const metrics = [
    ["بازدید محصول", data.metrics.product_views, FiEye, "تعداد رویدادهای مشاهده"],
    ["قصد تماس", data.metrics.contact_clicks, FiPhone, "کلیک روی تماس با فروشنده"],
    ["شروع تماس", data.metrics.phone_call_clicks, FiPhone, "اقدام برای شروع تماس"],
    ["نرخ تبدیل تماس", data.metrics.contact_conversion_rate === null ? "—" : `${fa(data.metrics.contact_conversion_rate)}٪`, FiActivity, "بر مبنای سشن یکتا"]
  ] as const;
  return <><div className="metric-grid">{metrics.map(([label, value, Icon, hint]) => <section className="metric-card" key={label}><div><span>{label}</span><Icon /></div><strong>{typeof value === "number" ? fa(value) : value}</strong><small>{hint}</small></section>)}</div><div className="dashboard-grid"><section className="admin-panel wide"><h2>مسیر مشاهده تا تماس</h2><p>هر سشن فقط یک بار در هر مرحله شمرده می‌شود.</p>{[["مشاهده جزئیات", data.metrics.unique_product_view_sessions], ["قصد تماس پس از مشاهده", data.metrics.unique_qualifying_sessions], ["اقدام به تماس تلفنی", data.metrics.phone_call_clicks]].map(([label, value]) => <div className="funnel-row" key={label as string}><div><span>{label}</span><strong>{fa(value as number)} سشن</strong></div><div><span style={{ width: `${data.metrics.unique_product_view_sessions ? (value as number) / data.metrics.unique_product_view_sessions * 100 : 0}%` }} /></div></div>)}</section><section className="admin-panel"><h2>موجودی فعلی</h2><p>مستقل از بازه گزارش · {fa(data.inventory.total)} محصول</p>{[["موجود", data.inventory.available, "available"], ["رزرو شده", data.inventory.reserved, "reserved"], ["فروخته شده", data.inventory.sold, "sold"]].map(([label, value, status]) => <div className="inventory-row" key={status as string}><span className={`status status-${status}`}>{label}</span><strong>{fa(value as number)}</strong></div>)}</section><TopTable title="فرش‌های پربازدید" rows={data.top_products_by_view} metric="بازدید" /><TopTable title="بیشترین قصد تماس" rows={data.top_products_by_contact} metric="کلیک تماس" /><section className="admin-panel"><h2>جستجوهای پرتکرار</h2><table><thead><tr><th>عبارت</th><th>تعداد</th></tr></thead><tbody>{data.top_search_queries.map((row) => <tr key={row.query}><td>{row.query}</td><td>{fa(row.count)}</td></tr>)}</tbody></table></section><section className="admin-panel"><h2>وضعیت نرخ دلار</h2><p>تأمین‌کننده نرخ فعلاً تنظیم نشده و قیمت ساختگی نمایش داده نمی‌شود.</p><Link className="text-button" href="/Admin/exchange-rate">مشاهده وضعیت نرخ</Link></section></div></>;
}

function TopTable({ title, rows, metric }: { title: string; rows: Array<{ public_id: string; title_fa: string; metric: number }>; metric: string }) {
  return <section className="admin-panel"><h2>{title}</h2><table><thead><tr><th>محصول</th><th>{metric}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.public_id}><td><Link href={`/Admin/products/${row.public_id}`}>{row.title_fa}</Link></td><td>{fa(row.metric)}</td></tr>)}</tbody></table></section>;
}
