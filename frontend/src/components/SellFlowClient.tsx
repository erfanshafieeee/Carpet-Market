"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiArrowRight, FiAward, FiCamera, FiCheck, FiCheckCircle, FiClock, FiCopy, FiInfo, FiLayers, FiMap, FiPhone, FiPlus, FiShield, FiX } from "react-icons/fi";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import type { Language, ReferenceItem, References, SellRequestCreated, Store } from "@/lib/types";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

type Draft = {
  rug_type: "" | "handmade" | "machine"; phone_number: string; province: string; address: string;
  city: string; length_cm: string; width_cm: string; condition: string; approximate_age_years: string;
  pattern: string; materials: string[]; colors: string[]; raj: string; reeds: string; density: string; brand: string; description: string;
};
type DraftSetter = (key: keyof Draft, value: string | string[]) => void;
type StepProps = { fa: boolean; draft: Draft; set: DraftSetter; errors: Record<string, string>; heading: RefObject<HTMLHeadingElement | null> };
type PendingImage = { file: File; previewUrl: string };

const emptyDraft: Draft = { rug_type: "", phone_number: "", province: "", address: "", city: "", length_cm: "", width_cm: "", condition: "", approximate_age_years: "", pattern: "", materials: [], colors: [], raj: "", reeds: "", density: "", brand: "", description: "" };
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxSize = 15 * 1024 * 1024;

export function SellFlowClient({ references, store }: { references: References; store: Store | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const language: Language = params.get("lang") === "en" ? "en" : "fa";
  const fa = language === "fa";
  const requestedStep = Math.min(3, Math.max(1, Number(params.get("step") || 1)));
  const step = requestedStep;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const workspace = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const previousStep = useRef(step);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => { if (!started.current) { started.current = true; track("sell_flow_started", language, attribution(params)); } }, [language, params]);
  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (!workspace.current || !heading.current) return;
    const frame = requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      const top = (workspace.current?.getBoundingClientRect().top || 0) + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const set = (key: keyof Draft, value: string | string[]) => setDraft((current) => ({ ...current, [key]: value }));
  const label = (key: string) => ({ handmade: ["دستباف", "Handmade"], machine: ["ماشینی", "Machine-made"] }[key]?.[fa ? 0 : 1] || key);

  function validate(currentStep: number) {
    const next: Record<string, string> = {};
    if (currentStep === 1) {
      if (!draft.rug_type) next.rug_type = fa ? "نوع فرش را انتخاب کنید." : "Select a rug type.";
      if (!images.length) next.images = fa ? "حداقل یک تصویر اضافه کنید." : "Add at least one photo.";
    }
    if (currentStep === 2) {
      if (!normalizePhone(draft.phone_number)) next.phone_number = fa ? "شماره موبایل معتبر وارد کنید." : "Enter a valid Iranian mobile number.";
      if (!draft.province) next.province = fa ? "استان محل فرش را انتخاب کنید." : "Select the rug location province.";
    }
    if (currentStep === 3) {
      const numeric: Array<[keyof Draft, number]> = [["length_cm", 2000], ["width_cm", 2000], ["approximate_age_years", 250], ["raj", 150], ["reeds", 2000], ["density", 5000]];
      numeric.forEach(([key, max]) => { const value = draft[key] as string; if (value && (!/^\d+$/.test(toEnglishDigits(value)) || Number(toEnglishDigits(value)) < 1 || Number(toEnglishDigits(value)) > max)) next[key] = fa ? `عدد بین ۱ تا ${max.toLocaleString("fa-IR")} وارد کنید.` : `Enter a number from 1 to ${max}.`; });
      if (Boolean(draft.length_cm) !== Boolean(draft.width_cm)) next.length_cm = fa ? "طول و عرض را با هم وارد کنید." : "Enter both length and width.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function go(nextStep: number) {
    const next = new URLSearchParams(params.toString());
    next.set("step", String(nextStep));
    router.push(`/Market/sell?${next}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(step)) return;
    if (step < 3) { track("sell_step_completed", language, { step_number: step, carpet_type: draft.rug_type || undefined, province_id: draft.province || undefined }); go(step + 1); return; }
    setSubmitting(true); setSubmitError("");
    const body = new FormData();
    Object.entries(draft).forEach(([key, value]) => Array.isArray(value) ? value.forEach((item) => body.append(key === "materials" ? "material_ids" : "color_ids", item)) : value && body.append(key, key === "phone_number" ? normalizePhone(value) : toEnglishDigits(value)));
    images.forEach(({ file }) => body.append("images", file));
    Object.entries(attribution(params)).forEach(([key, value]) => value && body.append(key, String(value)));
    try {
      const created = await apiFetch<SellRequestCreated>("/sell-requests/", { method: "POST", body });
      track("sell_request_submitted", language, { request_public_id: created.public_id, carpet_type: draft.rug_type, province_id: draft.province, photo_count: images.length, ...attribution(params) });
      images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      router.push(`/Market/sell/success?lang=${language}&code=${encodeURIComponent(created.tracking_code)}`);
    } catch (error) {
      setSubmitError(apiError(error) || (fa ? "ثبت درخواست انجام نشد؛ دوباره تلاش کنید." : "We could not submit your request. Please try again."));
    } finally { setSubmitting(false); }
  }

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    let message = "";
    const valid = selected.filter((file) => { const okay = allowedTypes.includes(file.type) && file.size <= maxSize; if (!okay) message = fa ? "فقط JPG، PNG یا WebP تا ۱۵ مگابایت پذیرفته می‌شود." : "Use JPG, PNG or WebP files up to 15 MB."; return okay; });
    const available = Math.max(0, 4 - images.length);
    const accepted = valid.slice(0, available).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { file, previewUrl };
    });
    if (valid.length > available) message = fa ? "حداکثر چهار تصویر مجاز است." : "Up to four photos are allowed.";
    setImages((current) => [...current, ...accepted]);
    setErrors((current) => ({ ...current, images: message })); event.target.value = "";
  }

  return <div dir={fa ? "rtl" : "ltr"} lang={language}><PublicHeader language={language} /><main className="sell-page"><section className="sell-hero"><div><span>{fa ? "خرید مستقیم از مالک" : "Direct from rug owners"}</span><h1>{fa ? "فرش شما، بررسی کارشناسی ما" : "Your rug, reviewed by our experts"}</h1><p>{fa ? "تصاویر و اطلاعات اولیه را در چند دقیقه بفرستید؛ کارشناسان فرش شبستری در سریع‌ترین زمان ممکن برای بررسی، هماهنگی بازدید و قیمت‌گذاری حضوری تماس می‌گیرند." : "Share a few photos and basic details in minutes. Shabestari Carpet experts will contact you to arrange an in-person appraisal."}</p><div className="sell-benefits"><span><FiCheckCircle />{fa ? "پیشنهاد خرید منصفانه و رقابتی" : "A fair, competitive purchase offer"}</span><span><FiMap />{fa ? "پذیرش درخواست از سراسر ایران" : "Requests across Iran"}</span><span><FiClock />{fa ? "پیگیری در سریع‌ترین زمان ممکن" : "Follow-up as soon as possible"}</span></div></div><div className="sell-hero-mark"><img src="/images/brand-mark.png" alt="" /><strong>{fa ? "فرش شبستری" : "Shabestari Carpet"}</strong></div></section>
    <section className="sell-workspace" ref={workspace}><aside className="sell-summary"><div className="sell-summary-brand"><img src="/images/brand-mark.png" alt="" /><div><strong>{fa ? "فرشت رو به ما بفروش" : "Sell your rug"}</strong><small>{fa ? "حدود ۲ دقیقه" : "About 2 minutes"}</small></div></div><ol className="sell-progress" aria-label={fa ? "مراحل ثبت درخواست" : "Request steps"}>{[fa ? "نوع فرش و تصاویر" : "Rug type & photos", fa ? "راه ارتباطی" : "Contact details", fa ? "اطلاعات تکمیلی" : "Optional details"].map((item, index) => <li key={item} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} aria-current={step === index + 1 ? "step" : undefined}><span>{step > index + 1 ? <FiCheck /> : (index + 1).toLocaleString(fa ? "fa-IR" : "en-US")}</span><div><small>{fa ? `مرحله ${(index + 1).toLocaleString("fa-IR")}` : `Step ${index + 1}`}</small><strong>{item}</strong></div></li>)}</ol><div className="summary-note"><FiInfo /><p>{fa ? "ثبت درخواست به معنی تعهد خرید یا اعلام قیمت نیست؛ قیمت نهایی پس از بازدید و توافق حضوری مشخص می‌شود." : "Submitting is not a purchase commitment or price quote. Final pricing follows an in-person inspection."}</p></div></aside>
      <form className="sell-form" onSubmit={submit} noValidate>{step === 1 ? <StepOne fa={fa} draft={draft} set={set} images={images} setImages={setImages} addImages={addImages} errors={errors} heading={heading} label={label} /> : step === 2 ? <StepTwo fa={fa} draft={draft} set={set} provinces={references.province || []} errors={errors} heading={heading} /> : <StepThree fa={fa} draft={draft} set={set} references={references} errors={errors} heading={heading} label={label} />}<footer className="sell-actions">{step > 1 ? <button type="button" className="button" onClick={() => go(step - 1)}>{fa ? <FiArrowRight /> : <FiArrowLeft />}{fa ? "بازگشت" : "Back"}</button> : <span />}<button className="button button-primary" disabled={submitting}>{submitting ? (fa ? "در حال ثبت…" : "Submitting…") : step < 3 ? (fa ? "ادامه" : "Continue") : (fa ? "ثبت درخواست فروش" : "Submit sell request")}{fa ? <FiArrowLeft /> : <FiArrowRight />}</button></footer>{submitError && <p className="sell-submit-error" role="alert">{submitError}</p>}</form>
    </section><p className="sell-legal"><FiShield />{fa ? "شماره تماس و نشانی فقط برای بررسی درخواست و تماس کارشناسان استفاده می‌شود." : "Your phone and address are only used to review the request and contact you."}</p></main><PublicFooter language={language} store={store} /></div>;
}

function StepHeader({ heading, fa, step, title, text }: { heading: RefObject<HTMLHeadingElement | null>; fa: boolean; step: number; title: string; text: string }) { return <header className="sell-step-head"><small>{fa ? `مرحله ${step.toLocaleString("fa-IR")} از ۳` : `Step ${step} of 3`}</small><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{text}</p></header>; }
function ErrorText({ value }: { value?: string }) { return <span className="field-error" role="alert">{value}</span>; }
function Mark({ required, fa }: { required?: boolean; fa: boolean }) { return <small className={required ? "required-mark" : "optional-mark"}>{required ? (fa ? "اجباری" : "Required") : (fa ? "اختیاری" : "Optional")}</small>; }

function StepOne({ fa, draft, set, images, setImages, addImages, errors, heading, label }: StepProps & { images: PendingImage[]; setImages: Dispatch<SetStateAction<PendingImage[]>>; addImages: (event: ChangeEvent<HTMLInputElement>) => void; label: (key: string) => string }) {
  const removeImage = (index: number) => setImages((current) => {
    const removed = current[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    return current.filter((_, itemIndex) => itemIndex !== index);
  });
  return <section className="sell-step"><StepHeader heading={heading} fa={fa} step={1} title={fa ? "نوع فرش و تصاویر" : "Rug type & photos"} text={fa ? "از کل فرش و جزئیات بافت عکس واضح بگیرید." : "Add clear photos of the whole rug and its weave."} /><fieldset><legend>{fa ? "نوع فرش" : "Rug type"}<Mark required fa={fa} /></legend><div className="sell-type-grid">{["handmade", "machine"].map((type) => <label key={type} className={draft.rug_type === type ? "selected" : ""}><input type="radio" name="rug_type" checked={draft.rug_type === type} onChange={() => set("rug_type", type)} />{type === "handmade" ? <FiAward /> : <FiLayers />}<strong>{label(type)}</strong><small>{type === "handmade" ? (fa ? "بافت سنتی و هنری" : "Traditional, artisan weave") : (fa ? "بافت کارخانه‌ای" : "Factory woven")}</small></label>)}</div><ErrorText value={errors.rug_type} /></fieldset><div className="sell-upload-head"><span>{fa ? "تصاویر فرش" : "Rug photos"}<Mark required fa={fa} /></span><label className="sell-upload"><FiCamera /><strong>{fa ? "افزودن تصاویر" : "Add photos"}</strong><small>{fa ? "حداقل ۱ و حداکثر ۴ تصویر · هر فایل حداکثر ۱۵ مگابایت" : "1–4 images · up to 15 MB each"}</small><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addImages} /></label><ErrorText value={errors.images} /><div className="sell-photo-list">{images.map((image, index) => <Photo key={`${image.file.name}-${image.file.lastModified}`} image={image} index={index} remove={() => removeImage(index)} fa={fa} />)}</div></div><aside className="photo-guide"><FiCamera /><strong>{fa ? "برای بررسی بهتر این عکس‌ها را پیشنهاد می‌کنیم" : "Helpful photos for a faster review"}</strong><ol>{(fa ? ["نمای کامل فرش", "پشت فرش و نوع بافت", "نمای نزدیک طرح و الیاف", "آسیب، لکه یا پارگی احتمالی"] : ["Full view of the rug", "Back and weave", "Close-up of pattern and fibres", "Any damage, stain or tear"]).map((item, i) => <li key={item}><span>{i + 1}</span>{item}</li>)}</ol></aside></section>;
}
function Photo({ image, index, remove, fa }: { image: PendingImage; index: number; remove: () => void; fa: boolean }) {
  return <figure><img src={image.previewUrl} alt={`${fa ? "تصویر فرش" : "Rug photo"} ${index + 1}`} /><button type="button" onClick={remove} aria-label={fa ? "حذف تصویر" : "Remove photo"}><FiX /></button></figure>;
}

function StepTwo({ fa, draft, set, provinces, errors, heading }: StepProps & { provinces: ReferenceItem[] }) { return <section className="sell-step"><StepHeader heading={heading} fa={fa} step={2} title={fa ? "راه ارتباطی" : "Contact details"} text={fa ? "فقط برای بررسی درخواست و هماهنگی بازدید با شما تماس می‌گیریم." : "We will only use this to review the request and arrange an inspection."} /><div className="sell-fields"><Field label={fa ? "شماره موبایل مالک" : "Owner mobile number"} required fa={fa} error={errors.phone_number}><input dir="ltr" inputMode="tel" maxLength={13} placeholder="09xxxxxxxxx / +989xxxxxxxxx" value={draft.phone_number} onChange={(e) => set("phone_number", e.target.value)} /></Field><Field label={fa ? "استان محل فرش" : "Rug location province"} required fa={fa} error={errors.province}><SearchableSelect options={provinces} value={draft.province} onChange={(value) => set("province", value)} fa={fa} /></Field><Field label={fa ? "آدرس محل بازدید" : "Inspection address"} fa={fa}><input maxLength={250} value={draft.address} onChange={(e) => set("address", e.target.value)} /></Field></div><div className="privacy-note"><FiShield /><div><strong>{fa ? "اطلاعات شما عمومی نمی‌شود" : "Your details stay private"}</strong><p>{fa ? "شماره تماس و نشانی فقط در اختیار تیم بررسی فرش شبستری قرار می‌گیرد و در آمار عمومی ثبت نمی‌شود." : "Your phone and address are only available to the Shabestari review team and excluded from public analytics."}</p></div></div></section>; }

function StepThree({ fa, draft, set, references, errors, heading, label }: StepProps & { references: References; label: (key: string) => string }) {
  const text = (key: string, label: string) => <TextField key={key} fa={fa} draft={draft} set={set} errors={errors} name={key as keyof Draft} label={label} />;
  const select = (key: string, label: string, items: ReferenceItem[]) => <SelectField key={key} fa={fa} draft={draft} set={set} name={key as keyof Draft} label={label} items={items} />;
  return <section className="sell-step"><StepHeader heading={heading} fa={fa} step={3} title={fa ? "اطلاعات تکمیلی" : "Optional details"} text={fa ? "فقط موارد علامت‌خورده ضروری‌اند؛ اگر مشخصات تخصصی فرش را نمی‌دانید، از آن‌ها عبور کنید." : "Skip any specialist details you do not know."} /><div className="optional-banner"><FiClock />{fa ? "تمام مشخصات این مرحله اختیاری است؛ اگر مطمئن نیستید، مستقیم درخواست را ثبت کنید." : "Every specification in this step is optional. If unsure, submit now."}</div><div className="sell-fields">{text("length_cm", fa ? "طول (سانتی‌متر)" : "Length (cm)")}{text("width_cm", fa ? "عرض (سانتی‌متر)" : "Width (cm)")}{select("city", fa ? "شهر بافت / تولید" : "Origin", references.city || [])}<Field label={fa ? "وضعیت محصول" : "Condition"} fa={fa}><select value={draft.condition} onChange={(e) => set("condition", e.target.value)}><option value="">{fa ? "انتخاب کنید" : "Select"}</option><option value="new">{label("new") === "new" ? (fa ? "نو" : "New") : label("new")}</option><option value="used">{fa ? "دست‌دوم" : "Pre-owned"}</option></select></Field>{text("approximate_age_years", fa ? "قدمت تقریبی (سال)" : "Approximate age (years)")}{select("pattern", fa ? "طرح" : "Pattern", references.pattern || [])}<Multi fa={fa} draft={draft} set={set} name="materials" label={fa ? "جنس" : "Material"} items={references.material || []} /><Multi fa={fa} draft={draft} set={set} name="colors" label={fa ? "رنگ" : "Colour"} items={references.color || []} />{draft.rug_type === "machine" ? <>{text("reeds", fa ? "شانه" : "Reeds")}{text("density", fa ? "تراکم" : "Density")}{select("brand", fa ? "برند / کارخانه" : "Brand / factory", references.brand || [])}</> : text("raj", fa ? "رج" : "Raj")}<Field label={fa ? "توضیحات یا آسیب‌های فرش" : "Notes or visible damage"} fa={fa} full><textarea maxLength={2000} value={draft.description} onChange={(e) => set("description", e.target.value)} /></Field></div></section>;
}
function TextField({ fa, draft, set, errors, name, label }: { fa: boolean; draft: Draft; set: DraftSetter; errors: Record<string, string>; name: keyof Draft; label: string }) { return <Field label={label} fa={fa} error={errors[name]}><input inputMode="numeric" value={draft[name] as string} onChange={(e) => set(name, e.target.value)} /></Field>; }
function SelectField({ fa, draft, set, name, label, items }: { fa: boolean; draft: Draft; set: DraftSetter; name: keyof Draft; label: string; items: ReferenceItem[] }) { return <Field label={label} fa={fa}><select value={draft[name] as string} onChange={(e) => set(name, e.target.value)}><option value="">{fa ? "انتخاب کنید" : "Select"}</option>{items.map((item) => <option key={item.id} value={String(item.id)}>{fa ? item.label_fa : item.label_en}</option>)}</select></Field>; }
function Multi({ fa, draft, set, name, label, items }: { fa: boolean; draft: Draft; set: DraftSetter; name: "materials" | "colors"; label: string; items: ReferenceItem[] }) { const selected = draft[name]; return <fieldset className="sell-multi"><legend>{label}<Mark fa={fa} /></legend><div>{items.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(String(item.id))} onChange={() => set(name, selected.includes(String(item.id)) ? selected.filter((v: string) => v !== String(item.id)) : [...selected, String(item.id)])} />{fa ? item.label_fa : item.label_en}</label>)}</div></fieldset>; }

function Field({ label, required, fa, error, full, children }: { label: string; required?: boolean; fa: boolean; error?: string; full?: boolean; children: ReactNode }) { return <label className={`sell-field ${full ? "full" : ""}`}><span>{label}<Mark required={required} fa={fa} /></span>{children}<ErrorText value={error} /></label>; }

function SearchableSelect({ options, value, onChange, fa }: { options: ReferenceItem[]; value: string; onChange: (value: string) => void; fa: boolean }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [active, setActive] = useState(0); const root = useRef<HTMLDivElement>(null);
  const filtered = options.filter((item) => `${item.label_fa} ${item.label_en}`.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find((item) => String(item.id) === value);
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  function keys(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); setActive((current) => Math.max(0, Math.min(filtered.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))); } if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); onChange(String(filtered[active].id)); setOpen(false); } }
  return <div className="search-select" ref={root} onKeyDown={keys}><button type="button" role="combobox" aria-expanded={open} aria-controls="province-options" onClick={() => setOpen((v) => !v)}>{selected ? (fa ? selected.label_fa : selected.label_en) : (fa ? "انتخاب کنید" : "Select")}</button>{open && <div className="search-select-popup"><input autoFocus type="search" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} placeholder={fa ? "جستجوی استان…" : "Search provinces…"} /><div id="province-options" role="listbox">{filtered.map((item, index) => <button type="button" role="option" aria-selected={String(item.id) === value} className={index === active ? "active" : ""} key={item.id} onMouseEnter={() => setActive(index)} onClick={() => { onChange(String(item.id)); setOpen(false); }}>{fa ? item.label_fa : item.label_en}{String(item.id) === value && <FiCheck />}</button>)}</div></div>}</div>;
}

function normalizePhone(value: string) { const normalized = toEnglishDigits(value).replace(/[^\d+]/g, "").replace(/^0098/, "0").replace(/^\+98/, "0"); return /^09\d{9}$/.test(normalized) ? normalized : ""; }
function toEnglishDigits(value: string) { return String(value).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))); }
function attribution(params: URLSearchParams) { return { utm_source: params.get("utm_source") || "", utm_medium: params.get("utm_medium") || "", utm_campaign: params.get("utm_campaign") || "", utm_term: params.get("utm_term") || "", utm_content: params.get("utm_content") || "" }; }
function apiError(error: unknown) { if (!(error instanceof Error)) return ""; const payload = (error as Error & { payload?: { error?: { details?: Record<string, string[]> } } }).payload; const details = payload?.error?.details; return details ? Object.values(details).flat().join(" ") : ""; }

export function SellSuccessClient({ store }: { store: Store | null }) { const params = useSearchParams(); const language: Language = params.get("lang") === "en" ? "en" : "fa"; const fa = language === "fa"; const code = params.get("code"); const [copied, setCopied] = useState(false); return <div dir={fa ? "rtl" : "ltr"}><PublicHeader language={language} /><main className="sell-success">{code ? <><div className="success-emblem"><img src="/images/brand-mark.png" alt="" /></div><span className="success-icon"><FiCheck /></span><h1>{fa ? "درخواست شما با موفقیت دریافت شد" : "We received your request"}</h1><p>{fa ? "کارشناسان ما پس از بررسی تصاویر، در سریع‌ترین زمان ممکن برای هماهنگی بازدید، قیمت‌گذاری و خرید با شما تماس می‌گیرند." : "Our experts will review your photos and contact you to arrange an inspection, appraisal and possible purchase."}</p><div className="tracking-card"><small>{fa ? "کد پیگیری" : "Tracking code"}</small><strong dir="ltr">{code}</strong><button className="button" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); }}><FiCopy />{copied ? (fa ? "کپی شد" : "Copied") : (fa ? "کپی کد پیگیری" : "Copy tracking code")}</button></div><div className="success-actions"><Link className="button button-primary" href={`/Market/sell?lang=${language}`}><FiPlus />{fa ? "ثبت درخواست برای فرش دیگر" : "Submit another rug"}</Link><a className="button" href={`tel:${store?.mobile_number}`}><FiPhone />{fa ? "تماس با فروشگاه" : "Call the store"}</a></div><div className="success-notice"><FiInfo /><span>{fa ? "ثبت درخواست به معنی تعهد خرید یا اعلام قیمت نیست؛ قیمت نهایی پس از بازدید و توافق حضوری مشخص می‌شود." : "Submitting is not a purchase commitment or price quote."}</span></div></> : <><h1>{fa ? "کد پیگیری در دسترس نیست" : "Tracking code unavailable"}</h1><Link className="button" href={`/Market/sell?lang=${language}`}>{fa ? "بازگشت به فرم" : "Back to form"}</Link></>}</main><PublicFooter language={language} store={store} /></div>; }
