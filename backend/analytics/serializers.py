from rest_framework import serializers

from catalog.models import Product

from .models import AnalyticsEvent


PRODUCT_EVENTS = {
    AnalyticsEvent.EventType.PRODUCT_CARD_CLICKED,
    AnalyticsEvent.EventType.PRODUCT_VIEWED,
    AnalyticsEvent.EventType.CONTACT_CLICKED,
    AnalyticsEvent.EventType.PHONE_CALL_CLICKED,
    AnalyticsEvent.EventType.GALLERY_INTERACTED,
}


class EventSerializer(serializers.ModelSerializer):
    product_public_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = AnalyticsEvent
        fields = ("event_type", "session_id", "product_public_id", "language", "query", "properties")

    def validate(self, attrs):
        public_id = attrs.pop("product_public_id", None)
        if attrs["event_type"] in PRODUCT_EVENTS and not public_id:
            raise serializers.ValidationError({"product_public_id": "این رویداد به محصول نیاز دارد."})
        if public_id:
            try:
                attrs["product"] = Product.objects.public().get(public_id=public_id)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError({"product_public_id": "محصول پیدا نشد."}) from exc
        if attrs["event_type"] == AnalyticsEvent.EventType.SEARCH_PERFORMED and not attrs.get("query", "").strip():
            raise serializers.ValidationError({"query": "عبارت جستجو اجباری است."})
        return attrs
