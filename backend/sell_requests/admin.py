from django.contrib import admin

from .models import SellRequest, SellRequestAdminAction, SellRequestImage, SellRequestNote, SellRequestStatusHistory


class SellRequestImageInline(admin.TabularInline):
    model = SellRequestImage
    extra = 0


@admin.register(SellRequest)
class SellRequestAdmin(admin.ModelAdmin):
    list_display = ("tracking_code", "phone_number", "rug_type", "province", "status", "created_at")
    list_filter = ("status", "rug_type", "province")
    search_fields = ("tracking_code", "phone_number")
    readonly_fields = ("public_id", "tracking_code", "first_admin_action_at", "created_at", "updated_at")
    inlines = (SellRequestImageInline,)


admin.site.register(SellRequestStatusHistory)
admin.site.register(SellRequestNote)
admin.site.register(SellRequestAdminAction)
