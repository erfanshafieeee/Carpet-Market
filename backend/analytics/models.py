from django.db import models

from catalog.models import Product


class AnalyticsEvent(models.Model):
    class EventType(models.TextChoices):
        MARKET_VIEWED = "market_viewed", "Market viewed"
        SEARCH_PERFORMED = "search_performed", "Search performed"
        FILTER_APPLIED = "filter_applied", "Filter applied"
        SORT_CHANGED = "sort_changed", "Sort changed"
        PRODUCT_CARD_CLICKED = "product_card_clicked", "Product card clicked"
        PRODUCT_VIEWED = "product_viewed", "Product viewed"
        CONTACT_CLICKED = "contact_clicked", "Contact clicked"
        PHONE_CALL_CLICKED = "phone_call_clicked", "Phone call clicked"
        GALLERY_INTERACTED = "gallery_interacted", "Gallery interacted"

    event_type = models.CharField(max_length=32, choices=EventType.choices)
    session_id = models.UUIDField(db_index=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True, related_name="analytics_events")
    language = models.CharField(max_length=2, choices=(("fa", "Persian"), ("en", "English")))
    query = models.CharField(max_length=300, blank=True)
    properties = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("event_type", "created_at")),
            models.Index(fields=("product", "event_type", "created_at")),
            models.Index(fields=("session_id", "product", "event_type")),
        ]

