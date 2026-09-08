import Link from "next/link";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import type { Language } from "@/lib/types";

export function MarketingBanner({ language }: { language: Language }) {
  const fa = language === "fa";
  const Arrow = fa ? FiArrowLeft : FiArrowRight;
  return <section className="marketing-banner" aria-labelledby="sell-banner-title"><div className="marketing-banner-inner"><img src="/images/brand-mark.png" alt="" /><div><small>{fa ? "خرید مستقیم و کارشناسی سریع" : "Direct purchase · Fast appraisal"}</small><h2 id="sell-banner-title">{fa ? "فرشت، ارزش واقعی‌ش رو اینجا پیدا می‌کنه." : "Your rug deserves its true value."}</h2><p>{fa ? "چند عکس بفرست؛ کارشناسان فرش شبستری سریع بررسی می‌کنند و برای یک پیشنهاد خرید منصفانه با شما تماس می‌گیرند." : "Send a few photos. Shabestari Carpet specialists will review them quickly and contact you with a fair purchase offer."}</p></div><Link href={`/Market/sell?lang=${language}`}><span>{fa ? "فرشت رو به ما بفروش" : "Sell your rug"}</span><Arrow /></Link></div></section>;
}
