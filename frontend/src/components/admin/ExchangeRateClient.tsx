"use client";

import { useEffect, useState } from "react";
import { FiInfo } from "react-icons/fi";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";

type RateStatus = { available: boolean; provider_configured: boolean; rate_toman?: number; source_name?: string; quoted_at?: string; fetched_at?: string; stale?: boolean };

export function ExchangeRateClient() {
  const [status, setStatus] = useState<RateStatus | null>(null);
  useEffect(() => { apiFetch<RateStatus>("/admin/exchange-rate/").then(setStatus).catch(() => setStatus({ available: false, provider_configured: false })); }, []);
  return <AdminShell><div className="admin-page-heading"><div><h1>نرخ دلار و قیمت انگلیسی</h1><p>تبدیل قیمت پایه تومان به قیمت تقریبی USD</p></div></div><div className="fx-grid"><section className="admin-panel"><h2>وضعیت سرویس نرخ</h2>{!status ? <p>در حال بررسی…</p> : status.available ? <dl className="key-values"><div><dt>مبنای نرخ</dt><dd>نرخ فروش دلار بازار آزاد</dd></div><div><dt>قیمت هر دلار</dt><dd>{new Intl.NumberFormat("fa-IR").format(status.rate_toman ?? 0)} تومان</dd></div><div><dt>تأمین‌کننده</dt><dd>{status.source_name}</dd></div><div><dt>وضعیت</dt><dd>{status.stale ? "قدیمی" : "معتبر"}</dd></div></dl> : <><dl className="key-values"><div><dt>تأمین‌کننده</dt><dd>تنظیم نشده</dd></div><div><dt>قیمت USD در Market</dt><dd>نمایش داده نمی‌شود</dd></div></dl><div className="notice"><FiInfo />طبق تصمیم فعلی، سرویس نرخ متصل نیست. در نسخه انگلیسی قیمت پایه تومان همراه پیام عدم دسترسی به تبدیل نمایش داده می‌شود؛ هیچ نرخ یا مبلغ ساختگی تولید نمی‌شود.</div></>}</section><section className="admin-panel"><h2>آماده اتصال در آینده</h2><p>Backend یک نقطه اتصال مستقل برای Provider دارد. زمانی که منبع مجاز مشخص شود، Job روزانه و ثبت آخرین نرخ معتبر بدون تغییر در مدل محصول اضافه می‌شود.</p></section></div></AdminShell>;
}

