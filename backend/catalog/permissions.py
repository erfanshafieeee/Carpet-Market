from rest_framework.permissions import BasePermission


class IsStoreAdmin(BasePermission):
    message = "دسترسی مدیریت فروشگاه برای این حساب فعال نیست."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        return user.store_memberships.filter(
            is_active=True,
            store__is_active=True,
        ).exists()
