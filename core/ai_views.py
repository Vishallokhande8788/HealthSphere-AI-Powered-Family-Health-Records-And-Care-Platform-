import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_service import ask_gemini


logger = logging.getLogger(__name__)


class AIAssistantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "")
        history = request.data.get("history", [])

        if not isinstance(message, str) or not message.strip():
            return Response(
                {"error": "Please enter a message."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) > 4000:
            return Response(
                {"error": "Your message is too long. Maximum 4000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(history, list) or len(history) > 12:
            return Response(
                {"error": "Invalid conversation history."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated_history = []

        for item in history:
            if not isinstance(item, dict):
                return Response(
                    {"error": "Invalid conversation history."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            role = item.get("role")
            text = item.get("text")

            if role not in ("user", "model"):
                return Response(
                    {"error": "Invalid conversation role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not isinstance(text, str) or len(text) > 4000:
                return Response(
                    {"error": "Invalid conversation message."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            validated_history.append({
                "role": role,
                "text": text,
            })

        try:
            answer = ask_gemini(
                message=message.strip(),
                history=validated_history,
            )

            return Response(
                {"answer": answer},
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            logger.exception("AI Assistant request failed.")

            return Response(
                {
                    "error": (
                        "The AI Assistant is temporarily unavailable. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )