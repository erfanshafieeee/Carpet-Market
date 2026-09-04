# Changelog

تمام تغییرات مهم محصول در این فایل ثبت می‌شوند. نسخه‌ها از Semantic Versioning پیروی می‌کنند.

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
