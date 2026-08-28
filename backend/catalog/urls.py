from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminProductViewSet,
    AdminRateStatusView,
    ExchangeRateView,
    PublicProductDetailView,
    PublicProductListView,
    ReferenceListView,
    StoreView,
)


router = DefaultRouter()
router.register("admin/products", AdminProductViewSet, basename="admin-products")

urlpatterns = [
    path("products/", PublicProductListView.as_view(), name="public-products"),
    path("products/<uuid:public_id>/", PublicProductDetailView.as_view(), name="public-product-detail"),
    path("references/", ReferenceListView.as_view(), name="references"),
    path("store/", StoreView.as_view(), name="store"),
    path("exchange-rate/", ExchangeRateView.as_view(), name="exchange-rate"),
    path("admin/exchange-rate/", AdminRateStatusView.as_view(), name="admin-exchange-rate"),
    path("", include(router.urls)),
]

