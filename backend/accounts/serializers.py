from django.contrib.auth import authenticate
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    mobile_number = serializers.RegexField(r"^09\d{9}$")
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            mobile_number=attrs["mobile_number"],
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("شماره موبایل یا رمز عبور صحیح نیست.")
        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=10)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("رمز فعلی صحیح نیست.")
        return value

