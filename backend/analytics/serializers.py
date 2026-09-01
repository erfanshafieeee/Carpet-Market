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
        return attrs
