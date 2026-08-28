import type { InventoryStatus, Language, RugType } from "./types";

const dictionary = {
  fa: {
    brand: "بازار فرش ایران",
    find: "فرش مناسب خود را پیدا کنید",
    search: "جستجو بر اساس طرح، رنگ، شهر بافت، اندازه و...",
    filters: "فیلترها",
    newest: "جدیدترین",
    priceAsc: "قیمت: کم به زیاد",
    priceDesc: "قیمت: زیاد به کم",
    result: "فرش",
    contact: "تماس با فروشنده",
    call: "شروع تماس",
    specs: "مشخصات فرش",
    back: "بازگشت به فرش‌ها",
    noResults: "فرشی با این مشخصات پیدا نشد",
    clear: "پاک‌کردن همه فیلترها",
    toman: "تومان",
    unavailableRate: "تبدیل قیمت به دلار موقتاً در دسترس نیست.",
    noDescription: "",
    dimensions: "ابعاد",
    area: "مساحت",
    city: "شهر بافت / تولید",
    weave: "نوع بافت",
    material: "جنس",
    color: "رنگ",
    pattern: "طرح",
    condition: "وضعیت محصول",
    age: "قدمت تقریبی",
    raj: "رج",
    reeds: "شانه",
    density: "تراکم",
    brandField: "برند / کارخانه",
    handmade: "دستباف",
    machine: "ماشینی",
    available: "موجود",
    reserved: "رزرو شده",
    sold: "فروخته شده",
    new: "نو",
    used: "دست‌دوم"
  },
  en: {
    brand: "Iran Carpet Market",
    find: "Find a carpet worth seeing in person",
    search: "Search by design, colour, origin, dimensions…",
    filters: "Filters",
    newest: "Newest",
    priceAsc: "Price: low to high",
    priceDesc: "Price: high to low",
    result: "carpets",
    contact: "Contact the seller",
    call: "Start phone call",
    specs: "Carpet specifications",
    back: "Back to carpets",
    noResults: "No carpets match these filters",
    clear: "Clear all filters",
    toman: "Toman",
    unavailableRate: "USD conversion is temporarily unavailable.",
    noDescription: "",
    dimensions: "Dimensions",
    area: "Area",
    city: "Origin",
    weave: "Weave",
    material: "Material",
    color: "Colour",
    pattern: "Pattern",
    condition: "Condition",
    age: "Approximate age",
    raj: "Raj",
    reeds: "Reeds",
    density: "Density",
    brandField: "Brand / factory",
    handmade: "Handmade",
    machine: "Machine-made",
    available: "Available",
    reserved: "Reserved",
    sold: "Sold",
    new: "New",
    used: "Pre-owned"
  }
} as const;

export function t(language: Language, key: keyof typeof dictionary.fa) {
  return dictionary[language][key];
}

export function statusLabel(language: Language, status: InventoryStatus) {
  return t(language, status);
}

export function typeLabel(language: Language, type: RugType) {
  return t(language, type);
}

export function number(language: Language, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US", options).format(value);
}

