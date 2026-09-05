import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from catalog.models import ReferenceItem, Store, StoreMembership

from .models import SellRequest, SellRequestAdminAction


def uploaded_image(name="rug.png"):
    from io import BytesIO

    content = BytesIO()
    Image.new("RGB", (4, 4), color=(121, 28, 49)).save(content, format="PNG")
    return SimpleUploadedFile(name, content.getvalue(), content_type="image/png")


class SellRequestApiTests(TestCase):
    media_root = tempfile.mkdtemp(prefix="carpet-market-sell-tests-")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(cls.media_root, ignore_errors=True)

    def setUp(self):
        self.override = override_settings(MEDIA_ROOT=self.media_root)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.client = APIClient()
        self.store = Store.objects.create(
            name_fa="فرش شبستری",
            name_en="Shabestari Carpet",
            city_fa="تهران",
            city_en="Tehran",
            mobile_number="09381555130",
        )
        self.province = self.ref("province", "tehran")
        self.city = self.ref("city", "tabriz")
        self.pattern = self.ref("pattern", "mahi")
        self.material = self.ref("material", "wool")
        self.color = self.ref("color", "navy")
        self.user = get_user_model().objects.create_user("09121111111", "StrongPassword123!", is_staff=True)
        StoreMembership.objects.create(store=self.store, user=self.user)

    def ref(self, category, code):
        return ReferenceItem.objects.create(category=category, code=code, label_fa=code, label_en=code.title())

    def create_request(self, **overrides):
        payload = {
            "rug_type": "handmade",
            "phone_number": "+989121234567",
            "province": self.province.id,
            "address": "تهران",
            "city": self.city.id,
            "length_cm": 300,
            "width_cm": 200,
            "pattern": self.pattern.id,
            "material_ids": [self.material.id],
            "color_ids": [self.color.id],
            "raj": 45,
            "images": [uploaded_image("one.png"), uploaded_image("two.png")],
            "utm_source": "instagram",
        }
        payload.update(overrides)
        return self.client.post("/api/v1/sell-requests/", payload, format="multipart")

    def test_public_submission_normalizes_phone_and_creates_images_and_history(self):
        response = self.create_request()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertRegex(response.data["tracking_code"], r"^SELL-[A-HJ-NP-Z2-9]{6}$")
        self.assertNotIn("phone_number", response.data)
        sell_request = SellRequest.objects.get()
        self.assertEqual(sell_request.phone_number, "09121234567")
        self.assertEqual(sell_request.images.count(), 2)
        self.assertEqual(sell_request.status_history.count(), 1)
        self.assertEqual(sell_request.utm_source, "instagram")

    def test_dimensions_must_be_entered_together(self):
        response = self.create_request(width_cm="")
        self.assertEqual(response.status_code, 400)
        self.assertIn("length_cm", response.data["error"]["details"])

    def test_non_image_content_is_rejected(self):
        fake = SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")
        response = self.create_request(images=[fake])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(SellRequest.objects.count(), 0)

    def test_admin_workflow_keeps_history_and_allows_design_status_changes(self):
        created = self.create_request()
        public_id = created.data["public_id"]
        self.client.force_authenticate(self.user)

        detail = self.client.get(f"/api/v1/admin/sell-requests/{public_id}/")
        self.assertEqual(detail.status_code, 200)
        sell_request = SellRequest.objects.get(public_id=public_id)
        self.assertIsNotNone(sell_request.first_admin_action_at)
        self.assertTrue(sell_request.admin_actions.filter(action=SellRequestAdminAction.Action.VIEWED).exists())

        purchased = self.client.patch(
            f"/api/v1/admin/sell-requests/{public_id}/status/",
            {"status": "purchased"},
            format="json",
        )
        self.assertEqual(purchased.status_code, 200, purchased.data)
        reopened = self.client.patch(
            f"/api/v1/admin/sell-requests/{public_id}/status/",
            {"status": "needs_review"},
            format="json",
        )
        self.assertEqual(reopened.status_code, 200, reopened.data)
        rejected = self.client.patch(
            f"/api/v1/admin/sell-requests/{public_id}/status/",
            {"status": "rejected", "rejection_reason": "other", "rejection_note": ""},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        self.assertEqual(SellRequest.objects.get().status_history.count(), 4)

    def test_admin_can_add_internal_note_and_search(self):
        public_id = self.create_request().data["public_id"]
        self.client.force_authenticate(self.user)
        note = self.client.post(
            f"/api/v1/admin/sell-requests/{public_id}/notes/",
            {"body": "تماس عصر انجام شود"},
            format="json",
        )
        self.assertEqual(note.status_code, 201, note.data)
        result = self.client.get("/api/v1/admin/sell-requests/?q=09121234567&range=all")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["count"], 1)

    def test_anonymous_user_cannot_read_requests(self):
        self.create_request()
        response = self.client.get("/api/v1/admin/sell-requests/")
        self.assertIn(response.status_code, (401, 403))
