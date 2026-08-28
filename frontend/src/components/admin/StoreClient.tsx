"use client";

import { useEffect, useState } from "react";
import { FiMapPin, FiPhone } from "react-icons/fi";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";
import type { Store } from "@/lib/types";

export function StoreClient() {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<Store>("/store/").then(setStore).catch(() => setError(true));
  }, []);

  return <AdminShell><div className="admin-page-heading"><div><h1>اطلاعات فروشگاه</h1><p>این اطلاعات در ویترین و پنجره تماس به مشتری نمایش داده می‌شود.</p></div></div>{error ? <div className="empty-state"><h2>دریافت اطلاعات فروشگاه انجام نشد</h2></div> : !store ? <div className="loading-state">در حال دریافت اطلاعات…</div> : <section className="admin-panel store-admin-panel"><h2>{store.name_fa}</h2><p dir="ltr">{store.name_en}</p><dl className="key-values"><div><dt><FiMapPin /> شهر</dt><dd>{store.city_fa} / {store.city_en}</dd></div><div><dt><FiPhone /> شماره تماس</dt><dd dir="ltr">{store.mobile_number}</dd></div><div><dt>نشانی فارسی</dt><dd>{store.address_fa || "—"}</dd></div><div><dt>نشانی انگلیسی</dt><dd dir="ltr">{store.address_en || "—"}</dd></div></dl><div className="notice">در نسخه اول اطلاعات فروشگاه فقط خواندنی است و از دیتابیس مدیریت می‌شود.</div></section>}</AdminShell>;
}
