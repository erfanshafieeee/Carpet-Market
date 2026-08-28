"use client";

import { FormEvent, useState } from "react";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";

export function ChangePasswordClient() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (next !== confirm) return setError("تکرار رمز جدید یکسان نیست.");
    try { await apiFetch("/auth/change-password/", { method: "POST", body: JSON.stringify({ current_password: current, new_password: next }) }); setCurrent(""); setNext(""); setConfirm(""); setMessage("رمز عبور با موفقیت تغییر کرد."); } catch { setError("تغییر رمز انجام نشد؛ رمز فعلی و شرایط رمز جدید را بررسی کنید."); }
  };
  return <AdminShell><div className="admin-page-heading"><div><h1>تغییر رمز عبور</h1><p>رمز قوی و اختصاصی برای حساب مدیریت انتخاب کنید.</p></div></div><form className="admin-panel password-form" onSubmit={submit}><label>رمز عبور فعلی<input dir="ltr" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label><label>رمز عبور جدید<input dir="ltr" type="password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} /></label><label>تکرار رمز عبور جدید<input dir="ltr" type="password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>{error && <p className="field-error">{error}</p>}{message && <p className="success-message">{message}</p>}<button className="button button-primary">ذخیره رمز جدید</button></form></AdminShell>;
}

