from django.urls import path
from django_demo.verify import views

urlpatterns = [
    path("healthz", views.healthz),
    path("start", views.start),
    path("confirm", views.confirm),
]

