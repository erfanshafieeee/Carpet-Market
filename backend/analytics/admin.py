from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "session_id", "product", "language", "created_at")
    list_filter = ("event_type", "language")
    search_fields = ("session_id", "product__title_fa", "query")
    readonly_fields = ("created_at",)

