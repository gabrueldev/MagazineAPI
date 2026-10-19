from django.urls import path, include
from .core.views import custom_404, custom_500

urlpatterns = [
    path("api/auth/", include("MagazineAPI.apiUsers.urls")),
    path("api/rooms/", include("RoomsAPI.urls")),
    path("api/", include("FilteringAPI.urls")),
    path("api/schedules/", include("SchedulesAPI.urls")),
]
handler404 = custom_404
handler500 = custom_500