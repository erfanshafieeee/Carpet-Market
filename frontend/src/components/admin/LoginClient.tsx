"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { apiFetch } from "@/lib/api";

export function LoginClient() {
  const router = useRouter();
  const [mobile, setMobile] = useState("09120000000");
  const [password, setPassword] = useState("Demo1234!");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ authenticated: boolean }>("/auth/me/").then((value) => { if (value.authenticated) router.replace("/Admin/dashboard"); }).catch(() => undefined);
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const mobileNumber = mobile
        .trim()
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/\D/g, "");
      await apiFetch("/auth/login/", { method: "POST", body: JSON.stringify({ mobile_number: mobileNumber, password }) });
      const session = await apiFetch<{ authenticated: boolean; mobile_number?: string }>("/auth/me/");
      if (!session.authenticated) {
        setError("نشست ورود در مرورگر ذخیره نشد؛ کوکی‌های localhost را فعال و دوباره تلاش کنید.");
        return;
      }
      router.replace("/Admin/dashboard");
      router.refresh();
    } catch (reason) {
      const status = (reason as Error & { status?: number }).status;
      setError(status === 429 ? "تعداد تلاش‌ها زیاد است؛ یک دقیقه دیگر دوباره امتحان کنید." : "ورود انجام نشد؛ شماره موبایل و رمز عبور را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login" dir="rtl">
      <header><Link className="brand" href="/Market">بازار فرش ایران</Link><span>پنل فروشنده</span></header>
      <main>
        <p className="eyebrow">مدیریت فروشگاه فرش ایران</p>
        <h1>به پنل فروشنده وارد شوید</h1>
        <p>محصولات، تصاویر و موجودی فروشگاه را مدیریت کنید.</p>
        <form onSubmit={submit}>
          <label>شماره موبایل<input dir="ltr" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} /></label>
          <label>رمز عبور<div className="password-input"><input dir="ltr" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShow((value) => !value)} aria-label="نمایش رمز">{show ? <FiEyeOff /> : <FiEye />}</button></div></label>
          {error && <p className="field-error">{error}</p>}
          <button className="button button-primary block" disabled={busy}>{busy ? "در حال ورود…" : "ورود به پنل"}</button>
        </form>
        <div className="login-demo"><strong>حساب Demo محلی</strong><p>موبایل: <bdi>09120000000</bdi><br />رمز: <bdi>Demo1234!</bdi></p><small>برای محیط واقعی، اطلاعات ورود از متغیرهای محیطی ساخته می‌شود.</small></div>
      </main>
    </div>
  );
}
