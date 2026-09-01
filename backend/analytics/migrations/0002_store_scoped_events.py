import django.db.models.deletion
from django.db import migrations, models


def populate_event_stores(apps, schema_editor):
    AnalyticsEvent = apps.get_model("analytics", "AnalyticsEvent")
    Product = apps.get_model("catalog", "Product")
    Store = apps.get_model("catalog", "Store")

    for product_id, store_id in Product.objects.values_list("id", "store_id"):
        AnalyticsEvent.objects.filter(product_id=product_id).update(store_id=store_id)

    fallback_store = Store.objects.filter(is_active=True).order_by("id").first() or Store.objects.order_by("id").first()
    unassigned = AnalyticsEvent.objects.filter(store_id__isnull=True)
    if unassigned.exists() and fallback_store is None:
        raise RuntimeError("Analytics events exist but no store is available for attribution.")
    if fallback_store:
        unassigned.update(store_id=fallback_store.id)


class Migration(migrations.Migration):
    dependencies = [
        ("analytics", "0001_initial"),
        ("catalog", "0003_database_architecture"),
    ]

    operations = [
        migrations.AddField(
            model_name="analyticsevent",
            name="store",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="analytics_events",
                to="catalog.store",
            ),
        ),
        migrations.RunPython(populate_event_stores, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="analyticsevent",
            name="store",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="analytics_events",
                to="catalog.store",
            ),
        ),
        migrations.AddIndex(
            model_name="analyticsevent",
            index=models.Index(fields=["store", "event_type", "created_at"], name="event_store_type_time_idx"),
        ),
        migrations.AddIndex(
            model_name="analyticsevent",
            index=models.Index(fields=["store", "session_id", "event_type"], name="event_store_session_idx"),
        ),
        migrations.AddConstraint(
            model_name="analyticsevent",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    event_type__in=(
                        "market_viewed", "search_performed", "filter_applied", "sort_changed",
                        "product_card_clicked", "product_viewed", "contact_clicked",
                        "phone_call_clicked", "gallery_interacted",
                    )
                ),
                name="analytics_valid_event_type",
            ),
        ),
        migrations.AddConstraint(
            model_name="analyticsevent",
            constraint=models.CheckConstraint(condition=models.Q(language__in=("fa", "en")), name="analytics_valid_language"),
        ),
        migrations.AddConstraint(
            model_name="analyticsevent",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(
                        event_type__in=(
                            "product_card_clicked", "product_viewed", "contact_clicked",
                            "phone_call_clicked", "gallery_interacted",
                        ),
                        product__isnull=False,
                    )
                    | (
                        ~models.Q(
                            event_type__in=(
                                "product_card_clicked", "product_viewed", "contact_clicked",
                                "phone_call_clicked", "gallery_interacted",
                            )
                        )
                        & models.Q(product__isnull=True)
                    )
                ),
                name="analytics_valid_product",
            ),
        ),
        migrations.AddConstraint(
            model_name="analyticsevent",
            constraint=models.CheckConstraint(
                condition=(
                    (models.Q(event_type="search_performed") & ~models.Q(query=""))
                    | (~models.Q(event_type="search_performed") & models.Q(query=""))
                ),
                name="analytics_valid_query",
            ),
        ),
    ]
