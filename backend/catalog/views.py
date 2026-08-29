from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProductFilter
from .models import ExchangeRate, Product, ProductImage, ReferenceItem, Store
from .serializers import (
    AdminProductSerializer,
    ExchangeRateSerializer,
    ProductImageSerializer,
    ProductImageUploadSerializer,
    PublicProductSerializer,
    ReferenceSerializer,
    StoreSerializer,
)


def requested_language(request):
    return "en" if request.query_params.get("lang") == "en" else "fa"


class PublicProductListView(generics.ListAPIView):
    serializer_class = PublicProductSerializer
    filterset_class = ProductFilter

    def get_queryset(self):
        qs = Product.objects.public_listed().select_related("store", "city", "weave", "pattern", "brand").prefetch_related("materials", "colors", "images")
        params = self.request.query_params
        q = params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title_fa__icontains=q)
                | Q(title_en__icontains=q)
                | Q(description_fa__icontains=q)
                | Q(description_en__icontains=q)
                | Q(city__label_fa__icontains=q)
                | Q(city__label_en__icontains=q)
                | Q(pattern__label_fa__icontains=q)
                | Q(pattern__label_en__icontains=q)
                | Q(materials__label_fa__icontains=q)
                | Q(materials__label_en__icontains=q)
                | Q(colors__label_fa__icontains=q)
                | Q(colors__label_en__icontains=q)
            ).distinct()
        multi_fields = {
            "type": "rug_type",
            "status": "inventory_status",
            "condition": "condition",
            "city": "city__code",
            "weave": "weave__code",
            "pattern": "pattern__code",
            "material": "materials__code",
            "color": "colors__code",
            "brand": "brand__code",
            "reeds": "reeds",
            "density": "density",
        }
        for param, field in multi_fields.items():
            values = params.getlist(param)
            if values:
                qs = qs.filter(**{f"{field}__in": values})
        ordering = params.get("sort", "newest")
        qs = qs.order_by({"price_asc": "price_toman", "price_desc": "-price_toman"}.get(ordering, "-created_at"))
        return qs.distinct()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "language": requested_language(self.request)}


class PublicProductDetailView(generics.RetrieveAPIView):
    serializer_class = PublicProductSerializer
    lookup_field = "public_id"

    def get_queryset(self):
        return Product.objects.public().select_related("store", "city", "weave", "pattern", "brand").prefetch_related("materials", "colors", "images")

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "language": requested_language(self.request)}


class ReferenceListView(APIView):
    def get(self, request):
        queryset = ReferenceItem.objects.filter(is_active=True)
        grouped = {}
        for item in ReferenceSerializer(queryset, many=True).data:
            grouped.setdefault(item["category"], []).append(item)
        return Response(grouped)


class StoreView(APIView):
    def get(self, request):
        store = get_object_or_404(Store, is_active=True)
        return Response(StoreSerializer(store).data)


class ExchangeRateView(APIView):
    def get(self, request):
        rate = ExchangeRate.current_real_rate()
        if rate is None:
            return Response({"available": False, "reason": "provider_not_configured"})
        return Response({"available": True, **ExchangeRateSerializer(rate).data})


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AdminProductSerializer
    lookup_field = "public_id"
    filter_backends = [filters.SearchFilter]
    search_fields = ("title_fa", "title_en", "city__label_fa", "public_id")

    def get_queryset(self):
        queryset = (
            Product.objects.visible()
            .select_related("store", "city", "weave", "pattern", "brand")
            .prefetch_related("materials", "colors", "images")
            .annotate(
                view_count=Count("analytics_events", filter=Q(analytics_events__event_type="product_viewed"), distinct=True),
                contact_count=Count("analytics_events", filter=Q(analytics_events__event_type="contact_clicked"), distinct=True),
            )
        )
        status_filter = self.request.query_params.get("status")
        rug_type = self.request.query_params.get("type")
        if status_filter:
            queryset = queryset.filter(inventory_status=status_filter)
        if rug_type:
            queryset = queryset.filter(rug_type=rug_type)
        return queryset

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=["post"], url_path="images")
    @transaction.atomic
    def upload_image(self, request, *args, **kwargs):
        product = self.get_object()
        image_count = product.images.count()
        if image_count >= 10:
            return Response({"error": {"details": {"image": ["حداکثر ۱۰ تصویر مجاز است."]}}}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ProductImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_cover"):
            product.images.update(is_cover=False)
        image = serializer.save(product=product)
        if image_count == 0 and not image.is_cover:
            image.is_cover = True
            image.save(update_fields=["is_cover"])
        return Response(ProductImageSerializer(image, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>[^/.]+)")
    def delete_image(self, request, image_id=None, *args, **kwargs):
        product = self.get_object()
        if product.images.count() <= 1:
            return Response(
                {"error": {"details": {"image": ["محصول منتشرشده باید حداقل یک تصویر داشته باشد."]}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        image = get_object_or_404(ProductImage, product=product, pk=image_id)
        was_cover = image.is_cover
        image.delete()
        if was_cover:
            replacement = product.images.first()
            if replacement:
                replacement.is_cover = True
                replacement.save(update_fields=["is_cover"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path=r"images/(?P<image_id>[^/.]+)/cover")
    def set_cover(self, request, image_id=None, *args, **kwargs):
        product = self.get_object()
        image = get_object_or_404(ProductImage, product=product, pk=image_id)
        product.images.update(is_cover=False)
        image.is_cover = True
        image.save(update_fields=["is_cover"])
        return Response(ProductImageSerializer(image, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="images/reorder")
    def reorder_images(self, request, *args, **kwargs):
        product = self.get_object()
        image_ids = request.data.get("image_ids")
        if not isinstance(image_ids, list) or set(map(str, image_ids)) != set(map(str, product.images.values_list("id", flat=True))):
            return Response(
                {"error": {"details": {"image_ids": ["فهرست تصاویر کامل و معتبر نیست."]}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for index, image_id in enumerate(image_ids):
            product.images.filter(pk=image_id).update(sort_order=index)
        return Response(ProductImageSerializer(product.images.all(), many=True, context={"request": request}).data)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, *args, **kwargs):
        product = self.get_object()
        new_status = request.data.get("inventory_status")
        if new_status not in Product.InventoryStatus.values:
            return Response({"error": {"details": {"inventory_status": ["وضعیت نامعتبر است."]}}}, status=status.HTTP_400_BAD_REQUEST)
        product.inventory_status = new_status
        product.save(update_fields=["inventory_status", "updated_at"])
        return Response({"inventory_status": product.inventory_status})


class AdminRateStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rate = ExchangeRate.current_real_rate()
        if rate is None:
            return Response({"available": False, "provider_configured": False, "last_failure": None})
        return Response({"available": True, "provider_configured": True, **ExchangeRateSerializer(rate).data})
