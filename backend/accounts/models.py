from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    username = None
    mobile_number = models.CharField(max_length=16, unique=True)

    USERNAME_FIELD = "mobile_number"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.mobile_number

