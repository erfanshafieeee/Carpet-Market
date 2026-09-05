from __future__ import annotations

from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from catalog.models import ReferenceItem, Store
from catalog.serializers import ReferenceSerializer

from .models import (
    SellRequest,
    SellRequestAdminAction,
    SellRequestImage,
    SellRequestNote,
    SellRequestStatusHistory,
    generate_tracking_code,
)


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000


def validate_sell_image(image):
    if image.size > MAX_IMAGE_SIZE:
        raise serializers.ValidationError("حجم هر تصویر باید حداکثر ۱۵ مگابایت باشد.")
    if getattr(image, "content_type", "") not in ALLOWED_IMAGE_TYPES:
        raise serializers.ValidationError("فقط JPG، PNG و WebP مجاز است.")
    try:
        with Image.open(image) as parsed:
            if parsed.width * parsed.height > MAX_IMAGE_PIXELS:
                raise serializers.ValidationError("ابعاد پیکسلی تصویر بیش از حد مجاز است.")
            parsed.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise serializers.ValidationError("محتوای فایل یک تصویر معتبر نیست.") from exc
    finally:
        image.seek(0)
    return image


def normalize_phone(value: str) -> str:
    translations = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    normalized = str(value).translate(translations).strip().replace(" ", "").replace("-", "")
    if normalized.startswith("0098"):
        normalized = "0" + normalized[4:]
    elif normalized.startswith("+98"):
        normalized = "0" + normalized[3:]
    elif normalized.startswith("98") and len(normalized) == 12:
        normalized = "0" + normalized[2:]
    if len(normalized) != 11 or not normalized.startswith("09") or not normalized.isdigit():
        raise serializers.ValidationError("شماره موبایل ایران را با فرمت 09 یا +98 وارد کنید.")
    return normalized


class SellRequestImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = SellRequestImage
        fields = ("id", "url", "sort_order")

    def get_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class SellRequestStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source="changed_by.mobile_number", read_only=True, allow_null=True)

    class Meta:
        model = SellRequestStatusHistory
        fields = ("id", "from_status", "to_status", "rejection_reason", "changed_by", "created_at")


class SellRequestNoteSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.mobile_number", read_only=True, allow_null=True)

    class Meta:
        model = SellRequestNote
        fields = ("id", "body", "author", "created_at")


class PublicSellRequestCreateSerializer(serializers.ModelSerializer):
    store_public_id = serializers.UUIDField(write_only=True, required=False)
    phone_number = serializers.CharField(write_only=True, max_length=16)
    images = serializers.ListField(
        child=serializers.ImageField(validators=(validate_sell_image,)),
        min_length=1,
        max_length=4,
        write_only=True,
    )
    material_ids = serializers.PrimaryKeyRelatedField(
        source="materials",
        queryset=ReferenceItem.objects.filter(category=ReferenceItem.Category.MATERIAL, is_active=True),
        many=True,
        required=False,
    )
    color_ids = serializers.PrimaryKeyRelatedField(
        source="colors",
        queryset=ReferenceItem.objects.filter(category=ReferenceItem.Category.COLOR, is_active=True),
        many=True,
        required=False,
    )

    class Meta:
        model = SellRequest
        fields = (
            "public_id",
            "tracking_code",
            "store_public_id",
            "rug_type",
            "images",
            "phone_number",
            "province",
            "address",
            "city",
            "length_cm",
            "width_cm",
            "condition",
            "approximate_age_years",
            "pattern",
            "material_ids",
            "color_ids",
            "raj",
            "reeds",
            "density",
            "brand",
            "description",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "status",
            "created_at",
        )
        read_only_fields = ("public_id", "tracking_code", "status", "created_at")
        extra_kwargs = {
            "province": {"queryset": ReferenceItem.objects.filter(category=ReferenceItem.Category.PROVINCE, is_active=True)},
            "city": {"queryset": ReferenceItem.objects.filter(category=ReferenceItem.Category.CITY, is_active=True)},
            "pattern": {"queryset": ReferenceItem.objects.filter(category=ReferenceItem.Category.PATTERN, is_active=True)},
            "brand": {"queryset": ReferenceItem.objects.filter(category=ReferenceItem.Category.BRAND, is_active=True)},
        }

    def validate_phone_number(self, value):
        return normalize_phone(value)

    def validate(self, attrs):
        store_public_id = attrs.pop("store_public_id", None)
        stores = Store.objects.filter(is_active=True).order_by("id")
        if store_public_id:
            try:
                attrs["store"] = stores.get(public_id=store_public_id)
            except Store.DoesNotExist as exc:
                raise serializers.ValidationError({"store_public_id": "فروشگاه پیدا نشد."}) from exc
        else:
            candidates = list(stores[:2])
            if len(candidates) != 1:
                raise serializers.ValidationError({"store_public_id": "انتخاب فروشگاه اجباری است."})
            attrs["store"] = candidates[0]

        rug_type = attrs.get("rug_type")
        if rug_type == "handmade":
            attrs.update({"reeds": None, "density": None, "brand": None})
        elif rug_type == "machine":
            attrs["raj"] = None
        if (attrs.get("length_cm") is None) != (attrs.get("width_cm") is None):
            raise serializers.ValidationError({"length_cm": "طول و عرض باید با هم وارد شوند."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("images")
        materials = validated_data.pop("materials", [])
        colors = validated_data.pop("colors", [])
        tracking_code = generate_tracking_code()
        while SellRequest.objects.filter(tracking_code=tracking_code).exists():
            tracking_code = generate_tracking_code()
        sell_request = SellRequest(tracking_code=tracking_code, **validated_data)
        sell_request.full_clean()
        sell_request.save()
        sell_request.materials.set(materials)
        sell_request.colors.set(colors)
        SellRequestImage.objects.bulk_create(
            [SellRequestImage(sell_request=sell_request, image=image, sort_order=index) for index, image in enumerate(images)]
        )
        SellRequestStatusHistory.objects.create(
            sell_request=sell_request,
            from_status="",
            to_status=SellRequest.Status.NEEDS_REVIEW,
        )
        return sell_request

    def to_representation(self, instance):
        return {
            "public_id": str(instance.public_id),
            "tracking_code": instance.tracking_code,
            "status": instance.status,
            "created_at": instance.created_at.isoformat(),
        }


class AdminSellRequestListSerializer(serializers.ModelSerializer):
    province = ReferenceSerializer(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    image_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SellRequest
        fields = (
            "public_id",
            "tracking_code",
            "rug_type",
            "phone_number",
            "province",
            "status",
            "thumbnail",
            "image_count",
            "created_at",
            "updated_at",
        )

    def get_thumbnail(self, obj):
        image = next(iter(obj.images.all()), None)
        if image is None:
            return None
        return SellRequestImageSerializer(image, context=self.context).data["url"]


class AdminSellRequestDetailSerializer(serializers.ModelSerializer):
    province = ReferenceSerializer(read_only=True)
    city = ReferenceSerializer(read_only=True)
    pattern = ReferenceSerializer(read_only=True)
    brand = ReferenceSerializer(read_only=True)
    materials = ReferenceSerializer(many=True, read_only=True)
    colors = ReferenceSerializer(many=True, read_only=True)
    images = SellRequestImageSerializer(many=True, read_only=True)
    status_history = SellRequestStatusHistorySerializer(many=True, read_only=True)
    notes = SellRequestNoteSerializer(many=True, read_only=True)

    class Meta:
        model = SellRequest
        fields = (
            "public_id",
            "tracking_code",
            "rug_type",
            "phone_number",
            "province",
            "address",
            "city",
            "length_cm",
            "width_cm",
            "condition",
            "approximate_age_years",
            "pattern",
            "materials",
            "colors",
            "raj",
            "reeds",
            "density",
            "brand",
            "description",
            "status",
            "rejection_reason",
            "rejection_note",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "first_admin_action_at",
            "images",
            "status_history",
            "notes",
            "created_at",
            "updated_at",
        )


class SellRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SellRequest.Status.choices)
    rejection_reason = serializers.ChoiceField(choices=SellRequest.RejectionReason.choices, required=False, allow_blank=True)
    rejection_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, attrs):
        if attrs["status"] == SellRequest.Status.REJECTED and not attrs.get("rejection_reason"):
            raise serializers.ValidationError({"rejection_reason": "انتخاب دلیل رد اجباری است."})
        if attrs["status"] != SellRequest.Status.REJECTED:
            attrs.update({"rejection_reason": "", "rejection_note": ""})
        return attrs


class SellRequestNoteCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=1000, trim_whitespace=True)

    def validate_body(self, value):
        if not value:
            raise serializers.ValidationError("متن یادداشت را وارد کنید.")
        return value
