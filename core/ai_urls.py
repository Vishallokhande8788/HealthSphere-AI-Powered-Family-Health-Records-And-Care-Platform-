from django.urls import path

from .ai_views import AIAssistantView


urlpatterns = [
    path(
        "chat/",
        AIAssistantView.as_view(),
        name="ai-assistant-chat",
    ),
]