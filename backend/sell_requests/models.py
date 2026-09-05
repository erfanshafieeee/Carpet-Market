from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from catalog.models import ReferenceItem, Store


TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_tracking_code() -> str:
    return "SELL-" + "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(6))


class SellRequestQuerySet(models.QuerySet):
    def manageable_by(self, user):
        if not user or not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self
        return self.filter(
            store__memberships__user=user,
            store__memberships__is_active=True,
        ).distinct()


class SellRequest(models.Model):
    class Status(models.TextChoices):
        NEEDS_REVIEW = "needs_review", "Needs review"
        IN_PROGRESS = "in_progress", "In progress"
        PURCHASED = "purchased", "Purchased"
        REJECTED = "rejected", "Rejected"

    class RejectionReason(models.TextChoices):
        CONDITION_MISMATCH = "condition_mismatch", "Condition is not suitable"
        OUTSIDE_SCOPE = "outside_scope", "Outside purchase scope"
        DUPLICATE = "duplicate", "Duplicate request"
        OWNER_WITHDREW = "owner_withdrew", "Owner withdrew"
        UNABLE_TO_CONTACT = "unable_to_contact", "Unable to contact owner"
        OTHER = "other", "Other"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="sell_requests")
    tracking_code = models.CharField(max_length=11, unique=True, editable=False)
    rug_type = models.CharField(max_length=16, choices=(("handmade", "Handmade"), ("machine", "Machine-made")))
    phone_number = models.CharField(max_length=11, db_index=True)
    province = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, related_name="province_sell_requests")
    address = models.CharField(max_length=250, blank=True)
    city = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, null=True, blank=True, related_name="city_sell_requests")
    length_cm = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(2000)])
    width_cm = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(2000)])
    condition = models.CharField(max_length=8, choices=(("new", "New"), ("used", "Used")), blank=True)
    approximate_age_years = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(250)])
    pattern = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, null=True, blank=True, related_name="pattern_sell_requests")
    materials = models.ManyToManyField(ReferenceItem, blank=True, related_name="material_sell_requests")
    colors = models.ManyToManyField(ReferenceItem, blank=True, related_name="color_sell_requests")
    raj = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(150)])
    reeds = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(2000)])
    density = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(5000)])
    brand = models.ForeignKey(ReferenceItem, on_delete=models.PROTECT, null=True, blank=True, related_name="brand_sell_requests")
    description = models.TextField(blank=True, max_length=2000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEEDS_REVIEW)
    rejection_reason = models.CharField(max_length=32, choices=RejectionReason.choices, blank=True)
    rejection_note = models.TextField(blank=True, max_length=1000)
    utm_source = models.CharField(max_length=255, blank=True)
    utm_medium = models.CharField(max_length=255, blank=True)
    utm_campaign = models.CharField(max_length=255, blank=True)
    utm_term = models.CharField(max_length=255, blank=True)
    utm_content = models.CharField(max_length=255, blank=True)
    first_admin_action_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SellRequestQuerySet.as_manager()

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("store", "status", "created_at"), name="sell_store_status_time_idx"),
            models.Index(fields=("store", "rug_type", "created_at"), name="sell_store_type_time_idx"),
            models.Index(fields=("store", "province", "created_at"), name="sell_store_prov_time_idx"),
            models.Index(fields=("store", "phone_number"), name="sell_store_phone_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(rug_type__in=("handmade", "machine")), name="sell_valid_rug_type"),
            models.CheckConstraint(condition=models.Q(status__in=("needs_review", "in_progress", "purchased", "rejected")), name="sell_valid_status"),
            models.CheckConstraint(
                condition=(models.Q(length_cm__isnull=True, width_cm__isnull=True) | models.Q(length_cm__isnull=False, width_cm__isnull=False)),
                name="sell_dimensions_together",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(rug_type="handmade", reeds__isnull=True, density__isnull=True, brand__isnull=True)
                    | models.Q(rug_type="machine", raj__isnull=True)
                ),
                name="sell_type_fields_match",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(status="rejected", rejection_reason__in=("condition_mismatch", "outside_scope", "duplicate", "owner_withdrew", "unable_to_contact", "other"))
                    | (~models.Q(status="rejected") & models.Q(rejection_reason="", rejection_note=""))
                ),
                name="sell_rejection_matches_status",
            ),
        ]

    def clean(self):
        errors = {}
        category_fields = {
            "province": (self.province_id, ReferenceItem.Category.PROVINCE),
            "city": (self.city_id, ReferenceItem.Category.CITY),
            "pattern": (self.pattern_id, ReferenceItem.Category.PATTERN),
            "brand": (self.brand_id, ReferenceItem.Category.BRAND),
        }
        for field, (reference_id, expected) in category_fields.items():
            if reference_id and getattr(self, field).category != expected:
                errors[field] = f"Reference item must belong to {expected} category."
        if (self.length_cm is None) != (self.width_cm is None):
            errors["length_cm"] = "طول و عرض باید با هم وارد شوند."
        if self.rug_type == "handmade":
            self.reeds = self.density = None
            self.brand = None
        elif self.rug_type == "machine":
            self.raj = None
        if self.status == self.Status.REJECTED and not self.rejection_reason:
            errors["rejection_reason"] = "انتخاب دلیل رد اجباری است."
        if self.status != self.Status.REJECTED:
            self.rejection_reason = ""
            self.rejection_note = ""
        if errors:
            raise ValidationError(errors)

    def mark_admin_action(self):
        if self.first_admin_action_at is None:
            self.first_admin_action_at = timezone.now()
            self.save(update_fields=("first_admin_action_at", "updated_at"))

    def __str__(self):
        return self.tracking_code


def sell_request_image_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"sell-requests/{instance.sell_request.public_id}/{uuid.uuid4().hex}.{extension}"


class SellRequestImage(models.Model):
    sell_request = models.ForeignKey(SellRequest, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to=sell_request_image_path,
        validators=[FileExtensionValidator(allowed_extensions=("jpg", "jpeg", "png", "webp"))],
    )
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(fields=("sell_request", "sort_order"), name="unique_sell_image_order"),
            models.CheckConstraint(condition=models.Q(sort_order__gte=0, sort_order__lte=3), name="sell_image_order_range"),
        ]


class SellRequestStatusHistory(models.Model):
    sell_request = models.ForeignKey(SellRequest, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=16, choices=SellRequest.Status.choices, blank=True)
    to_status = models.CharField(max_length=16, choices=SellRequest.Status.choices)
    rejection_reason = models.CharField(max_length=32, choices=SellRequest.RejectionReason.choices, blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="sell_status_changes")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [models.Index(fields=("sell_request", "created_at"), name="sell_history_time_idx")]


class SellRequestNote(models.Model):
    sell_request = models.ForeignKey(SellRequest, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sell_request_notes")
    body = models.TextField(max_length=1000)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("created_at", "id")


class SellRequestAdminAction(models.Model):
    class Action(models.TextChoices):
        VIEWED = "viewed", "Viewed"
        CALL_CLICKED = "call_clicked", "Call clicked"
        NOTE_ADDED = "note_added", "Note added"
        STATUS_CHANGED = "status_changed", "Status changed"

    sell_request = models.ForeignKey(SellRequest, on_delete=models.CASCADE, related_name="admin_actions")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sell_request_actions")
    action = models.CharField(max_length=20, choices=Action.choices)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("sell_request", "action", "created_at"), name="sell_action_type_time_idx")]
