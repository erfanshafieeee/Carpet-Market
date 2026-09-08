import Link from "next/link";
import { FiMapPin, FiPhone, FiPhoneOutgoing } from "react-icons/fi";
import type { Language, Store } from "@/lib/types";

export function PublicFooter({ language, store }: { language: Language; store: Store | null }) {
  const fa = language === "fa";
  return (
    <footer className="v2-footer">
      <div className="footer-main">
        <section className="footer-brand">
          <img src="/images/brand-mark.png" alt="" />
          <div><h2>{fa ? "فرش شبستری" : "Shabestari Carpet"}</h2><p>{fa ? "میراث در هر گره" : "Heritage in every knot"}</p><bdi>{store?.domain || "shabestaricarpet"}</bdi><Link href={`/Market/sell?lang=${language}`}>{fa ? "فرشت رو به ما بفروش" : "Sell your rug"}</Link></div>
        </section>
        <section className="footer-branches"><h2>{fa ? "نشانی شعب" : "Our branches"}</h2><ol>{store?.branches?.map((branch, index) => <li key={branch.id}><span>{index + 1}</span><div><strong>{fa ? branch.name_fa : branch.name_en}</strong><address><FiMapPin />{fa ? branch.address_fa : branch.address_en}</address></div></li>)}</ol></section>
        <section className="footer-contact"><h2>{fa ? "ارتباط با ما" : "Contact us"}</h2><a href={`tel:${store?.mobile_number}`}><FiPhone /><span><small>{fa ? "تماس فروشگاه" : "Store phone"}</small><bdi>{store?.mobile_number}</bdi></span></a><a href={`tel:${store?.manager_mobile_number}`}><FiPhoneOutgoing /><span><small>{fa ? "مدیریت" : "Management"}</small><bdi>{store?.manager_mobile_number}</bdi></span></a></section>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {fa ? "فرش شبستری" : "Shabestari Carpet"}</span><span>{fa ? "خرید و پرداخت به‌صورت حضوری انجام می‌شود." : "Viewing and purchase are arranged directly with the store."}</span></div>
    </footer>
  );
}
