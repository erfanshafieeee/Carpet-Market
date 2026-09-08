"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Language } from "@/lib/types";

export function PublicHeader({ language }: { language: Language }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const languageUrl = (lang: Language) => {
    const params = new URLSearchParams(search.toString());
    params.set("lang", lang);
    return `${pathname}?${params}`;
  };
  return (
    <header className="public-header">
      <div className="brand-cluster">
        <Link className={`brand ${language === "en" ? "brand-en" : ""}`} href={`/Market?lang=${language}`}>
          <span className="brand-mark" aria-hidden="true"><img src="/images/brand-mark.png" alt="" /></span>
          <span className="brand-copy"><strong>{language === "fa" ? "فرش شبستری" : "Shabestari Carpet"}</strong><small>{language === "fa" ? "سه شعبه در تهران" : "Three branches in Tehran"}</small></span>
        </Link>
      </div>
      <nav className="language-switch" aria-label="Language">
        <Link className={language === "fa" ? "active" : ""} href={languageUrl("fa")}>فارسی</Link>
        <span />
        <Link className={language === "en" ? "active" : ""} href={languageUrl("en")}>English</Link>
      </nav>
    </header>
  );
}

