from __future__ import annotations

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class StoreQuerySet(models.QuerySet):
    def manageable_by(self, user):
        if not user or not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self.all()
        return self.filter(
            memberships__user=user,
            memberships__is_active=True,
        ).distinct()


class Store(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name_fa = models.CharField(max_length=160)
    name_en = models.CharField(max_length=160)
    city_fa = models.CharField(max_length=120)
    city_en = models.CharField(max_length=120)
    mobile_number = models.CharField(max_length=16)
    address_fa = models.TextField(blank=True)
    address_en = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    objects = StoreQuerySet.as_manager()

    class Meta:
        ordering = ("id",)
        indexes = [models.Index(fields=("is_active",), name="store_active_idx")]

    def __str__(self):
        return self.name_fa


class StoreMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="store_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MANAGER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("store_id", "user_id")
        constraints = [
            models.UniqueConstraint(fields=("store", "user"), name="unique_store_user"),
            models.CheckConstraint(condition=models.Q(role__in=("owner", "manager")), name="membership_valid_role"),
        ]
        indexes = [
            models.Index(fields=("user", "is_active"), name="member_user_active_idx"),
            models.Index(fields=("store", "is_active"), name="member_store_active_idx"),
        ]

    def __str__(self):
        return f"{self.store} / {self.user} ({self.role})"


class ReferenceItem(models.Model):
    class Category(models.TextChoices):
        CITY = "city", "City"
        WEAVE = "weave", "Weave"
        MATERIAL = "material", "Material"
        COLOR = "color", "Color"
        PATTERN = "pattern", "Pattern"
        BRAND = "brand", "Brand"

    category = models.CharField(max_length=20, choices=Category.choices)
    code = models.SlugField(max_length=80)
    label_fa = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("category", "sort_order", "label_fa")
        constraints = [
            models.UniqueConstraint(fields=("category", "code"), name="unique_reference_code_per_category"),
            models.CheckConstraint(
                condition=models.Q(category__in=("city", "weave", "material", "color", "pattern", "brand")),
                name="reference_valid_category",
            ),
        ]

    def __str__(self):
        return f"{self.category}: {self.label_fa}"


class ProductQuerySet(models.QuerySet):
    def manageable_by(self, user):
        if not user or not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self
        return self.filter(
            store__memberships__user=user,
            store__memberships__is_active=True,
        ).distinct()

    def visible(self):
        return self.filter(deleted_at__isnull=True)

    def listed(self):
        return self.visible().exclude(inventory_status=Product.InventoryStatus.SOLD)

    def public(self):
        """Products safe to expose publicly: active records with at least one image."""
        return self.visible().filter(images__isnull=False).distinct()

    def public_listed(self):
        return self.public().exclude(inventory_status=Product.InventoryStatus.SOLD)


class Product(models.Model):
    class RugType(models.TextChoices):
        HANDMADE = "handmade", "Handmade"
        MACHINE = "machine", "Machine-made"

    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"

    class InventoryStatus(models.TextChoices):
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="products")
    title_fa = models.CharField(max_length=180)
    title_en = models.CharField(max_length=180)
    description_fa = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    price_toman = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    length_cm = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    width_cm = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    rug_type = models.CharField(max_length=16, choices=RugType.choices)
    condition = models.CharField(max_length=8, choices=Condition.choices)
    approximate_age_years = models.PositiveIntegerField()
    inventory_status = models.CharField(max_length=16, choices=InventoryStatus.choices, default=InventoryStatus.AVAILABLE)
    city = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, related_name="city_products")
    weave = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, related_name="weave_products")
    pattern = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, related_name="pattern_products")
    materials = models.ManyToManyField(ReferenceItem, related_name="material_products")
    colors = models.ManyToManyField(ReferenceItem, related_name="color_products")
    raj = models.PositiveIntegerField(null=True, blank=True)
    reeds = models.PositiveIntegerField(null=True, blank=True)
    density = models.PositiveIntegerField(null=True, blank=True)
    brand = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, null=True, blank=True, related_name="brand_products")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("inventory_status", "deleted_at")),
            models.Index(fields=("rug_type", "inventory_status")),
            models.Index(fields=("price_toman",)),
            models.Index(
                fields=("store", "deleted_at", "inventory_status", "created_at"),
                name="prod_store_state_new_idx",
            ),
            models.Index(
                fields=("store", "deleted_at", "inventory_status", "price_toman"),
                name="prod_store_state_price_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rug_type__in=("handmade", "machine")),
                name="product_valid_rug_type",
            ),
            models.CheckConstraint(
                condition=models.Q(condition__in=("new", "used")),
                name="product_valid_condition",
            ),
            models.CheckConstraint(
                condition=models.Q(inventory_status__in=("available", "reserved", "sold")),
                name="product_valid_inventory",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(price_toman__gt=0)
                    & models.Q(length_cm__gt=0)
                    & models.Q(width_cm__gt=0)
                    & models.Q(approximate_age_years__gte=0)
                ),
                name="product_positive_values",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        rug_type="handmade",
                        raj__isnull=False,
                        reeds__isnull=True,
                        density__isnull=True,
                        brand__isnull=True,
                    )
                    | models.Q(
                        rug_type="machine",
                        raj__isnull=True,
                        reeds__isnull=False,
                        density__isnull=False,
                        brand__isnull=False,
                    )
                ),
                name="product_valid_type_specs",
            ),
        ]

    def clean(self):
        errors = {}
        categories = {"city": self.city_id, "weave": self.weave_id, "pattern": self.pattern_id, "brand": self.brand_id}
        for field, reference_id in categories.items():
            if not reference_id:
                continue
            ref = getattr(self, field)
            if ref.category != field:
                errors[field] = f"Reference item must belong to {field} category."
        if self.rug_type == self.RugType.HANDMADE:
            if not self.raj:
                errors["raj"] = "رج برای فرش دستباف اجباری است."
            self.reeds = None
            self.density = None
            self.brand = None
        elif self.rug_type == self.RugType.MACHINE:
            if not self.reeds:
                errors["reeds"] = "شانه برای فرش ماشینی اجباری است."
            if not self.density:
                errors["density"] = "تراکم برای فرش ماشینی اجباری است."
            if not self.brand_id:
                errors["brand"] = "برند برای فرش ماشینی اجباری است."
            self.raj = None
        if errors:
            raise ValidationError(errors)

    @property
    def area_square_meters(self):
        return round(self.length_cm * self.width_cm / 10_000, 2)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def __str__(self):
        return self.title_fa


def product_image_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"products/{instance.product.public_id}/{uuid.uuid4().hex}.{extension}"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to=product_image_path,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"])],
    )
    alt_fa = models.CharField(max_length=220, blank=True)
    alt_en = models.CharField(max_length=220, blank=True)
    is_cover = models.BooleanField(default=False)
    cover_marker = models.BooleanField(null=True, blank=True, editable=False, default=None)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("product", "cover_marker"),
                name="one_cover_image_per_product",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_cover=True, cover_marker=True)
                    | models.Q(is_cover=False, cover_marker__isnull=True)
                ),
                name="image_cover_marker_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(sort_order__gte=0, sort_order__lte=9),
                name="image_sort_order_range",
            ),
        ]

    def save(self, *args, **kwargs):
        self.cover_marker = True if self.is_cover else None
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"cover_marker"}
        return super().save(*args, **kwargs)

    def clean(self):
        if self.image and self.image.size > 15 * 1024 * 1024:
            raise ValidationError({"image": "حجم هر تصویر باید حداکثر ۱۵ مگابایت باشد."})


class ExchangeRate(models.Model):
    rate_toman = models.PositiveIntegerField()
    source_name = models.CharField(max_length=160)
    source_url = models.URLField(blank=True)
    quoted_at = models.DateTimeField()
    fetched_at = models.DateTimeField(default=timezone.now)
    is_demo = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-quoted_at", "-id")
        indexes = [
            models.Index(fields=("is_active", "is_demo", "quoted_at"), name="rate_active_quote_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(rate_toman__gt=0), name="exchange_rate_positive"),
        ]

    @classmethod
    def current_real_rate(cls):
        return cls.objects.filter(is_active=True, is_demo=False).first()
