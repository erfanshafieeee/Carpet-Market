import base64
import uuid
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from PIL import Image as PillowImage

from analytics.models import AnalyticsEvent

from .models import Product, ProductImage, ReferenceItem, Store, StoreMembership


TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8x8AAAAASUVORK5CYII="
)


def uploaded_png(name):
    content = BytesIO()
    PillowImage.new("RGB", (2, 2), color=(121, 28, 49)).save(content, format="PNG")
    return SimpleUploadedFile(name, content.getvalue(), content_type="image/png")


class MarketApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.store = Store.objects.create(
            name_fa="فروشگاه آزمون",
            name_en="Test Store",
            city_fa="تهران",
            city_en="Tehran",
            mobile_number="09120000000",
        )
        self.city = self.ref("city", "tehran")
        self.weave = self.ref("weave", "persian-knot")
        self.pattern = self.ref("pattern", "medallion")
        self.material = self.ref("material", "wool")
        self.color = self.ref("color", "red")
        self.product = Product.objects.create(
            store=self.store,
            title_fa="فرش تست",
            title_en="Test Carpet",
            price_toman=100_000_000,
            length_cm=300,
            width_cm=200,
            rug_type=Product.RugType.HANDMADE,
            condition=Product.Condition.NEW,
            approximate_age_years=0,
            city=self.city,
            weave=self.weave,
            pattern=self.pattern,
            raj=50,
        )
        self.product.materials.add(self.material)
        self.product.colors.add(self.color)

    def ref(self, category, code):
        return ReferenceItem.objects.create(
            category=category,
            code=code,
            label_fa=code,
            label_en=code.title(),
        )

    def add_image(self):
        return ProductImage.objects.create(
            product=self.product,
            image=SimpleUploadedFile("rug.png", TINY_PNG, content_type="image/png"),
            is_cover=True,
        )

    def admin_user(self, mobile="09121111111"):
        user = get_user_model().objects.create_user(
            mobile,
            "StrongPassword123!",
            is_staff=True,
        )
        StoreMembership.objects.create(store=self.store, user=user)
        return user

    def test_product_is_hidden_until_it_has_an_image(self):
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.add_image()
        response = self.client.get("/api/v1/products/?lang=en")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Test Carpet")
        self.assertEqual(response.data["results"][0]["description"], "")

    def test_analytics_conversion_is_unique_per_session_and_product(self):
        self.add_image()
        session_id = uuid.uuid4()
        for event_type in ("product_viewed", "product_viewed", "contact_clicked"):
            response = self.client.post(
                "/api/v1/analytics/events/",
                {"event_type": event_type, "session_id": session_id, "product_public_id": self.product.public_id, "language": "fa", "properties": {}},
                format="json",
            )
            self.assertEqual(response.status_code, 201)
        self.assertFalse(AnalyticsEvent.objects.filter(store__isnull=True).exists())
        user = self.admin_user()
        self.client.force_authenticate(user)
        response = self.client.get("/api/v1/analytics/dashboard/?range=7")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["metrics"]["product_views"], 2)
        self.assertEqual(response.data["metrics"]["unique_product_view_sessions"], 1)
        self.assertEqual(response.data["metrics"]["contact_conversion_rate"], 100.0)

    def test_admin_soft_delete_preserves_analytics(self):
        self.add_image()
        AnalyticsEvent.objects.create(
            event_type="product_viewed",
            session_id=uuid.uuid4(),
            store=self.store,
            product=self.product,
            language="fa",
        )
        user = self.admin_user()
        self.client.force_authenticate(user)
        response = self.client.delete(f"/api/v1/admin/products/{self.product.public_id}/")
        self.assertEqual(response.status_code, 204)
        self.product.refresh_from_db()
        self.assertIsNotNone(self.product.deleted_at)
        self.assertEqual(self.product.analytics_events.count(), 1)

    def test_admin_can_upload_multiple_product_images(self):
        user = self.admin_user()
        self.client.force_authenticate(user)
        url = f"/api/v1/admin/products/{self.product.public_id}/images/"

        first_response = self.client.post(
            url,
            {
                "image": uploaded_png("first.png"),
                "alt_fa": "تصویر اول",
                "alt_en": "First image",
                "sort_order": 0,
                "is_cover": True,
            },
            format="multipart",
        )
        second_response = self.client.post(
            url,
            {
                "image": uploaded_png("second.png"),
                "alt_fa": "تصویر دوم",
                "alt_en": "Second image",
                "sort_order": 1,
                "is_cover": False,
            },
            format="multipart",
        )

        self.assertEqual(first_response.status_code, 201, first_response.data)
        self.assertEqual(second_response.status_code, 201, second_response.data)
        self.assertEqual(self.product.images.count(), 2)
        self.assertEqual(self.product.images.filter(is_cover=True).count(), 1)

        cover_response = self.client.patch(f"{url}{second_response.data['id']}/cover/")
        status_response = self.client.patch(
            f"/api/v1/admin/products/{self.product.public_id}/status/",
            {"inventory_status": Product.InventoryStatus.RESERVED},
            format="json",
        )
        delete_response = self.client.delete(f"{url}{first_response.data['id']}/")

        self.assertEqual(cover_response.status_code, 200, cover_response.data)
        self.assertTrue(cover_response.data["is_cover"])
        self.assertEqual(status_response.status_code, 200, status_response.data)
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(self.product.images.count(), 1)

    def test_database_allows_only_one_cover_per_product(self):
        self.add_image()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductImage.objects.create(
                    product=self.product,
                    image=uploaded_png("duplicate-cover.png"),
                    is_cover=True,
                )

        self.assertEqual(self.product.images.filter(is_cover=True).count(), 1)

    def test_database_rejects_incompatible_product_specs(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Product.objects.filter(pk=self.product.pk).update(rug_type=Product.RugType.MACHINE)

    def test_staff_without_store_membership_cannot_access_admin_products(self):
        user = get_user_model().objects.create_user(
            "09122222222",
            "StrongPassword123!",
            is_staff=True,
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/v1/admin/products/")

        self.assertEqual(response.status_code, 403)

    def test_admin_products_are_scoped_to_store_membership(self):
        other_store = Store.objects.create(
            name_fa="فروشگاه دیگر",
            name_en="Other Store",
            city_fa="تهران",
            city_en="Tehran",
            mobile_number="09123333333",
        )
        Product.objects.create(
            store=other_store,
            title_fa="فرش فروشگاه دیگر",
            title_en="Other Store Carpet",
            price_toman=90_000_000,
            length_cm=300,
            width_cm=200,
            rug_type=Product.RugType.HANDMADE,
            condition=Product.Condition.NEW,
            approximate_age_years=0,
            city=self.city,
            weave=self.weave,
            pattern=self.pattern,
            raj=40,
        )
        self.client.force_authenticate(self.admin_user())

        response = self.client.get("/api/v1/admin/products/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["public_id"], str(self.product.public_id))

    def test_product_event_rejects_mismatched_store(self):
        self.add_image()
        other_store = Store.objects.create(
            name_fa="فروشگاه دیگر",
            name_en="Other Store",
            city_fa="تهران",
            city_en="Tehran",
            mobile_number="09123333333",
        )

        response = self.client.post(
            "/api/v1/analytics/events/",
            {
                "event_type": "product_viewed",
                "session_id": uuid.uuid4(),
                "store_public_id": other_store.public_id,
                "product_public_id": self.product.public_id,
                "language": "fa",
                "properties": {},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
