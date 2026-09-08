from __future__ import annotations

from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from catalog.permissions import IsStoreAdmin

from .models import SellRequest, SellRequestAdminAction, SellRequestNote, SellRequestStatusHistory
from .pagination import SellRequestPagination
from .serializers import (
    AdminSellRequestDetailSerializer,
    AdminSellRequestListSerializer,
    PublicSellRequestCreateSerializer,
    SellRequestNoteCreateSerializer,
    SellRequestStatusSerializer,
)


class PublicSellRequestViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = (AllowAny,)
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = PublicSellRequestCreateSerializer
    throttle_scope = "sell_submit"


class AdminSellRequestViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = (IsStoreAdmin,)
    parser_classes = (JSONParser,)
    pagination_class = SellRequestPagination
    lookup_field = "public_id"

    def get_queryset(self):
        queryset = (
            SellRequest.objects.manageable_by(self.request.user)
            .select_related("store", "province", "city", "pattern", "brand")
            .prefetch_related("materials", "colors", "images", "status_history__changed_by", "notes__author")
            .annotate(image_count=Count("images", distinct=True))
        )
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(Q(tracking_code__icontains=query) | Q(phone_number__icontains=query))
        if value := self.request.query_params.get("status"):
            queryset = queryset.filter(status=value)
        if value := self.request.query_params.get("type"):
            queryset = queryset.filter(rug_type=value)
        range_value = self.request.query_params.get("range", "30")
        now = timezone.now()
        if range_value in {"7", "30", "90"}:
            queryset = queryset.filter(created_at__gte=now - timedelta(days=int(range_value)))
        elif range_value == "custom":
            from_date = parse_date(self.request.query_params.get("from", ""))
            to_date = parse_date(self.request.query_params.get("to", ""))
            if not from_date or not to_date or from_date > to_date:
                return queryset.none()
            start = timezone.make_aware(datetime.combine(from_date, time.min))
            end = timezone.make_aware(datetime.combine(to_date, time.max))
            queryset = queryset.filter(created_at__range=(start, end))
        return queryset.order_by("-created_at", "-id")

    def get_serializer_class(self):
        return AdminSellRequestListSerializer if self.action == "list" else AdminSellRequestDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._record_action(instance, SellRequestAdminAction.Action.VIEWED)
        return Response(self.get_serializer(instance).data)

    def _record_action(self, sell_request, action_type, metadata=None):
        SellRequestAdminAction.objects.create(
            sell_request=sell_request,
            actor=self.request.user,
            action=action_type,
            metadata=metadata or {},
        )
        sell_request.mark_admin_action()

    @action(detail=True, methods=("post",), url_path="call")
    def call_clicked(self, request, *args, **kwargs):
        sell_request = self.get_object()
        self._record_action(sell_request, SellRequestAdminAction.Action.CALL_CLICKED)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=("post",), url_path="notes")
    def add_note(self, request, *args, **kwargs):
        sell_request = self.get_object()
        serializer = SellRequestNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = SellRequestNote.objects.create(
            sell_request=sell_request,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        self._record_action(sell_request, SellRequestAdminAction.Action.NOTE_ADDED, {"note_id": note.id})
        return Response(AdminSellRequestDetailSerializer(sell_request, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=("patch",), url_path="status")
    @transaction.atomic
    def update_status(self, request, *args, **kwargs):
        sell_request = SellRequest.objects.select_for_update().get(pk=self.get_object().pk)
        serializer = SellRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_status = sell_request.status
        for field, value in serializer.validated_data.items():
            setattr(sell_request, field, value)
        sell_request.full_clean()
        sell_request.save(update_fields=("status", "rejection_reason", "rejection_note", "updated_at"))
        if old_status != sell_request.status:
            SellRequestStatusHistory.objects.create(
                sell_request=sell_request,
                from_status=old_status,
                to_status=sell_request.status,
                rejection_reason=sell_request.rejection_reason,
                changed_by=request.user,
            )
            self._record_action(
                sell_request,
                SellRequestAdminAction.Action.STATUS_CHANGED,
                {"from_status": old_status, "to_status": sell_request.status},
            )
        return Response(AdminSellRequestDetailSerializer(sell_request, context={"request": request}).data)
