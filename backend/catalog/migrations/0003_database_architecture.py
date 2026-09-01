import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def populate_store_architecture(apps, schema_editor):
    Store = apps.get_model("catalog", "Store")
    StoreMembership = apps.get_model("catalog", "StoreMembership")
    User = apps.get_model("accounts", "User")

    for store in Store.objects.filter(public_id__isnull=True).iterator():
        store.public_id = uuid.uuid4()
        store.save(update_fields=["public_id"])

    primary_store = Store.objects.filter(is_active=True).order_by("id").first() or Store.objects.order_by("id").first()
    if primary_store:
        for user in User.objects.filter(is_staff=True, is_active=True).iterator():
            StoreMembership.objects.get_or_create(
                store_id=primary_store.id,
                user_id=user.id,
                defaults={"role": "owner" if user.is_superuser else "manager", "is_active": True},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_portable_cover_constraint"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(name="store", options={"ordering": ("id",)}),
        migrations.AddField(
            model_name="store",
            name="public_id",
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name="store",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now, editable=False),
        ),
        migrations.AddField(
            model_name="store",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.CreateModel(
            name="StoreMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("owner", "Owner"), ("manager", "Manager")], default="manager", max_length=16)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("store", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="catalog.store")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="store_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("store_id", "user_id")},
        ),
        migrations.RunPython(populate_store_architecture, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="store",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name="product",
            name="approximate_age_years",
            field=models.PositiveIntegerField(),
        ),
        migrations.AddIndex(model_name="store", index=models.Index(fields=["is_active"], name="store_active_idx")),
        migrations.AddIndex(
            model_name="storemembership",
            index=models.Index(fields=["user", "is_active"], name="member_user_active_idx"),
        ),
        migrations.AddIndex(
            model_name="storemembership",
            index=models.Index(fields=["store", "is_active"], name="member_store_active_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["store", "deleted_at", "inventory_status", "created_at"], name="prod_store_state_new_idx"),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["store", "deleted_at", "inventory_status", "price_toman"], name="prod_store_state_price_idx"),
        ),
        migrations.AddIndex(
            model_name="exchangerate",
            index=models.Index(fields=["is_active", "is_demo", "quoted_at"], name="rate_active_quote_idx"),
        ),
        migrations.AddConstraint(
            model_name="storemembership",
            constraint=models.UniqueConstraint(fields=("store", "user"), name="unique_store_user"),
        ),
        migrations.AddConstraint(
            model_name="storemembership",
            constraint=models.CheckConstraint(condition=models.Q(role__in=("owner", "manager")), name="membership_valid_role"),
        ),
        migrations.AddConstraint(
            model_name="referenceitem",
            constraint=models.CheckConstraint(
                condition=models.Q(category__in=("city", "weave", "material", "color", "pattern", "brand")),
                name="reference_valid_category",
            ),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(condition=models.Q(rug_type__in=("handmade", "machine")), name="product_valid_rug_type"),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(condition=models.Q(condition__in=("new", "used")), name="product_valid_condition"),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(
                condition=models.Q(inventory_status__in=("available", "reserved", "sold")),
                name="product_valid_inventory",
            ),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(price_toman__gt=0)
                    & models.Q(length_cm__gt=0)
                    & models.Q(width_cm__gt=0)
                    & models.Q(approximate_age_years__gte=0)
                ),
                name="product_positive_values",
            ),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(rug_type="handmade", raj__isnull=False, reeds__isnull=True, density__isnull=True, brand__isnull=True)
                    | models.Q(rug_type="machine", raj__isnull=True, reeds__isnull=False, density__isnull=False, brand__isnull=False)
                ),
                name="product_valid_type_specs",
            ),
        ),
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.CheckConstraint(
                condition=(models.Q(is_cover=True, cover_marker=True) | models.Q(is_cover=False, cover_marker__isnull=True)),
                name="image_cover_marker_valid",
            ),
        ),
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.CheckConstraint(condition=models.Q(sort_order__gte=0, sort_order__lte=9), name="image_sort_order_range"),
        ),
        migrations.AddConstraint(
            model_name="exchangerate",
            constraint=models.CheckConstraint(condition=models.Q(rate_toman__gt=0), name="exchange_rate_positive"),
        ),
    ]
