"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiClock, FiExternalLink, FiInbox, FiSearch, FiTrash2 } from "react-icons/fi";
import { apiFetch } from "@/lib/api";
import type { PaginatedSellRequests, SellRequestStatus } from "@/lib/types";
import { AdminShell } from "./AdminShell";
import { JalaliDateRangePicker } from "./JalaliDateRangePicker";

export const requestStatusLabels: Record<SellRequestStatus, string> = {
  needs_review: "نیازمند بررسی",
  in_progress: "در حال پیگیری",
  purchased: "خریداری‌شده",
  rejected: "ردشده",
};

const number = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const dateTime = (value: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function RequestStatusBadge({ status }: { status: SellRequestStatus }) {
  return <span className={`request-status ${status}`}>{requestStatusLabels[status]}</span>;
}

export function SellRequestsClient() {
  const [data, setData] = useState<PaginatedSellRequests | null>(null);
  const [counts, setCounts] = useState({ needs_review: 0, in_progress: 0, purchased: 0 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), range });
    if (query.trim()) value.set("q", query.trim());
    if (status) value.set("status", status);
    if (type) value.set("type", type);
    if (range === "custom" && from && to) { value.set("from", from); value.set("to", to); }
    return value;
  }, [from, page, query, range, status, to, type]);

  const load = useCallback(() => {
    if (range === "custom" && (!from || !to)) return;
    setError(false);
    apiFetch<PaginatedSellRequests>(`/admin/sell-requests/?${params}`)
      .then(setData)
      .catch(() => setError(true));
  }, [from, params, range, to]);

  useEffect(() => { const timeout = setTimeout(load, 220); return () => clearTimeout(timeout); }, [load]);
  useEffect(() => {
    Promise.all(["needs_review", "in_progress", "purchased"].map((value) => apiFetch<PaginatedSellRequests>(`/admin/sell-requests/?range=all&status=${value}`)))
      .then(([needsReview, inProgress, purchased]) => setCounts({ needs_review: needsReview.count, in_progress: inProgress.count, purchased: purchased.count }))
      .catch(() => undefined);
  }, []);

  const reset = () => { setQuery(""); setStatus(""); setType(""); setRange("all"); setFrom(""); setTo(""); setPage(1); };
  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / 6));

  return <AdminShell>
    <div className="admin-page-heading"><div><h1>درخواست‌های خرید</h1><p>بررسی و پیگیری درخواست‌های فروش فرش از سراسر ایران</p></div><Link className="button" href="/Market/sell?lang=fa"><FiExternalLink />مشاهده فرم عمومی</Link></div>
    <div className="request-mini-stats">
      <div><span><FiInbox />نیازمند بررسی</span><strong>{number(counts.needs_review)}</strong></div>
      <div><span><FiClock />در حال پیگیری</span><strong>{number(counts.in_progress)}</strong></div>
      <div><span><FiCheckCircle />خریداری‌شده</span><strong>{number(counts.purchased)}</strong></div>
    </div>
    <div className="admin-toolbar request-toolbar">
      <label className="admin-search"><span className="sr-only">جستجوی درخواست</span><input type="search" placeholder="شماره موبایل یا کد پیگیری…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /><FiSearch /></label>
      <select aria-label="فیلتر وضعیت" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">همه وضعیت‌ها</option>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="فیلتر نوع فرش" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="">همه انواع</option><option value="handmade">دستباف</option><option value="machine">ماشینی</option></select>
      <button className="button" onClick={reset}><FiTrash2 />حذف همه فیلترها</button>
    </div>
    <section className="request-date-filter" aria-label="فیلتر زمان ارسال">
      <div className="request-date-copy"><FiCalendar /><div><strong>زمان ارسال درخواست</strong><small>بازه‌های پرکاربرد یا تاریخ دلخواه</small></div></div>
      <div className="request-range-select"><label className="sr-only" htmlFor="request-range">بازه زمانی</label><select id="request-range" aria-label="بازه زمانی درخواست‌ها" value={range} onChange={(event) => { setRange(event.target.value); setPage(1); }}><option value="all">همه زمان‌ها</option><option value="7">۷ روز اخیر</option><option value="30">۳۰ روز اخیر</option><option value="90">۹۰ روز اخیر</option><option value="custom">بازه دلخواه…</option></select></div>
      {range === "custom" && <JalaliDateRangePicker from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo); setPage(1); }} />}
    </section>
    {error ? <div className="empty-state"><h2>دریافت درخواست‌ها انجام نشد</h2><button className="button" onClick={load}>تلاش دوباره</button></div> : !data ? <div className="loading-state">در حال دریافت درخواست‌ها…</div> : <div className="admin-table-wrap"><table className="products-table requests-table"><thead><tr><th>درخواست</th><th>نوع و استان</th><th>شماره مالک</th><th>زمان ثبت</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{data.results.length ? data.results.map((request) => <tr key={request.public_id}><td><Link className="table-product" href={`/Admin/requests/${request.public_id}`}>{request.thumbnail ? <img src={request.thumbnail} alt="" /> : <span className="request-placeholder"><FiInbox /></span>}<div><strong dir="ltr">{request.tracking_code}</strong><span>{number(request.image_count)} تصویر</span></div></Link></td><td><strong>{request.rug_type === "handmade" ? "دستباف" : "ماشینی"}</strong><small>{request.province.label_fa}</small></td><td><bdi>{request.phone_number}</bdi></td><td>{dateTime(request.created_at)}</td><td><RequestStatusBadge status={request.status} /></td><td><Link className="button request-detail-link" href={`/Admin/requests/${request.public_id}`}>مشاهده جزئیات</Link></td></tr>) : <tr><td colSpan={6}><div className="empty-state request-empty"><h2>درخواستی پیدا نشد</h2><p>جستجو، وضعیت یا بازه زمانی را تغییر دهید.</p></div></td></tr>}</tbody></table><footer className="request-table-footer"><span>{number(data.count)} درخواست</span><nav className="pagination" aria-label="صفحه‌بندی">{Array.from({ length: totalPages }, (_, index) => <button key={index} className={page === index + 1 ? "current" : ""} onClick={() => setPage(index + 1)}>{number(index + 1)}</button>)}</nav></footer></div>}
  </AdminShell>;
}
