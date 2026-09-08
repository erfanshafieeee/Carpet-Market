# نسخه‌بندی و بازیابی

نسخه‌های پایدار پروژه با Semantic Versioning و Git tag annotated ثبت می‌شوند. شاخه `main` محل نسخه پایدار جاری است و شاخه `release/v1` فقط برای اصلاحات ضروری خانواده V1 نگهداری می‌شود.

## نسخه پایدار 2.0.0

- Git tag ثابت: `v2.0.0`
- نسخه ثبت‌شده در `VERSION`، `frontend/package.json` و `frontend/package-lock.json`
- شامل فلو فروش عمومی، مدیریت درخواست‌های خرید، Analytics V2 و شواهد Visual QA

## اجزای Snapshot نسخه 1.0.0

- Git tag ثابت: `v1.0.0`
- شاخه نگهداری: `release/v1`
- نسخه ثبت‌شده در `VERSION` و `frontend/package.json`
- Release متناظر در GitHub
- کد Backend و Frontend، migrationها، فایل طراحی، مستندات و شواهد QA

داده MySQL، فایل‌های `backend/media` و `.env` عمداً در Git قرار نمی‌گیرند. Snapshot محلی داده و media داخل `.local-releases/v1.0.0/` ساخته می‌شود و باید مانند Backup حساس نگهداری شود.

## مشاهده V1 بدون تغییر شاخه‌ها

```powershell
git fetch --tags origin
git switch --detach v1.0.0
```

برای برگشت به توسعه جاری:

```powershell
git switch main
```

## ساخت شاخه قابل‌ویرایش از V1

```powershell
git fetch --tags origin
git switch -c restore/v1.0.0 v1.0.0
```

این روش به `main` و تاریخچه جدیدتر آسیبی نمی‌زند. برای بازگشت از `git reset --hard` استفاده نشود.

## نگهداری V1

اصلاح ضروری V1 باید از `release/v1` منشعب شود و با نسخه Patch مانند `v1.0.1` منتشر شود. قابلیت‌های V2 از `main` و branchهای `feat/v2-*` توسعه پیدا می‌کنند.

## بازیابی داده محلی V1

قبل از Restore، MySQL و پوشه media فعلی جداگانه Backup شوند. سپس dump و media نسخه V1 از `.local-releases/v1.0.0/` بازیابی شوند. فایل `.env` به‌دلیل داشتن Secret در Snapshot ذخیره نمی‌شود و باید برای محیط مقصد جداگانه تنظیم شود.
