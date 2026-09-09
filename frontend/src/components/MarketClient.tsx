"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiChevronDown, FiSearch, FiSliders, FiX } from "react-icons/fi";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { MarketingBanner } from "./MarketingBanner";
import { StatusBadge } from "./StatusBadge";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { number, t } from "@/lib/i18n";
import type { Language, PaginatedProducts, Product, References, Store } from "@/lib/types";

const filterGroups = ["city", "weave", "material", "color", "pattern"] as const;

function cover(product: Product) {
  return product.images.find((item) => item.is_cover) ?? product.images[0];
}

function digitsOnly(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
}

export function MarketClient({ initialData = null, initialReferences = {}, initialStore = null }: { initialData?: PaginatedProducts | null; initialReferences?: References; initialStore?: Store | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language: Language = searchParams.get("lang") === "en" ? "en" : "fa";
  const [data, setData] = useState<PaginatedProducts | null>(initialData);
  const [references, setReferences] = useState<References>(initialReferences);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [minPriceRaw, setMinPriceRaw] = useState(searchParams.get("min_price") ?? "");
  const [maxPriceRaw, setMaxPriceRaw] = useState(searchParams.get("max_price") ?? "");
  const firstRender = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lang", language);
      const [products, refs] = await Promise.all([
        apiFetch<PaginatedProducts>(`/products/?${params}`),
        apiFetch<References>("/references/")
      ]);
      setData(products);
      setReferences(refs);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [language, searchParams]);

  useEffect(() => {
    if (firstRender.current && initialData) { firstRender.current = false; return; }
    firstRender.current = false;
    void load();
  }, [initialData, load]);

  useEffect(() => {
    track("market_viewed", language);
  }, [language]);

  const updateParams = (changes: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      params.delete(key);
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else if (value) params.set(key, value);
    });
    if (!Object.hasOwn(changes, "page")) params.delete("page");
    router.push(`/Market?${params}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    track("search_performed", language, { query: trimmed });
    updateParams({ q: trimmed || null, page: null });
  };

  const toggleMulti = (key: string, value: string) => {
    const current = searchParams.getAll(key);
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    track("filter_applied", language, { filter_name: key, values: next });
    updateParams({ [key]: next, page: null });
  };

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; value: string; label: string }> = [];
    ["type", "condition", ...filterGroups, "brand"].forEach((key) => {
      searchParams.getAll(key).forEach((value) => {
        const reference = references[key]?.find((item) => item.code === value);
        const label = key === "type" ? t(language, value as "handmade" | "machine") : key === "condition" ? t(language, value as "new" | "used") : reference?.[language === "fa" ? "label_fa" : "label_en"] ?? value;
        items.push({ key, value, label });
      });
    });
    if (searchParams.get("min_price") || searchParams.get("max_price")) items.push({ key: "price", value: "", label: language === "fa" ? "بازه قیمت" : "Price range" });
    if (searchParams.get("min_raj") || searchParams.get("max_raj")) items.push({ key: "raj", value: "", label: language === "fa" ? "بازه رج" : "Raj range" });
    if (searchParams.getAll("reeds").length) items.push({ key: "reeds", value: "", label: language === "fa" ? "شانه" : "Reeds" });
    if (searchParams.getAll("density").length) items.push({ key: "density", value: "", label: language === "fa" ? "تراکم" : "Density" });
    return items;
  }, [language, references, searchParams]);

  const removeFilter = (key: string, value: string) => {
    if (key === "price") { setMinPriceRaw(""); setMaxPriceRaw(""); return updateParams({ min_price: null, max_price: null }); }
    if (key === "raj") return updateParams({ min_raj: null, max_raj: null });
    if (key === "reeds" || key === "density") return updateParams({ [key]: null });
    updateParams({ [key]: searchParams.getAll(key).filter((item) => item !== value) });
  };

  const filters = (
    <aside className={`filters-panel ${mobileFilters ? "filters-panel-open" : ""}`}>
      <div className="filters-title">
        <FiSliders /> <strong>{t(language, "filters")}</strong>
        <button className="mobile-only icon-button" onClick={() => setMobileFilters(false)} aria-label="Close"><FiX /></button>
      </div>
      <FilterSection label={language === "fa" ? "نوع فرش" : "Carpet type"}>
        {(["handmade", "machine"] as const).map((value) => (
          <Check key={value} label={t(language, value)} checked={searchParams.getAll("type").includes(value)} onChange={() => toggleMulti("type", value)} />
        ))}
      </FilterSection>
      <FilterSection label={`${language === "fa" ? "قیمت" : "Price"} (${t(language, "toman")})`} open>
        <div className="range-grid">
          <label>{language === "fa" ? "حداقل" : "Min"}<input inputMode="numeric" value={minPriceRaw ? number(language, Number(minPriceRaw)) : ""} placeholder={language === "fa" ? `مثال: ${number(language, 20000000)}` : `e.g. ${number(language, 20000000)}`} onChange={(e) => setMinPriceRaw(digitsOnly(e.target.value))} onBlur={() => updateParams({ min_price: minPriceRaw || null })} /></label>
          <label>{language === "fa" ? "حداکثر" : "Max"}<input inputMode="numeric" value={maxPriceRaw ? number(language, Number(maxPriceRaw)) : ""} placeholder={language === "fa" ? `مثال: ${number(language, 500000000)}` : `e.g. ${number(language, 500000000)}`} onChange={(e) => setMaxPriceRaw(digitsOnly(e.target.value))} onBlur={() => updateParams({ max_price: maxPriceRaw || null })} /></label>
        </div>
      </FilterSection>
      {filterGroups.map((group) => (
        <FilterSection key={group} label={{ city: language === "fa" ? "شهر بافت" : "Origin", weave: t(language, "weave"), material: t(language, "material"), color: t(language, "color"), pattern: t(language, "pattern") }[group]}>
          {(references[group] ?? []).map((item) => (
            <Check key={item.code} label={item[language === "fa" ? "label_fa" : "label_en"]} checked={searchParams.getAll(group).includes(item.code)} onChange={() => toggleMulti(group, item.code)} />
          ))}
        </FilterSection>
      ))}
      {(searchParams.getAll("type").length === 0 || searchParams.getAll("type").includes("handmade")) && <FilterSection label={language === "fa" ? "رج" : "Raj"}><div className="range-grid"><label>{language === "fa" ? "حداقل" : "Min"}<input inputMode="numeric" defaultValue={searchParams.get("min_raj") ?? ""} onBlur={(e) => updateParams({ min_raj: e.target.value || null })} /></label><label>{language === "fa" ? "حداکثر" : "Max"}<input inputMode="numeric" defaultValue={searchParams.get("max_raj") ?? ""} onBlur={(e) => updateParams({ max_raj: e.target.value || null })} /></label></div></FilterSection>}
      {(searchParams.getAll("type").length === 0 || searchParams.getAll("type").includes("machine")) && <><FilterSection label={language === "fa" ? "برند" : "Brand"}>{(references.brand ?? []).map((item) => <Check key={item.code} label={item[language === "fa" ? "label_fa" : "label_en"]} checked={searchParams.getAll("brand").includes(item.code)} onChange={() => toggleMulti("brand", item.code)} />)}</FilterSection><FilterSection label={language === "fa" ? "شانه" : "Reeds"}>{["700", "1000", "1200", "1500"].map((value) => <Check key={value} label={number(language, Number(value))} checked={searchParams.getAll("reeds").includes(value)} onChange={() => toggleMulti("reeds", value)} />)}</FilterSection><FilterSection label={language === "fa" ? "تراکم" : "Density"}>{["2100", "3000", "3600", "4500"].map((value) => <Check key={value} label={number(language, Number(value))} checked={searchParams.getAll("density").includes(value)} onChange={() => toggleMulti("density", value)} />)}</FilterSection></>}
      <FilterSection label={t(language, "condition")}>
        {(["new", "used"] as const).map((value) => <Check key={value} label={t(language, value)} checked={searchParams.getAll("condition").includes(value)} onChange={() => toggleMulti("condition", value)} />)}
      </FilterSection>
      <button className="text-button clear-button" onClick={() => { setMinPriceRaw(""); setMaxPriceRaw(""); router.push(`/Market?lang=${language}`); }}><FiX />{t(language, "clear")}</button>
    </aside>
  );

  return (
    <div dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
      <PublicHeader language={language} />
      <main className="market-page">
        <MarketingBanner language={language} />
        <section className="market-intro">
          <h1>{t(language, "find")}</h1>
          <form className="search-box" onSubmit={submitSearch}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(language, "search")} aria-label={t(language, "search")} />
            <button aria-label="Search"><FiSearch /></button>
          </form>
        </section>
        <div className="market-layout">
          {filters}
          <section className="catalog-area">
            <div className="catalog-toolbar">
              <span>{number(language, data?.count ?? 0)} {t(language, "result")}</span>
              <div className="toolbar-actions">
                <button className="filter-trigger" onClick={() => setMobileFilters(true)}><FiSliders />{t(language, "filters")}</button>
                <label className="sort-select">
                  <select value={searchParams.get("sort") ?? "newest"} onChange={(e) => { track("sort_changed", language, { sort_value: e.target.value }); updateParams({ sort: e.target.value === "newest" ? null : e.target.value }); }}>
                    <option value="newest">{t(language, "newest")}</option>
                    <option value="price_asc">{t(language, "priceAsc")}</option>
                    <option value="price_desc">{t(language, "priceDesc")}</option>
                  </select>
                  <FiChevronDown />
                </label>
              </div>
            </div>
            <div className="active-filters">
              {activeFilters.map((item) => <button className="filter-chip" key={`${item.key}-${item.value}`} onClick={() => removeFilter(item.key, item.value)}>{item.label}<FiX /></button>)}
            </div>
            {loading ? <div className="loading-state">{language === "fa" ? "در حال بارگذاری فرش‌ها…" : "Loading carpets…"}</div> : error ? <div className="empty-state"><h2>{language === "fa" ? "بارگذاری انجام نشد" : "Could not load the gallery"}</h2><button className="button" onClick={() => void load()}>{language === "fa" ? "تلاش دوباره" : "Try again"}</button></div> : data?.results.length ? (
              <>
                <div className="product-grid">
                  {data.results.map((product) => <ProductCard key={product.public_id} product={product} language={language} query={searchParams.toString()} />)}
                </div>
                <Pagination data={data} language={language} current={Number(searchParams.get("page") ?? 1)} onPage={(page) => updateParams({ page: page === 1 ? null : String(page) })} />
              </>
            ) : <div className="empty-state"><FiSearch /><h2>{t(language, "noResults")}</h2><button className="button" onClick={() => router.push(`/Market?lang=${language}`)}>{t(language, "clear")}</button></div>}
          </section>
        </div>
      </main>
      {mobileFilters && <button className="drawer-backdrop" aria-label="Close filters" onClick={() => setMobileFilters(false)} />}
      <PublicFooter language={language} store={initialStore} />
    </div>
  );
}

function FilterSection({ label, children, open = false }: { label: string; children: React.ReactNode; open?: boolean }) {
  return <details className="filter-section" open={open}><summary>{label}<FiChevronDown /></summary><div className="filter-body">{children}</div></details>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="check-row"><input type="checkbox" checked={checked} onChange={onChange} /><span>{label}</span></label>;
}

function ProductCard({ product, language, query }: { product: Product; language: Language; query: string }) {
  const image = cover(product);
  return (
    <Link className="product-card" href={`/Market/${product.public_id}?lang=${language}&return=${encodeURIComponent(query)}`} onClick={() => track("product_card_clicked", language, { product_public_id: product.public_id })}>
      <div className="product-photo">{image && <img src={image.url} alt={language === "fa" ? image.alt_fa : image.alt_en} />}</div>
      <h2>{product.title}</h2>
      <p>{number(language, product.length_cm / 100)} × {number(language, product.width_cm / 100)} {language === "fa" ? "متر" : "m"} · {product.city.label}</p>
      <strong>{number(language, product.price_toman)} <small>{t(language, "toman")}</small></strong>
      <StatusBadge status={product.inventory_status} language={language} />
    </Link>
  );
}

function Pagination({ data, current, language, onPage }: { data: PaginatedProducts; current: number; language: Language; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.count / 9));
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Pagination">{Array.from({ length: pages }, (_, i) => i + 1).map((page) => <button key={page} className={page === current ? "current" : ""} onClick={() => onPage(page)} aria-label={`${language === "fa" ? "صفحه" : "Page"} ${page}`}>{number(language, page)}</button>)}</nav>;
}
