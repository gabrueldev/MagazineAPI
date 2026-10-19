from django.conf import settings
from django.urls import path, include
from django.views.static import serve
from .core.views import custom_404, custom_500

FRONTEND_DIR = settings.BASE_DIR / "Frontend"

urlpatterns = [
    path("", serve, {"path": "index.html", "document_root": FRONTEND_DIR}, name="frontend"),
    path("app/<path:path>", serve, {"document_root": FRONTEND_DIR}, name="frontend-files"),
    path("api/auth/", include("MagazineAPI.apiUsers.urls")),
    path("api/rooms/", include("RoomsAPI.urls")),
    path("api/", include("FilteringAPI.urls")),
    path("api/schedules/", include("SchedulesAPI.urls")),
]
handler404 = custom_404
handler500 = custom_500