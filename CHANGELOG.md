# Changelog

تمام تغییرات مهم محصول در این فایل ثبت می‌شوند. نسخه‌ها از Semantic Versioning پیروی می‌کنند.

## [2.0.0] - 2026-09-09

- فلو عمومی سه‌مرحله‌ای فروش فرش در `/Market/sell` با ثبت ۱ تا ۴ تصویر، اطلاعات تماس، مشخصات اختیاری و صفحه موفقیت.
- مدیریت درخواست‌های خرید در `/Admin/requests` شامل جستجو، فیلتر، جزئیات، گالری، یادداشت، تاریخچه و تغییر آزادانه وضعیت.
- داشبورد و Analytics اختصاصی قیف فروش با رعایت allowlist داده و جلوگیری از ثبت اطلاعات شخصی.
- شناسه یکتای `SELL-XXXXXX`، اعتبارسنجی امن تصویر، نرمال‌سازی موبایل و پشتیبانی کامل MySQL.
- همگام‌سازی برند، هدر، فوتر، بنر فروش و رابط‌های عمومی/مدیریتی با طراحی V2 و responsive موبایل.
- مجموعه تست Django، TypeScript، ESLint، production build و Visual QA پانزده‌حالته.

## [1.0.0] - 2026-09-04

اولین نسخه پایدار Carpet Market:

- Market عمومی فارسی/انگلیسی با جستجو، فیلتر، مرتب‌سازی، صفحه محصول و جریان تماس قابل‌اندازه‌گیری.
- پنل فارسی مدیریت محصولات، تصاویر، Cover، وضعیت موجودی، نرخ ارز، اطلاعات فروشگاه، تغییر رمز و Dashboard.
- احراز هویت Session/CSRF با شماره موبایل و کنترل Cache وضعیت کاربر.
- مدیریت ۱ تا ۱۰ تصویر، Upload چندمرحله‌ای، انتخاب Cover و مرتب‌سازی تصاویر.
- Date Picker جلالی برای بازه سفارشی گزارش‌ها.
- Analytics مبتنی بر Session برای View، Contact، Phone Call، Search و Funnel.
- MySQL 8 محلی با `utf8mb4`، migrationهای کامل، constraints داده و indexهای Store-aware.
- معماری آماده رشد با Store، Store Membership، نقش Owner/Manager و Analytics تفکیک‌شده بر اساس Store.
- Soft Delete محصولات با حفظ تاریخچه Analytics.
- تطبیق کامل رابط با فایل طراحی و شواهد Visual QA.

[1.0.0]: https://github.com/erfanshafieeee/Carpet-Market/releases/tag/v1.0.0
[2.0.0]: https://github.com/erfanshafieeee/Carpet-Market/releases/tag/v2.0.0
