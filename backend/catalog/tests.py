import base64
import uuid

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from analytics.models import AnalyticsEvent

from .models import Product, ProductImage, ReferenceItem, Store


TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8x8AAAAASUVORK5CYII="
)


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
        user = get_user_model().objects.create_user("09121111111", "StrongPassword123!")
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
            product=self.product,
            language="fa",
        )
        user = get_user_model().objects.create_user("09121111111", "StrongPassword123!")
        self.client.force_authenticate(user)
        response = self.client.delete(f"/api/v1/admin/products/{self.product.public_id}/")
        self.assertEqual(response.status_code, 204)
        self.product.refresh_from_db()
        self.assertIsNotNone(self.product.deleted_at)
        self.assertEqual(self.product.analytics_events.count(), 1)
