import logging
import time

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

        # Validate message
        if not isinstance(message, str) or not message.strip():
            return Response(
                {"error": "Please enter a message."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = message.strip()

        if len(message) > 4000:
            return Response(
                {
                    "error": (
                        "Your message is too long. "
                        "Maximum 4000 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate conversation history
        if not isinstance(history, list):
            return Response(
                {"error": "Invalid conversation history."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(history) > 12:
            return Response(
                {"error": "Too many conversation history messages."},
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

            if not isinstance(text, str):
                return Response(
                    {"error": "Invalid conversation message."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            text = text.strip()

            if not text or len(text) > 4000:
                return Response(
                    {"error": "Invalid conversation message."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            validated_history.append({
                "role": role,
                "text": text,
            })

        try:
            start_time = time.perf_counter()

            answer = ask_gemini(
                message=message,
                history=validated_history,
            )

            elapsed = time.perf_counter() - start_time

            logger.info(
                "Gemini response completed in %.2f seconds",
                elapsed,
            )

            return Response(
                {
                    "answer": answer,
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:

            logger.warning(
                "AI configuration or response error: %s",
                exc,
            )

            return Response(
                {"error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except TimeoutError:

            logger.warning("Gemini request timed out.")

            return Response(
                {
                    "error": (
                        "Gemini took too long to respond. "
                        "Please try again."
                    )
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT,
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