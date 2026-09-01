from django.db import migrations, models


def populate_cover_markers(apps, schema_editor):
    product_image = apps.get_model("catalog", "ProductImage")
    product_image.objects.filter(is_cover=True).update(cover_marker=True)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [
        migrations.RemoveConstraint(
            model_name="productimage",
            name="one_cover_image_per_product",
        ),
        migrations.AddField(
            model_name="productimage",
            name="cover_marker",
            field=models.BooleanField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.RunPython(populate_cover_markers, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.UniqueConstraint(
                fields=("product", "cover_marker"),
                name="one_cover_image_per_product",
            ),
        ),
    ]
