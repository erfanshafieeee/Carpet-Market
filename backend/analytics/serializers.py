from rest_framework import serializers

from catalog.models import Product, Store

from .models import AnalyticsEvent


PRODUCT_EVENTS = {
    AnalyticsEvent.EventType.PRODUCT_CARD_CLICKED,
    AnalyticsEvent.EventType.PRODUCT_VIEWED,
    AnalyticsEvent.EventType.CONTACT_CLICKED,
    AnalyticsEvent.EventType.PHONE_CALL_CLICKED,
    AnalyticsEvent.EventType.GALLERY_INTERACTED,
}
SENSITIVE_PROPERTY_KEYS = {"phone", "phone_number", "mobile", "mobile_number", "address", "description", "image", "images"}
SELL_PROPERTY_KEYS = {
    AnalyticsEvent.EventType.SELL_FLOW_STARTED: {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"},
    AnalyticsEvent.EventType.SELL_STEP_COMPLETED: {"step_number", "carpet_type", "province_id"},
    AnalyticsEvent.EventType.SELL_REQUEST_SUBMITTED: {
        "request_public_id", "carpet_type", "province_id", "photo_count",
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    },
}


def contains_sensitive_key(value):
    if isinstance(value, dict):
        return any(str(key).lower() in SENSITIVE_PROPERTY_KEYS or contains_sensitive_key(item) for key, item in value.items())
    if isinstance(value, list):
        return any(contains_sensitive_key(item) for item in value)
    return False


class EventSerializer(serializers.ModelSerializer):
    product_public_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    store_public_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = AnalyticsEvent
        fields = ("event_type", "session_id", "store_public_id", "product_public_id", "language", "query", "properties")

    def validate(self, attrs):
        public_id = attrs.pop("product_public_id", None)
        store_public_id = attrs.pop("store_public_id", None)
        if attrs["event_type"] in PRODUCT_EVENTS and not public_id:
            raise serializers.ValidationError({"product_public_id": "این رویداد به محصول نیاز دارد."})
        if public_id:
            try:
                attrs["product"] = Product.objects.public().get(public_id=public_id)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError({"product_public_id": "محصول پیدا نشد."}) from exc
            attrs["store"] = attrs["product"].store
            if store_public_id and attrs["store"].public_id != store_public_id:
                raise serializers.ValidationError({"store_public_id": "فروشگاه با محصول انتخاب‌شده مطابقت ندارد."})
        elif store_public_id:
            try:
                attrs["store"] = Store.objects.get(public_id=store_public_id, is_active=True)
            except Store.DoesNotExist as exc:
                raise serializers.ValidationError({"store_public_id": "فروشگاه پیدا نشد."}) from exc
        else:
            stores = Store.objects.filter(is_active=True).order_by("id")[:2]
            if len(stores) != 1:
                raise serializers.ValidationError({"store_public_id": "انتخاب فروشگاه اجباری است."})
            attrs["store"] = stores[0]
        if attrs["event_type"] == AnalyticsEvent.EventType.SEARCH_PERFORMED and not attrs.get("query", "").strip():
            raise serializers.ValidationError({"query": "عبارت جستجو اجباری است."})
        if contains_sensitive_key(attrs.get("properties", {})):
            raise serializers.ValidationError({"properties": "ارسال اطلاعات هویتی یا تصویر در Analytics مجاز نیست."})
        allowed_sell_keys = SELL_PROPERTY_KEYS.get(attrs["event_type"])
        if allowed_sell_keys is not None and set(attrs.get("properties", {})) - allowed_sell_keys:
            raise serializers.ValidationError({"properties": "Property ارسال‌شده برای این رویداد مجاز نیست."})
        return attrs
