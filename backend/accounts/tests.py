from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class AdminLoginTests(TestCase):
    def setUp(self):
        self.mobile = "09120000001"
        self.password = "AdminTest5183!"
        get_user_model().objects.create_superuser(self.mobile, self.password)
        self.client = APIClient(enforce_csrf_checks=True)

    def test_login_with_csrf_creates_authenticated_session(self):
        csrf_response = self.client.get("/api/v1/auth/csrf/")
        self.assertEqual(csrf_response.status_code, 200)
        token = csrf_response.data["csrfToken"]

        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"mobile_number": self.mobile, "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data["authenticated"])

        me_response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertTrue(me_response.data["authenticated"])
        self.assertEqual(me_response.data["mobile_number"], self.mobile)

    def test_invalid_password_is_rejected(self):
        token = self.client.get("/api/v1/auth/csrf/").data["csrfToken"]
        response = self.client.post(
            "/api/v1/auth/login/",
            {"mobile_number": self.mobile, "password": "wrong-password"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)
