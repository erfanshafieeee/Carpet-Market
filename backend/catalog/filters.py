import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_toman", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price_toman", lookup_expr="lte")
    min_length = django_filters.NumberFilter(field_name="length_cm", lookup_expr="gte")
    max_length = django_filters.NumberFilter(field_name="length_cm", lookup_expr="lte")
    min_width = django_filters.NumberFilter(field_name="width_cm", lookup_expr="gte")
    max_width = django_filters.NumberFilter(field_name="width_cm", lookup_expr="lte")
    min_age = django_filters.NumberFilter(field_name="approximate_age_years", lookup_expr="gte")
    max_age = django_filters.NumberFilter(field_name="approximate_age_years", lookup_expr="lte")
    min_raj = django_filters.NumberFilter(field_name="raj", lookup_expr="gte")
    max_raj = django_filters.NumberFilter(field_name="raj", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ()

