"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiGrid, FiMapPin, FiMaximize2, FiPhone, FiX } from "react-icons/fi";
import { PublicHeader } from "./PublicHeader";
import { StatusBadge } from "./StatusBadge";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { number, t, typeLabel } from "@/lib/i18n";
import type { Language, Product } from "@/lib/types";

export function ProductDetailClient({ initialProduct = null }: { initialProduct?: Product | null }) {
  const params = useParams<{ publicId: string }>();
  const search = useSearchParams();
  const language: Language = search.get("lang") === "en" ? "en" : "fa";
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const firstRender = useRef(true);
  const returnQuery = search.get("return") ?? `lang=${language}`;

  useEffect(() => {
    if (firstRender.current && initialProduct) {
      firstRender.current = false;
      const coverIndex = initialProduct.images.findIndex((image) => image.is_cover);
      setImageIndex(Math.max(0, coverIndex));
      track("product_viewed", language, { product_public_id: initialProduct.public_id, inventory_status: initialProduct.inventory_status });
      return;
    }
    firstRender.current = false;
    setLoading(true);
    apiFetch<Product>(`/products/${params.publicId}/?lang=${language}`)
      .then((value) => {
        setProduct(value);
        const coverIndex = value.images.findIndex((image) => image.is_cover);
        setImageIndex(Math.max(0, coverIndex));
        track("product_viewed", language, { product_public_id: value.public_id, inventory_status: value.inventory_status });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [initialProduct, language, params.publicId]);

  const specs = useMemo(() => {
    if (!product) return [];
    return [
      [t(language, "dimensions"), `${number(language, product.length_cm / 100)} × ${number(language, product.width_cm / 100)} ${language === "fa" ? "متر" : "m"}`],
      [t(language, "area"), `${number(language, product.area_square_meters)} ${language === "fa" ? "مترمربع" : "m²"}`],
      [t(language, "city"), product.city.label],
      [language === "fa" ? "نوع فرش" : "Carpet type", typeLabel(language, product.rug_type)],
      [t(language, "weave"), product.weave.label],
      [t(language, "material"), product.materials.map((item) => item.label).join(language === "fa" ? "، " : ", ")],
      [t(language, "color"), product.colors.map((item) => item.label).join(language === "fa" ? "، " : ", ")],
      [t(language, "pattern"), product.pattern.label],
      [t(language, "condition"), t(language, product.condition)],
      [t(language, "age"), `${number(language, product.approximate_age_years)} ${language === "fa" ? "سال" : "years"}`],
      ...(product.rug_type === "handmade" ? [[t(language, "raj"), number(language, product.raj ?? 0)]] : [[t(language, "reeds"), number(language, product.reeds ?? 0)], [t(language, "density"), number(language, product.density ?? 0)], [t(language, "brandField"), product.brand?.label ?? "—"]])
    ];
  }, [language, product]);

  const showContact = () => {
    if (!product) return;
    track("contact_clicked", language, { product_public_id: product.public_id });
    setContactOpen(true);
  };

  if (loading) return <div dir={language === "fa" ? "rtl" : "ltr"}><PublicHeader language={language} /><main className="loading-state">{language === "fa" ? "در حال بارگذاری فرش…" : "Loading carpet…"}</main></div>;
  if (error || !product) return <div dir={language === "fa" ? "rtl" : "ltr"}><PublicHeader language={language} /><main className="empty-state"><h1>{language === "fa" ? "این فرش در دسترس نیست" : "This carpet is unavailable"}</h1><Link className="button button-primary" href={`/Market?${returnQuery}`}>{t(language, "back")}</Link></main></div>;

  const image = product.images[imageIndex];
  return (
    <div dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
      <PublicHeader language={language} />
      <main className="detail-page">
        <nav className="breadcrumb">
          <Link href={`/Market?${returnQuery}`}>{t(language, "back")}</Link>
          {language === "fa" ? <FiChevronLeft /> : <FiChevronRight />}
          <span>{product.title}</span>
        </nav>
        <div className="detail-layout">
          <section className="detail-gallery" aria-label="Gallery">
            <button className="gallery-main" onClick={() => { setZoomOpen(true); track("gallery_interacted", language, { product_public_id: product.public_id }); }}>
              {image && <img src={image.url} alt={language === "fa" ? image.alt_fa : image.alt_en} />}
              <span><FiMaximize2 /></span>
            </button>
            <div className="gallery-thumbs">{product.images.map((item, index) => <button key={item.id} className={index === imageIndex ? "active" : ""} onClick={() => { setImageIndex(index); track("gallery_interacted", language, { product_public_id: product.public_id }); }}><img src={item.url} alt="" /></button>)}</div>
          </section>
          <section className="detail-copy">
            <p className="eyebrow">{typeLabel(language, product.rug_type)} · {product.city.label}</p>
            <h1>{product.title}</h1>
            <StatusBadge status={product.inventory_status} language={language} />
            <div className="detail-price">{number(language, product.price_toman)} <small>{t(language, "toman")}</small></div>
            {language === "en" && <p className="rate-unavailable">{t(language, "unavailableRate")}</p>}
            {product.inventory_status !== "available" && <div className={`notice ${product.inventory_status === "reserved" ? "notice-warning" : ""}`}>{product.inventory_status === "sold" ? (language === "fa" ? "این فرش فروخته شده است؛ برای اطلاعات بیشتر همچنان می‌توانید تماس بگیرید." : "This carpet has been sold; you can still contact the gallery for more information.") : (language === "fa" ? "این فرش رزرو شده است؛ تماس با فروشنده همچنان امکان‌پذیر است." : "This carpet is reserved; you can still contact the gallery.")}</div>}
            <button className="button button-primary contact-button" onClick={showContact}><FiPhone />{t(language, "contact")}</button>
            <section className="spec-card" id="specifications">
              <h2><FiGrid />{t(language, "specs")}</h2>
              <dl>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            </section>
            <section className="store-card">
              <strong>{language === "fa" ? product.store.name_fa : product.store.name_en}</strong>
              <p>{language === "fa" ? product.store.city_fa : product.store.city_en} · {language === "fa" ? "برای مشاهده حضوری با فروشنده هماهنگ کنید." : "Arrange a visit directly with the gallery."}</p>
              <small>{language === "fa" ? "خرید و پرداخت به‌صورت حضوری انجام می‌شود." : "Purchase and payment take place in person."}</small>
            </section>
            {product.description && <section className="description"><h2>{language === "fa" ? "درباره این فرش" : "About this carpet"}</h2><p>{product.description}</p></section>}
          </section>
        </div>
      </main>
      <div className="mobile-contact-bar"><div><strong>{number(language, product.price_toman)}</strong><small>{t(language, "toman")}</small></div><button className="button button-primary" onClick={showContact}><FiPhone />{t(language, "contact")}</button></div>
      {contactOpen && <Modal onClose={() => setContactOpen(false)} title={t(language, "contact")}><h3>{language === "fa" ? product.store.name_fa : product.store.name_en}</h3><p>{product.title}</p><bdi className="contact-phone">{product.store.mobile_number}</bdi><a className="button button-primary block" href={`tel:${product.store.mobile_number}`} onClick={() => track("phone_call_clicked", language, { product_public_id: product.public_id })}><FiPhone />{t(language, "call")}</a><div className="contact-location"><FiMapPin /><div><strong>{language === "fa" ? product.store.city_fa : product.store.city_en}</strong>{(language === "fa" ? product.store.address_fa : product.store.address_en) && <p>{language === "fa" ? product.store.address_fa : product.store.address_en}</p>}</div></div></Modal>}
      {zoomOpen && <Modal wide onClose={() => setZoomOpen(false)} title={product.title}><div className="zoom-image">{image && <img src={image.url} alt={product.title} />}</div></Modal>}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><FiX /></button></header><div className="modal-content">{children}</div></section></div>;
}
