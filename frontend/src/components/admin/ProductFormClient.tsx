"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiCheck, FiUploadCloud, FiX } from "react-icons/fi";
import { AdminShell } from "./AdminShell";
import { apiFetch } from "@/lib/api";
import type { AdminProduct, References, RugType, Store } from "@/lib/types";

type FormState = {
  title_fa: string;
  title_en: string;
  description_fa: string;
  description_en: string;
  price_toman: string;
  length_cm: string;
  width_cm: string;
  rug_type: RugType;
  condition: "new" | "used";
  approximate_age_years: string;
  inventory_status: "available" | "reserved" | "sold";
  city: string;
  weave: string;
  pattern: string;
  materials: string[];
  colors: string[];
  raj: string;
  reeds: string;
  density: string;
  brand: string;
};

const initial: FormState = {
  title_fa: "",
  title_en: "",
  description_fa: "",
  description_en: "",
  price_toman: "",
  length_cm: "",
  width_cm: "",
  rug_type: "handmade",
  condition: "new",
  approximate_age_years: "0",
  inventory_status: "available",
  city: "",
  weave: "",
  pattern: "",
  materials: [],
  colors: [],
  raj: "",
  reeds: "",
  density: "",
  brand: "",
};
const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

export function ProductFormClient() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [refs, setRefs] = useState<References>({});
  const [store, setStore] = useState<Store | null>(null);
  const [existing, setExisting] = useState<AdminProduct | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pendingCoverKey, setPendingCoverKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<References>("/references/"),
      apiFetch<Store>("/store/"),
      id
        ? apiFetch<AdminProduct>(`/admin/products/${id}/`)
        : Promise.resolve(null),
    ])
      .then(([references, storeData, product]) => {
        setRefs(references);
        setStore(storeData);
        setExisting(product);
        if (product)
          setForm({
            title_fa: product.title_fa,
            title_en: product.title_en,
            description_fa: product.description_fa,
            description_en: product.description_en,
            price_toman: String(product.price_toman),
            length_cm: String(product.length_cm),
            width_cm: String(product.width_cm),
            rug_type: product.rug_type,
            condition: product.condition,
            approximate_age_years: String(product.approximate_age_years),
            inventory_status: product.inventory_status,
            city: String(product.city),
            weave: String(product.weave),
            pattern: String(product.pattern),
            materials: product.materials.map((item) => String(item.id)),
            colors: product.colors.map((item) => String(item.id)),
            raj: product.raj ? String(product.raj) : "",
            reeds: product.reeds ? String(product.reeds) : "",
            density: product.density ? String(product.density) : "",
            brand: product.brand ? String(product.brand) : "",
          });
      })
      .catch(() => setError("دریافت اطلاعات فرم انجام نشد."));
  }, [id]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const change = (key: keyof FormState, value: FormState[typeof key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const toggle = (key: "materials" | "colors", value: string) =>
    change(
      key,
      form[key].includes(value)
        ? form[key].filter((item) => item !== value)
        : [...form[key], value],
    );
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  );

  const addFiles = (selected: File[]) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const duplicateKeys = new Set(files.map(fileKey));
    const valid = selected.filter(
      (file) =>
        allowedTypes.has(file.type) &&
        file.size <= 15 * 1024 * 1024 &&
        !duplicateKeys.has(fileKey(file)),
    );
    const availableSlots = Math.max(
      0,
      10 - (existing?.images.length ?? 0) - files.length,
    );
    const accepted = valid.slice(0, availableSlots);
    const issues = [];
    if (selected.some((file) => !allowedTypes.has(file.type)))
      issues.push("فقط فایل‌های JPG، PNG و WebP مجاز هستند.");
    if (selected.some((file) => file.size > 15 * 1024 * 1024))
      issues.push("حجم هر تصویر باید حداکثر ۱۵ مگابایت باشد.");
    if (valid.length > availableSlots)
      issues.push("حداکثر ۱۰ تصویر برای هر فرش مجاز است.");
    if (accepted.length) {
      setFiles((current) => [...current, ...accepted]);
      if (!existing?.images.length && !pendingCoverKey)
        setPendingCoverKey(fileKey(accepted[0]));
      setDirty(true);
    }
    setError(issues.join(" "));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!store) return;
    if (!existing?.images.length && !files.length)
      return setError("حداقل یک تصویر برای انتشار محصول لازم است.");
    if (!form.materials.length || !form.colors.length)
      return setError("حداقل یک جنس و یک رنگ انتخاب کنید.");
    setBusy(true);
    try {
      const payload = {
        store: store.id,
        title_fa: form.title_fa.trim(),
        title_en: form.title_en.trim(),
        description_fa: form.description_fa.trim(),
        description_en: form.description_en.trim(),
        price_toman: Number(form.price_toman),
        length_cm: Number(form.length_cm),
        width_cm: Number(form.width_cm),
        rug_type: form.rug_type,
        condition: form.condition,
        approximate_age_years: Number(form.approximate_age_years),
        inventory_status: form.inventory_status,
        city: Number(form.city),
        weave: Number(form.weave),
        pattern: Number(form.pattern),
        material_ids: form.materials.map(Number),
        color_ids: form.colors.map(Number),
        raj: form.rug_type === "handmade" ? Number(form.raj) : null,
        reeds: form.rug_type === "machine" ? Number(form.reeds) : null,
        density: form.rug_type === "machine" ? Number(form.density) : null,
        brand: form.rug_type === "machine" ? Number(form.brand) : null,
      };
      const product = await apiFetch<AdminProduct>(
        `/admin/products/${id ? `${id}/` : ""}`,
        { method: id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      for (let index = 0; index < files.length; index++) {
        const body = new FormData();
        body.append("image", files[index]);
        body.append("alt_fa", form.title_fa);
        body.append("alt_en", form.title_en);
        body.append(
          "sort_order",
          String((existing?.images.length ?? 0) + index),
        );
        body.append(
          "is_cover",
          String(fileKey(files[index]) === pendingCoverKey),
        );
        await apiFetch(`/admin/products/${product.public_id}/images/`, {
          method: "POST",
          body,
        });
      }
      setDirty(false);
      router.push("/Admin/products");
    } catch (reason) {
      const payload = (reason as Error & { payload?: unknown }).payload;
      setError(
        payload
          ? `ذخیره محصول انجام نشد: ${JSON.stringify(payload)}`
          : "ذخیره محصول انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  };

  const removeExistingImage = async (imageId: number) => {
    if (!existing || existing.images.length <= 1)
      return setError("محصول باید حداقل یک تصویر داشته باشد.");
    if (!window.confirm("این تصویر حذف شود؟")) return;
    try {
      await apiFetch(
        `/admin/products/${existing.public_id}/images/${imageId}/`,
        { method: "DELETE" },
      );
      const images = existing.images.filter((image) => image.id !== imageId);
      if (!images.some((image) => image.is_cover) && images[0])
        images[0] = { ...images[0], is_cover: true };
      setExisting({ ...existing, images });
      setDirty(true);
    } catch {
      setError("حذف تصویر انجام نشد.");
    }
  };

  const makeCover = async (imageId: number) => {
    if (!existing) return;
    try {
      await apiFetch(
        `/admin/products/${existing.public_id}/images/${imageId}/cover/`,
        { method: "PATCH" },
      );
      setExisting({
        ...existing,
        images: existing.images.map((image) => ({
          ...image,
          is_cover: image.id === imageId,
        })),
      });
      setPendingCoverKey(null);
      setDirty(true);
    } catch {
      setError("تغییر تصویر کاور انجام نشد.");
    }
  };

  const removePendingImage = (file: File) => {
    const remaining = files.filter((item) => item !== file);
    setFiles(remaining);
    if (pendingCoverKey === fileKey(file)) {
      const existingHasCover = existing?.images.some(
        (image) => image.is_cover,
      );
      setPendingCoverKey(
        existingHasCover
          ? null
          : remaining[0]
            ? fileKey(remaining[0])
            : null,
      );
    }
    setDirty(true);
  };

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <Link className="text-button" href="/Admin/products">
            محصولات فروشگاه
          </Link>
          <h1>{id ? "ویرایش فرش" : "افزودن فرش جدید"}</h1>
          <p>فیلدهای ستاره‌دار ضروری‌اند؛ پس از ثبت، محصول منتشر می‌شود.</p>
        </div>
      </div>
      <form className="product-form" onSubmit={submit}>
        <FormSection number="۱" title="نوع فرش و اطلاعات پایه">
          <div className="form-grid">
            <fieldset className="full rug-type">
              <legend>نوع فرش *</legend>
              {(["handmade", "machine"] as RugType[]).map((value) => (
                <label
                  className={form.rug_type === value ? "selected" : ""}
                  key={value}
                >
                  <input
                    type="radio"
                    checked={form.rug_type === value}
                    onChange={() => change("rug_type", value)}
                  />
                  {value === "handmade" ? "دستباف" : "ماشینی"}
                </label>
              ))}
            </fieldset>
            <Field label="عنوان فارسی *">
              <input
                required
                value={form.title_fa}
                onChange={(e) => change("title_fa", e.target.value)}
              />
            </Field>
            <Field label="عنوان انگلیسی *">
              <input
                required
                dir="ltr"
                value={form.title_en}
                onChange={(e) => change("title_en", e.target.value)}
              />
            </Field>
            <Field label="قیمت هر تخته (تومان) *">
              <input
                required
                min="1"
                type="number"
                value={form.price_toman}
                onChange={(e) => change("price_toman", e.target.value)}
              />
            </Field>
            <Select
              label="وضعیت موجودی *"
              value={form.inventory_status}
              onChange={(value) =>
                change(
                  "inventory_status",
                  value as FormState["inventory_status"],
                )
              }
              options={[
                ["available", "موجود"],
                ["reserved", "رزرو شده"],
                ["sold", "فروخته شده"],
              ]}
            />
            <Field label="طول (سانتی‌متر) *">
              <input
                required
                min="1"
                type="number"
                value={form.length_cm}
                onChange={(e) => change("length_cm", e.target.value)}
              />
            </Field>
            <Field label="عرض (سانتی‌متر) *">
              <input
                required
                min="1"
                type="number"
                value={form.width_cm}
                onChange={(e) => change("width_cm", e.target.value)}
              />
            </Field>
            <RefSelect
              label="شهر بافت / تولید *"
              items={refs.city}
              value={form.city}
              onChange={(value) => change("city", value)}
            />
            <Select
              label="وضعیت محصول *"
              value={form.condition}
              onChange={(value) =>
                change("condition", value as FormState["condition"])
              }
              options={[
                ["new", "نو"],
                ["used", "دست‌دوم"],
              ]}
            />
            <Field label="قدمت تقریبی (سال) *">
              <input
                required
                min="0"
                type="number"
                value={form.approximate_age_years}
                onChange={(e) =>
                  change("approximate_age_years", e.target.value)
                }
              />
            </Field>
          </div>
        </FormSection>
        <FormSection number="۲" title="مشخصات بافت">
          <div className="form-grid">
            <RefSelect
              label="نوع بافت *"
              items={refs.weave}
              value={form.weave}
              onChange={(value) => change("weave", value)}
            />
            <RefSelect
              label="طرح *"
              items={refs.pattern}
              value={form.pattern}
              onChange={(value) => change("pattern", value)}
            />
            <Multi
              label="جنس — یک یا چند مورد *"
              items={refs.material}
              selected={form.materials}
              onToggle={(value) => toggle("materials", value)}
            />
            <Multi
              label="رنگ — یک یا چند مورد *"
              items={refs.color}
              selected={form.colors}
              onToggle={(value) => toggle("colors", value)}
            />
            {form.rug_type === "handmade" ? (
              <Field label="رج *">
                <input
                  required
                  min="1"
                  type="number"
                  value={form.raj}
                  onChange={(e) => change("raj", e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="شانه *">
                  <input
                    required
                    min="1"
                    type="number"
                    value={form.reeds}
                    onChange={(e) => change("reeds", e.target.value)}
                  />
                </Field>
                <Field label="تراکم *">
                  <input
                    required
                    min="1"
                    type="number"
                    value={form.density}
                    onChange={(e) => change("density", e.target.value)}
                  />
                </Field>
                <RefSelect
                  label="برند / کارخانه *"
                  items={refs.brand}
                  value={form.brand}
                  onChange={(value) => change("brand", value)}
                />
              </>
            )}
          </div>
        </FormSection>
        <FormSection number="۳" title="تصاویر و توضیحات">
          <label className="upload-zone">
            <FiUploadCloud />
            <strong>تصاویر فرش را انتخاب کنید</strong>
            <span>حداقل ۱ و حداکثر ۱۰ تصویر · هر فایل حداکثر ۱۵ مگابایت</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                addFiles([...(e.currentTarget.files ?? [])]);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <div className="image-previews">
            {existing?.images.map((image) => (
              <div key={image.id}>
                <img src={image.url} alt="" />
                {image.is_cover && !pendingCoverKey ? (
                  <span>کاور</span>
                ) : (
                  <button
                    className="cover-action"
                    type="button"
                    title="انتخاب به‌عنوان کاور"
                    onClick={() => void makeCover(image.id)}
                  >
                    کاور
                  </button>
                )}
                <button
                  type="button"
                  title="حذف تصویر"
                  onClick={() => void removeExistingImage(image.id)}
                >
                  <FiX />
                </button>
              </div>
            ))}
            {previews.map(({ file, url }) => (
              <div
                className={
                  pendingCoverKey === fileKey(file) ? "pending-cover" : ""
                }
                key={fileKey(file)}
              >
                <img src={url} alt="" />
                {pendingCoverKey === fileKey(file) ? (
                  <span>کاور</span>
                ) : (
                  <button
                    className="cover-action"
                    type="button"
                    title="انتخاب به‌عنوان کاور"
                    onClick={() => {
                      setPendingCoverKey(fileKey(file));
                      setDirty(true);
                    }}
                  >
                    کاور
                  </button>
                )}
                <button
                  type="button"
                  title="حذف تصویر انتخاب‌شده"
                  onClick={() => removePendingImage(file)}
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
          <div className="form-grid">
            <Field label="توضیحات فارسی (اختیاری)">
              <textarea
                value={form.description_fa}
                onChange={(e) => change("description_fa", e.target.value)}
              />
            </Field>
            <Field label="توضیحات انگلیسی (اختیاری)">
              <textarea
                dir="ltr"
                value={form.description_en}
                onChange={(e) => change("description_en", e.target.value)}
              />
            </Field>
          </div>
        </FormSection>
        {error && <div className="notice notice-danger">{error}</div>}
        <div className="form-actions">
          <button className="button button-primary" disabled={busy}>
            <FiCheck />
            {busy ? "در حال ذخیره…" : id ? "ذخیره تغییرات" : "ثبت و انتشار"}
          </button>
          <Link className="button" href="/Admin/products">
            انصراف
          </Link>
          <span>{dirty ? "تغییرات ذخیره‌نشده دارید." : ""}</span>
        </div>
      </form>
    </AdminShell>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <Field label={label}>
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
function RefSelect({
  label,
  items = [],
  value,
  onChange,
}: {
  label: string;
  items?: Array<{ id?: number; label_fa: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">انتخاب کنید</option>
        {items.map((item) => (
          <option value={item.id} key={item.id}>
            {item.label_fa}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Multi({
  label,
  items = [],
  selected,
  onToggle,
}: {
  label: string;
  items?: Array<{ id?: number; label_fa: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="field full multi-field">
      <legend>{label}</legend>
      <div>
        {items.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={selected.includes(String(item.id))}
              onChange={() => onToggle(String(item.id))}
            />
            {item.label_fa}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
