"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiBarChart2, FiExternalLink, FiInbox, FiKey, FiLayers, FiLogOut, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { apiFetch } from "@/lib/api";

const navigation = [
  { href: "/Admin/dashboard", label: "داشبورد", icon: FiBarChart2 },
  { href: "/Admin/requests", label: "درخواست‌های خرید", icon: FiInbox },
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
        <div><Link className="brand admin-brand" href="/Market"><img src="/images/brand-mark.png" alt="" />فرش شبستری</Link><span>پنل مدیریت</span></div>
        <Link className="button" href="/Market"><FiExternalLink />مشاهده ویترین</Link>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <small>مدیریت فروشگاه</small>
          {navigation.map((item) => { const Icon = item.icon; const active = pathname === item.href || item.href === "/Admin/products" && pathname.startsWith("/Admin/products") || item.href === "/Admin/requests" && pathname.startsWith("/Admin/requests"); return <Link className={active ? "active" : ""} href={item.href} key={item.href}><Icon />{item.label}</Link>; })}
          <small>حساب</small>
          <button onClick={() => void logout()}><FiLogOut />خروج از پنل</button>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
