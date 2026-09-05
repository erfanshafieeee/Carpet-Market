from django.contrib import admin

from .models import ExchangeRate, Product, ProductImage, ReferenceItem, Store, StoreBranch, StoreMembership


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title_fa", "rug_type", "price_toman", "inventory_status", "deleted_at")
    list_filter = ("rug_type", "inventory_status", "deleted_at")
    search_fields = ("title_fa", "title_en", "public_id")
    inlines = (ProductImageInline,)


admin.site.register(Store)
admin.site.register(StoreBranch)
admin.site.register(StoreMembership)
admin.site.register(ReferenceItem)
admin.site.register(ExchangeRate)

