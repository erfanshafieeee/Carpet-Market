from django.db import models

from catalog.models import Product, Store


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
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="analytics_events")
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
            models.Index(fields=("store", "event_type", "created_at"), name="event_store_type_time_idx"),
            models.Index(fields=("store", "session_id", "event_type"), name="event_store_session_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    event_type__in=(
                        "market_viewed",
                        "search_performed",
                        "filter_applied",
                        "sort_changed",
                        "product_card_clicked",
                        "product_viewed",
                        "contact_clicked",
                        "phone_call_clicked",
                        "gallery_interacted",
                    )
                ),
                name="analytics_valid_event_type",
            ),
            models.CheckConstraint(
                condition=models.Q(language__in=("fa", "en")),
                name="analytics_valid_language",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        event_type__in=(
                            "product_card_clicked",
                            "product_viewed",
                            "contact_clicked",
                            "phone_call_clicked",
                            "gallery_interacted",
                        ),
                        product__isnull=False,
                    )
                    | (
                        ~models.Q(
                            event_type__in=(
                                "product_card_clicked",
                                "product_viewed",
                                "contact_clicked",
                                "phone_call_clicked",
                                "gallery_interacted",
                            )
                        )
                        & models.Q(product__isnull=True)
                    )
                ),
                name="analytics_valid_product",
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(event_type="search_performed") & ~models.Q(query=""))
                    | (~models.Q(event_type="search_performed") & models.Q(query=""))
                ),
                name="analytics_valid_query",
            ),
        ]

