from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import ExchangeRate, Product, ProductImage, ReferenceItem, Store, StoreBranch


class LocalizedReferenceSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceItem
        fields = ("code", "label", "label_fa", "label_en")

    def get_label(self, obj):
        return obj.label_en if self.context.get("language") == "en" else obj.label_fa


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceItem
        fields = ("id", "category", "code", "label_fa", "label_en", "sort_order")


class StoreBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreBranch
        fields = ("id", "name_fa", "name_en", "address_fa", "address_en", "sort_order")


class StoreSerializer(serializers.ModelSerializer):
    branches = StoreBranchSerializer(many=True, read_only=True)

    class Meta:
        model = Store
        fields = (
            "id",
            "public_id",
            "name_fa",
            "name_en",
            "city_fa",
            "city_en",
            "mobile_number",
            "manager_mobile_number",
            "domain",
            "address_fa",
            "address_en",
            "branches",
        )


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "url", "alt_fa", "alt_en", "is_cover", "sort_order")

    def get_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class PublicProductSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    area_square_meters = serializers.FloatField(read_only=True)
    city = serializers.SerializerMethodField()
    weave = serializers.SerializerMethodField()
    pattern = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    materials = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    store = StoreSerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            "public_id",
            "title",
            "description",
            "title_fa",
            "title_en",
            "price_toman",
            "length_cm",
            "width_cm",
            "area_square_meters",
            "rug_type",
            "condition",
            "approximate_age_years",
            "inventory_status",
            "city",
            "weave",
            "pattern",
            "materials",
            "colors",
            "raj",
            "reeds",
            "density",
            "brand",
            "images",
            "store",
            "created_at",
        )

    @property
    def language(self):
        return self.context.get("language", "fa")

    def get_title(self, obj):
        return obj.title_en if self.language == "en" else obj.title_fa

    def get_description(self, obj):
        return obj.description_en if self.language == "en" else obj.description_fa

    def reference(self, obj):
        if not obj:
            return None
        return LocalizedReferenceSerializer(obj, context={"language": self.language}).data

    get_city = lambda self, obj: self.reference(obj.city)
    get_weave = lambda self, obj: self.reference(obj.weave)
    get_pattern = lambda self, obj: self.reference(obj.pattern)
    get_brand = lambda self, obj: self.reference(obj.brand)
    get_materials = lambda self, obj: [self.reference(item) for item in obj.materials.all()]
    get_colors = lambda self, obj: [self.reference(item) for item in obj.colors.all()]


class AdminProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    materials = ReferenceSerializer(many=True, read_only=True)
    colors = ReferenceSerializer(many=True, read_only=True)
    view_count = serializers.IntegerField(read_only=True, default=0)
    contact_count = serializers.IntegerField(read_only=True, default=0)
    material_ids = serializers.PrimaryKeyRelatedField(
        source="materials",
        queryset=ReferenceItem.objects.filter(category=ReferenceItem.Category.MATERIAL),
        many=True,
        write_only=True,
        allow_empty=False,
    )
    color_ids = serializers.PrimaryKeyRelatedField(
        source="colors",
        queryset=ReferenceItem.objects.filter(category=ReferenceItem.Category.COLOR),
        many=True,
        write_only=True,
        allow_empty=False,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "public_id",
            "store",
            "title_fa",
            "title_en",
            "description_fa",
            "description_en",
            "price_toman",
            "length_cm",
            "width_cm",
            "rug_type",
            "condition",
            "approximate_age_years",
            "inventory_status",
            "city",
            "weave",
            "pattern",
            "material_ids",
            "color_ids",
            "materials",
            "colors",
            "raj",
            "reeds",
            "density",
            "brand",
            "images",
            "created_at",
            "updated_at",
            "view_count",
            "contact_count",
        )
        read_only_fields = ("id", "public_id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            self.fields["store"].queryset = Store.objects.manageable_by(request.user).filter(is_active=True)

    def validate(self, attrs):
        instance = self.instance
        rug_type = attrs.get("rug_type", getattr(instance, "rug_type", None))
        if rug_type == Product.RugType.HANDMADE:
            if not attrs.get("raj", getattr(instance, "raj", None)):
                raise serializers.ValidationError({"raj": "رج برای فرش دستباف اجباری است."})
            attrs.update({"reeds": None, "density": None, "brand": None})
        if rug_type == Product.RugType.MACHINE:
            for field, label in (("reeds", "شانه"), ("density", "تراکم"), ("brand", "برند")):
                if not attrs.get(field, getattr(instance, field, None)):
                    raise serializers.ValidationError({field: f"{label} برای فرش ماشینی اجباری است."})
            attrs["raj"] = None
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        materials = validated_data.pop("materials")
        colors = validated_data.pop("colors")
        product = Product.objects.create(**validated_data)
        product.materials.set(materials)
        product.colors.set(colors)
        product.full_clean()
        product.save()
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        materials = validated_data.pop("materials", None)
        colors = validated_data.pop("colors", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.full_clean()
        instance.save()
        if materials is not None:
            instance.materials.set(materials)
        if colors is not None:
            instance.colors.set(colors)
        return instance


class ProductImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("image", "alt_fa", "alt_en", "is_cover", "sort_order")

    def validate_image(self, image):
        if image.size > 15 * 1024 * 1024:
            raise serializers.ValidationError("حجم هر تصویر باید حداکثر ۱۵ مگابایت باشد.")
        if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise serializers.ValidationError("فقط JPG، PNG و WebP مجاز است.")
        return image


class ExchangeRateSerializer(serializers.ModelSerializer):
    stale = serializers.SerializerMethodField()

    class Meta:
        model = ExchangeRate
        fields = ("rate_toman", "source_name", "source_url", "quoted_at", "fetched_at", "is_demo", "stale")

    def get_stale(self, obj):
        from django.utils import timezone

        return (timezone.now() - obj.quoted_at).total_seconds() > 86400
