from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminSellRequestViewSet, PublicSellRequestViewSet


router = DefaultRouter()
router.register("sell-requests", PublicSellRequestViewSet, basename="sell-requests")
router.register("admin/sell-requests", AdminSellRequestViewSet, basename="admin-sell-requests")

urlpatterns = [path("", include(router.urls))]
