from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CarpetUserAdmin(UserAdmin):
    ordering = ("mobile_number",)
    list_display = ("mobile_number", "is_staff", "is_active")
    fieldsets = (
        (None, {"fields": ("mobile_number", "password")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("mobile_number", "password1", "password2")}),)
    search_fields = ("mobile_number",)

