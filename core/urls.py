from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # User authentication
    path("api/users/", include("users.urls")),

    # Family and medicine management
    path("api/family/", include("family.urls")),
    path("api/medicines/", include("medicines.urls")),

    # Gemini AI Assistant
    path("api/ai/", include("core.ai_urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )