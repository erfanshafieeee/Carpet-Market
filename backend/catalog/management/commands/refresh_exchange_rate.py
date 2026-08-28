from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Refresh the market USD sell rate through a configured provider adapter."

    def handle(self, *args, **options):
        raise CommandError("Exchange-rate provider is intentionally not configured for V1 local development.")

