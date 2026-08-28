"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiBarChart2, FiExternalLink, FiKey, FiLayers, FiLogOut, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { apiFetch } from "@/lib/api";

const navigation = [
  { href: "/Admin/dashboard", label: "داشبورد", icon: FiBarChart2 },
  { href: "/Admin/products", label: "محصولات", icon: FiLayers },
  { href: "/Admin/exchange-rate", label: "نرخ دلار", icon: FiRefreshCw },
  { href: "/Admin/store", label: "اطلاعات فروشگاه", icon: FiMapPin },
  { href: "/Admin/change-password", label: "تغییر رمز عبور", icon: FiKey }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiFetch<{ authenticated: boolean }>("/auth/me/")
      .then((result) => { if (!result.authenticated) router.replace("/Admin"); })
      .catch(() => router.replace("/Admin"))
      .finally(() => setChecking(false));
  }, [router]);

  const logout = async () => {
    await apiFetch("/auth/logout/", { method: "POST" });
    router.replace("/Admin");
  };

  if (checking) return <main className="loading-state">در حال بررسی نشست مدیریت…</main>;
  return (
    <div className="admin-root" dir="rtl">
      <header className="admin-header">
        <div><Link className="brand" href="/Market">بازار فرش ایران</Link><span>پنل فروشنده</span></div>
        <Link className="button" href="/Market"><FiExternalLink />مشاهده ویترین</Link>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <small>مدیریت فروشگاه</small>
          {navigation.map((item) => { const Icon = item.icon; const active = pathname === item.href || item.href === "/Admin/products" && pathname.startsWith("/Admin/products"); return <Link className={active ? "active" : ""} href={item.href} key={item.href}><Icon />{item.label}</Link>; })}
          <small>حساب</small>
          <button onClick={() => void logout()}><FiLogOut />خروج از پنل</button>
          <div className="admin-demo-note">محیط توسعه محلی<br />اطلاعات اولیه Demo هستند.</div>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
