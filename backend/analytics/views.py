from datetime import datetime, time, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product

from .models import AnalyticsEvent
from .serializers import EventSerializer


class EventCreateView(APIView):
    throttle_scope = "analytics"

    def post(self, request):
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_201_CREATED)


def date_bounds(request):
    now = timezone.now()
    range_value = request.query_params.get("range", "30")
    if range_value == "custom":
        from_date = parse_date(request.query_params.get("from", ""))
        to_date = parse_date(request.query_params.get("to", ""))
        if from_date and to_date:
            return (
                timezone.make_aware(datetime.combine(from_date, time.min)),
                timezone.make_aware(datetime.combine(to_date, time.max)),
            )
    days = 7 if range_value == "7" else 30
    return now - timedelta(days=days), now


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = date_bounds(request)
        events = AnalyticsEvent.objects.filter(created_at__range=(start, end))
        views = events.filter(event_type=AnalyticsEvent.EventType.PRODUCT_VIEWED)
        contacts = events.filter(event_type=AnalyticsEvent.EventType.CONTACT_CLICKED)
        calls = events.filter(event_type=AnalyticsEvent.EventType.PHONE_CALL_CLICKED)

        viewed_pairs = set(views.values_list("session_id", "product_id"))
        contact_pairs = set(contacts.values_list("session_id", "product_id"))
        qualifying_sessions = {session for session, product in viewed_pairs & contact_pairs}
        view_sessions = {session for session, _ in viewed_pairs}
        conversion = round(len(qualifying_sessions) / len(view_sessions) * 100, 1) if view_sessions else None

        inventory = Product.objects.visible().values("inventory_status").annotate(count=Count("id"))
        inventory_map = {item["inventory_status"]: item["count"] for item in inventory}
        top_views = (
            Product.objects.visible()
            .annotate(metric=Count("analytics_events", filter=Q(analytics_events__event_type=AnalyticsEvent.EventType.PRODUCT_VIEWED, analytics_events__created_at__range=(start, end))))
            .filter(metric__gt=0)
            .order_by("-metric")[:5]
            .values("public_id", "title_fa", "metric")
        )
        top_contacts = (
            Product.objects.visible()
            .annotate(metric=Count("analytics_events", filter=Q(analytics_events__event_type=AnalyticsEvent.EventType.CONTACT_CLICKED, analytics_events__created_at__range=(start, end))))
            .filter(metric__gt=0)
            .order_by("-metric")[:5]
            .values("public_id", "title_fa", "metric")
        )
        search_queries = (
            events.filter(event_type=AnalyticsEvent.EventType.SEARCH_PERFORMED)
            .exclude(query="")
            .values("query")
            .annotate(count=Count("id"))
            .order_by("-count", "query")[:5]
        )
        return Response(
            {
                "range": {"from": start, "to": end},
                "metrics": {
                    "product_views": views.count(),
                    "contact_clicks": contacts.count(),
                    "phone_call_clicks": calls.count(),
                    "unique_product_view_sessions": len(view_sessions),
                    "unique_qualifying_sessions": len(qualifying_sessions),
                    "contact_conversion_rate": conversion,
                },
                "inventory": {
                    "total": sum(inventory_map.values()),
                    "available": inventory_map.get(Product.InventoryStatus.AVAILABLE, 0),
                    "reserved": inventory_map.get(Product.InventoryStatus.RESERVED, 0),
                    "sold": inventory_map.get(Product.InventoryStatus.SOLD, 0),
                },
                "top_products_by_view": list(top_views),
                "top_products_by_contact": list(top_contacts),
                "top_search_queries": list(search_queries),
            }
        )
