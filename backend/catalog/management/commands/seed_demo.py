from __future__ import annotations

import os
import uuid
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from analytics.models import AnalyticsEvent
from catalog.models import Product, ProductImage, ReferenceItem, Store, StoreMembership


REFERENCE_DATA = {
    "city": [
        ("kashan", "کاشان", "Kashan"),
        ("nain", "نایین", "Nain"),
        ("tabriz", "تبریز", "Tabriz"),
        ("heriz", "هریس", "Heriz"),
        ("qom", "قم", "Qom"),
        ("tehran", "تهران", "Tehran"),
    ],
    "weave": [
        ("persian", "گره فارسی", "Persian knot"),
        ("turkish", "گره ترکی", "Turkish knot"),
        ("machine", "بافت ماشینی", "Machine weave"),
    ],
    "material": [
        ("wool", "پشم", "Wool"),
        ("silk", "ابریشم", "Silk"),
        ("cotton", "پنبه", "Cotton"),
        ("acrylic", "اکریلیک", "Acrylic"),
    ],
    "color": [
        ("navy", "سرمه‌ای", "Navy"),
        ("ivory", "کرم", "Ivory"),
        ("red", "قرمز", "Red"),
        ("blue", "آبی", "Blue"),
        ("green", "سبز", "Green"),
        ("grey", "طوسی", "Grey"),
    ],
    "pattern": [
        ("afshan", "افشان", "Afshan"),
        ("medallion", "ترنج", "Medallion"),
        ("mahi", "ماهی", "Mahi"),
        ("geometric", "هندسی", "Geometric"),
    ],
    "brand": [
        ("kashan", "کارخانه کاشان", "Kashan Factory"),
        ("setareh", "ستاره کویر", "Setareh Kavir"),
    ],
}

PRODUCTS = [
    ("kashan", "فرش دستباف کاشان", "Hand-knotted Kashan rug", 115_000_000, 400, 300, "kashan", "available", "handmade", ["wool"], ["navy", "ivory"], "afshan", 45, 1),
    ("nain", "فرش دستباف نایین", "Hand-knotted Nain rug", 72_000_000, 300, 200, "nain", "reserved", "handmade", ["wool", "silk"], ["ivory", "blue"], "medallion", 40, 0),
    ("tabriz", "فرش دستباف تبریز", "Hand-knotted Tabriz rug", 85_000_000, 300, 200, "tabriz", "available", "handmade", ["wool", "silk"], ["red", "navy"], "mahi", 50, 2),
    ("heriz", "فرش دستباف هریس", "Hand-knotted Heriz rug", 63_000_000, 320, 220, "heriz", "available", "handmade", ["wool"], ["red", "navy"], "geometric", 30, 8),
    ("qom", "فرش ابریشم قم", "Qom silk rug", 168_000_000, 210, 140, "qom", "available", "handmade", ["silk"], ["green", "ivory"], "medallion", 65, 0),
    ("machine", "فرش ماشینی افشان کاشان", "Kashan machine-made floral rug", 18_500_000, 300, 200, "kashan", "available", "machine", ["acrylic"], ["ivory", "grey"], "afshan", None, 0),
    ("tabriz", "فرش تبریز طرح ماهی", "Tabriz Mahi design rug", 94_000_000, 350, 250, "tabriz", "reserved", "handmade", ["wool", "silk"], ["red", "navy"], "mahi", 55, 4),
    ("nain", "فرش نایین طرح ترنج", "Nain medallion rug", 98_000_000, 360, 240, "nain", "available", "handmade", ["wool"], ["ivory", "blue"], "medallion", 45, 6),
    ("qom", "فرش قم ترنج سبز", "Qom green medallion rug", 142_000_000, 250, 160, "qom", "sold", "handmade", ["silk"], ["green", "ivory"], "medallion", 60, 3),
    ("heriz", "فرش هریس هندسی", "Heriz geometric rug", 76_000_000, 330, 230, "heriz", "available", "handmade", ["wool"], ["red", "navy"], "geometric", 35, 12),
]


class Command(BaseCommand):
    help = "Seed a repeatable demo store, references, products, images, admin and analytics."

    @transaction.atomic
    def handle(self, *args, **options):
        store, _ = Store.objects.update_or_create(
            id=1,
            defaults={
                "name_fa": "فروشگاه فرش ایران",
                "name_en": "Iran Carpet Gallery",
                "city_fa": "تهران",
                "city_en": "Tehran",
                "mobile_number": "+989120000000",
                "address_fa": "تهران، بازار فرش ایران — نشانی نمایشی",
                "address_en": "Iran Carpet Market, Tehran — demo address",
                "is_active": True,
            },
        )
        refs = {}
        for category, items in REFERENCE_DATA.items():
            for order, (code, fa, en) in enumerate(items):
                ref, _ = ReferenceItem.objects.update_or_create(
                    category=category,
                    code=code,
                    defaults={"label_fa": fa, "label_en": en, "sort_order": order, "is_active": True},
                )
                refs[(category, code)] = ref

        asset_dir = Path(__file__).resolve().parents[2] / "demo_assets"
        created_products = []
        for index, item in enumerate(PRODUCTS):
            image_key, title_fa, title_en, price, length, width, city, inventory, rug_type, materials, colors, pattern, raj, age = item
            public_id = uuid.uuid5(uuid.NAMESPACE_URL, f"irancarpet-demo:{title_en}")
            product, _ = Product.objects.update_or_create(
                public_id=public_id,
                defaults={
                    "store": store,
                    "title_fa": title_fa,
                    "title_en": title_en,
                    "description_fa": "بافت ظریف، نقشی متعادل و ترکیب رنگی ماندگار. برای دیدن جزئیات بافت و بررسی رنگ فرش در نور طبیعی، با فروشگاه هماهنگ کنید.",
                    "description_en": "Fine weaving, balanced motifs and a timeless palette. Arrange a visit to appreciate the texture and colour in natural light.",
                    "price_toman": price,
                    "length_cm": length,
                    "width_cm": width,
                    "city": refs[("city", city)],
                    "inventory_status": inventory,
                    "rug_type": rug_type,
                    "condition": "used" if age > 5 else "new",
                    "approximate_age_years": age,
                    "weave": refs[("weave", "machine" if rug_type == "machine" else "turkish" if city in {"tabriz", "heriz"} else "persian")],
                    "pattern": refs[("pattern", pattern)],
                    "raj": raj if rug_type == "handmade" else None,
                    "reeds": 1200 if rug_type == "machine" else None,
                    "density": 3600 if rug_type == "machine" else None,
                    "brand": refs[("brand", "kashan")] if rug_type == "machine" else None,
                    "deleted_at": None,
                },
            )
            product.materials.set([refs[("material", code)] for code in materials])
            product.colors.set([refs[("color", code)] for code in colors])
            if not product.images.exists():
                source = asset_dir / f"{image_key}.webp"
                with source.open("rb") as image_file:
                    product_image = ProductImage(product=product, is_cover=True, sort_order=0, alt_fa=title_fa, alt_en=title_en)
                    product_image.image.save(f"{image_key}.webp", File(image_file), save=True)
            created_products.append(product)

        User = get_user_model()
        mobile = os.getenv("DEMO_ADMIN_MOBILE", "09120000000")
        password = os.getenv("DEMO_ADMIN_PASSWORD", "Demo1234!")
        user, created = User.objects.get_or_create(mobile_number=mobile, defaults={"is_staff": True, "is_active": True})
        if created or os.getenv("RESET_DEMO_ADMIN_PASSWORD", "false").lower() == "true":
            user.set_password(password)
            user.save(update_fields=["password"])
        StoreMembership.objects.update_or_create(
            store=store,
            user=user,
            defaults={"role": StoreMembership.Role.MANAGER, "is_active": True},
        )

        if not AnalyticsEvent.objects.exists():
            event_rows = []
            for i in range(110):
                product = created_products[i % len(created_products)]
                session_id = uuid.uuid5(uuid.NAMESPACE_URL, f"irancarpet-session:{i}")
                event_rows.extend(
                    [
                        AnalyticsEvent(event_type="market_viewed", session_id=session_id, store=store, language="fa"),
                        AnalyticsEvent(event_type="product_viewed", session_id=session_id, store=store, product=product, language="fa"),
                    ]
                )
                if i % 4 == 0:
                    event_rows.append(AnalyticsEvent(event_type="contact_clicked", session_id=session_id, store=store, product=product, language="fa"))
                if i % 8 == 0:
                    event_rows.append(AnalyticsEvent(event_type="phone_call_clicked", session_id=session_id, store=store, product=product, language="fa"))
                if i % 5 == 0:
                    query = ["دستباف تبریز", "نایین", "فرش ابریشم", "کاشان", "قرمز"][(i // 5) % 5]
                    event_rows.append(AnalyticsEvent(event_type="search_performed", session_id=session_id, store=store, language="fa", query=query))
            AnalyticsEvent.objects.bulk_create(event_rows)

        self.stdout.write(self.style.SUCCESS("Demo database seeded."))
        self.stdout.write(f"Demo admin mobile: {mobile}")
        self.stdout.write("Demo password comes from DEMO_ADMIN_PASSWORD (default is documented for local demo only).")
