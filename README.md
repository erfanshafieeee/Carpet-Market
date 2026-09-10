# فرش شبستری

نسخه V2 بازار فرش شبستری با ویترین دوزبانه، فلو فروش مستقیم فرش و پنل مدیریت فارسی. فرانت با Next.js، React و TypeScript و بک‌اند با Django و Django REST Framework پیاده‌سازی شده است.

نسخه پایدار فعلی: `2.0.1` با Git tag برابر `v2.0.1`. نسخه کامل V1 همچنان با tag ثابت `v1.0.0` و نسخه پایه V2 با tag ثابت `v2.0.0` قابل بازیابی است؛ روش آن در `docs/versioning.md` مستند شده است.

## ساختار

- `frontend/`: رابط عمومی `/Market`، فلو `/Market/sell` و پنل `/Admin`
- `backend/`: API، احراز هویت، کاتالوگ، درخواست‌های خرید، تصاویر و تحلیل رفتار
- `docs/database-schema.md`: ERD، constraints، indexها و سیاست نگهداری دیتابیس
- `docs/versioning.md`: سیاست نسخه‌بندی و دستورهای امن بازگشت به V1
- `design-qa.md`: گزارش نهایی تطبیق بصری با فایل طراحی

## اجرای محلی بک‌اند

Python 3.11 یا جدیدتر لازم است.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

پروژه از MySQL و PostgreSQL پشتیبانی می‌کند و نمونه محلی `DATABASE_URL` در `backend/.env.example` برای MySQL آماده است. اگر این متغیر حذف یا خالی شود، فقط برای اجرای سریع محلی از SQLite استفاده می‌شود.

## اجرای محلی فرانت

Node.js 20.9 یا جدیدتر لازم است.

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

سپس مسیرهای زیر در دسترس‌اند:

- ویترین: `http://127.0.0.1:3000/Market`
- پنل مدیریت: `http://127.0.0.1:3000/Admin`
- API: `http://127.0.0.1:8000/api/v1/`

حساب مدیریتی را با دستور `python manage.py createsuperuser` یا فرآیند امن محیط مقصد بسازید. رمز یا حساب نمونه در رابط و مستندات نگهداری نمی‌شود. برای محیط واقعی حتماً `DJANGO_SECRET_KEY` و گزینه‌های Secure cookie را تنظیم کنید.

## بررسی کیفیت

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
npm run typecheck
npm run lint
npm run build
```

پاک‌سازی داده خام تحلیل رفتار با سیاست نگهداری ۱۲ ماهه:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py purge_old_analytics --days 365
```

## تصمیم‌های محصول

- توضیحات فارسی و انگلیسی اختیاری‌اند و متن یک زبان جایگزین زبان دیگر نمی‌شود.
- تا زمانی که منبع واقعی نرخ ارز تنظیم نشده، قیمت ساختگی USD نمایش داده نمی‌شود.
- محصول حذف‌شده soft-delete می‌شود و تاریخچه آماری آن باقی می‌ماند.
- شناسه عمومی محصول UUID است و شناسه ترتیبی دیتابیس در URL عمومی افشا نمی‌شود.
- Docker طبق تصمیم فعلی محصول اضافه نشده است.
