"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { FiArrowRight, FiPhone, FiSave, FiX } from "react-icons/fi";
import { apiFetch } from "@/lib/api";
import type { AdminSellRequestDetail, SellRequestRejectionReason, SellRequestStatus } from "@/lib/types";
import { AdminShell } from "./AdminShell";
import { RequestStatusBadge, requestStatusLabels } from "./SellRequestsClient";

const rejectionReasons: Record<SellRequestRejectionReason, string> = {
  condition_mismatch: "وضعیت فرش مناسب خرید نیست",
  outside_scope: "خارج از محدوده خرید",
  duplicate: "درخواست تکراری",
  owner_withdrew: "انصراف مالک",
  unable_to_contact: "عدم دسترسی به مالک",
  other: "سایر",
};
const fa = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const dateTime = (value: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
const text = (value?: string | number | null) => value === null || value === undefined || value === "" ? "—" : String(value);

export function SellRequestDetailClient({ id }: { id: string }) {
  const [request, setRequest] = useState<AdminSellRequestDetail | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [status, setStatus] = useState<SellRequestStatus>("needs_review");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<SellRequestRejectionReason | "">("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectError, setRejectError] = useState("");

  const load = useCallback(() => apiFetch<AdminSellRequestDetail>(`/admin/sell-requests/${id}/`).then((result) => { setRequest(result); setStatus(result.status); }).catch(() => setError("دریافت درخواست انجام نشد.")), [id]);
  useEffect(() => { void load(); }, [load]);

  async function applyStatus() {
    if (!request || status === request.status) return;
    if (status === "rejected") { setRejectError(""); setRejectOpen(true); return; }
    setSaving(true); setError("");
    try { const updated = await apiFetch<AdminSellRequestDetail>(`/admin/sell-requests/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status }) }); setRequest(updated); }
    catch { setError("ثبت وضعیت انجام نشد."); }
    finally { setSaving(false); }
  }

  async function reject(event: FormEvent) {
    event.preventDefault();
    if (!reason) { setRejectError("دلیل رد را انتخاب کنید."); return; }
    setSaving(true); setRejectError("");
    try { const updated = await apiFetch<AdminSellRequestDetail>(`/admin/sell-requests/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status: "rejected", rejection_reason: reason, rejection_note: rejectionNote }) }); setRequest(updated); setStatus("rejected"); setRejectOpen(false); }
    catch { setRejectError("ثبت رد درخواست انجام نشد."); }
    finally { setSaving(false); }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    setSaving(true); setError("");
    try { const updated = await apiFetch<AdminSellRequestDetail>(`/admin/sell-requests/${id}/notes/`, { method: "POST", body: JSON.stringify({ body: note.trim() }) }); setRequest(updated); setNote(""); }
    catch { setError("ذخیره یادداشت انجام نشد."); }
    finally { setSaving(false); }
  }

  async function callOwner() {
    if (!request) return;
    try { await apiFetch(`/admin/sell-requests/${id}/call/`, { method: "POST" }); } catch {}
    window.location.href = `tel:${request.phone_number.replace(/^0/, "+98")}`;
  }

  if (error && !request) return <AdminShell><div className="empty-state"><h1>درخواست در دسترس نیست</h1><p>{error}</p><Link className="button" href="/Admin/requests">بازگشت</Link></div></AdminShell>;
  if (!request) return <AdminShell><div className="loading-state">در حال دریافت جزئیات درخواست…</div></AdminShell>;
  const specs = [
    ["نوع فرش", request.rug_type === "handmade" ? "دستباف" : "ماشینی"], ["استان", request.province.label_fa], ["شهر بافت", request.city?.label_fa],
    ["ابعاد", request.length_cm && request.width_cm ? `${fa(request.length_cm)} × ${fa(request.width_cm)} سانتی‌متر` : null], ["وضعیت محصول", request.condition === "new" ? "نو" : request.condition === "used" ? "دست‌دوم" : null],
    ["قدمت", request.approximate_age_years ? `${fa(request.approximate_age_years)} سال` : null], ["جنس", request.materials.map((item) => item.label_fa).join("، ")], ["رنگ", request.colors.map((item) => item.label_fa).join("، ")], ["طرح", request.pattern?.label_fa],
    ...(request.rug_type === "machine" ? [["شانه", request.reeds ? fa(request.reeds) : null], ["تراکم", request.density ? fa(request.density) : null], ["برند", request.brand?.label_fa]] : [["رج", request.raj ? fa(request.raj) : null]]),
  ];

  return <AdminShell>
    <div className="admin-page-heading request-detail-heading"><div><Link className="text-button" href="/Admin/requests"><FiArrowRight />درخواست‌های خرید</Link><h1 dir="ltr">{request.tracking_code}</h1><p>ثبت‌شده در {dateTime(request.created_at)} · {request.province.label_fa}</p></div><RequestStatusBadge status={request.status} /></div>
    <div className="request-detail-grid"><div className="request-main-column">
      <section className="admin-panel request-gallery-panel"><div className="request-main-photo"><img src={request.images[selectedImage]?.url} alt="تصویر فرش" /></div><div className="request-thumbs">{request.images.map((image, index) => <button key={image.id} className={selectedImage === index ? "active" : ""} onClick={() => setSelectedImage(index)} aria-label={`تصویر ${fa(index + 1)}`}><img src={image.url} alt="" /></button>)}</div></section>
      <section className="admin-panel request-spec-panel"><div className="panel-title-row"><h2>مشخصات فرش</h2><span className="demo-tag">اطلاعات مالک</span></div><dl className="request-specs">{specs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{text(value)}</dd></div>)}</dl>{request.description && <div className="request-description"><strong>توضیحات یا آسیب‌ها</strong><p>{request.description}</p></div>}</section>
    </div><aside className="request-side-column" aria-label="پیگیری مالک">
      <section className="admin-panel request-contact-card"><h2>ارتباط با مالک</h2><div className="owner-phone"><small>شماره موبایل</small><strong dir="ltr">{request.phone_number}</strong></div><button className="button button-primary block" onClick={() => void callOwner()}><FiPhone />تماس با مالک</button><dl className="compact-values"><div><dt>استان</dt><dd>{request.province.label_fa}</dd></div><div><dt>نشانی</dt><dd>{request.address || "هنگام تماس دریافت شود"}</dd></div></dl></section>
      <section className="admin-panel request-action-panel"><h2>وضعیت و اقدام بعدی</h2><p>وضعیت را می‌توانید در هر زمان تغییر دهید؛ همه تغییرها در تاریخچه می‌مانند.</p><div className="request-status-action"><select value={status} onChange={(event) => setStatus(event.target.value as SellRequestStatus)}>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button-primary" disabled={saving || status === request.status} onClick={() => void applyStatus()}>ثبت وضعیت</button></div>{request.status === "rejected" && <div className="reject-summary"><strong>دلیل رد</strong><span>{request.rejection_reason ? rejectionReasons[request.rejection_reason] : "ثبت نشده"}</span>{request.rejection_note && <p>{request.rejection_note}</p>}</div>}<form onSubmit={addNote}><label className="sell-field"><span>یادداشت داخلی <small className="optional-mark">اختیاری</small></span><textarea maxLength={1000} placeholder="مثلاً زمان مناسب تماس یا نکته بازدید" value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button" disabled={saving || !note.trim()}><FiSave />ذخیره یادداشت</button></form>{error && <p className="field-error" role="alert">{error}</p>}</section>
    </aside><section className="admin-panel request-history-panel"><h2>تاریخچه درخواست</h2><ol className="request-history">{[...request.status_history].reverse().map((item) => <li key={item.id}><span className="history-dot" /><div><strong>{requestStatusLabels[item.to_status]}</strong><small>{dateTime(item.created_at)}{item.changed_by ? ` · ${item.changed_by}` : ""}</small></div></li>)}</ol>{request.notes.length > 0 && <><h3>یادداشت‌های داخلی</h3><ul className="internal-notes">{[...request.notes].reverse().map((item) => <li key={item.id}><p>{item.body}</p><small>{dateTime(item.created_at)}{item.author ? ` · ${item.author}` : ""}</small></li>)}</ul></>}</section></div>
    {rejectOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reject-title"><header><h2 id="reject-title">ثبت دلیل رد درخواست</h2><button className="icon-button" onClick={() => setRejectOpen(false)} aria-label="بستن"><FiX /></button></header><form className="modal-content reject-form" onSubmit={reject} noValidate><label className="sell-field"><span>دلیل رد <small className="required-mark">اجباری</small></span><select value={reason} onChange={(event) => setReason(event.target.value as SellRequestRejectionReason)}><option value="">انتخاب کنید</option>{Object.entries(rejectionReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="sell-field"><span>توضیح تکمیلی <small className="optional-mark">اختیاری</small></span><textarea maxLength={1000} value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} /></label>{rejectError && <p className="field-error" role="alert">{rejectError}</p>}<div className="modal-actions"><button className="button button-primary" disabled={saving}>تأیید رد درخواست</button><button className="button" type="button" onClick={() => setRejectOpen(false)}>انصراف</button></div></form></section></div>}
  </AdminShell>;
}
