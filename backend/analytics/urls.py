from django.urls import path

from .views import DashboardView, EventCreateView


urlpatterns = [
    path("events/", EventCreateView.as_view(), name="analytics-event"),
    path("dashboard/", DashboardView.as_view(), name="analytics-dashboard"),
]

