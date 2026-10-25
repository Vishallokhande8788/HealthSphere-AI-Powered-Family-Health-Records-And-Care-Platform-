import os
from functools import lru_cache

from django.conf import settings

from google import genai
from google.genai import types


# --------------------------------------------------
# AI CONFIGURATION
# --------------------------------------------------

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite",
)

MAX_OUTPUT_TOKENS = 350

MAX_HISTORY_MESSAGES = 6


# --------------------------------------------------
# SYSTEM INSTRUCTIONS
# --------------------------------------------------

SYSTEM_INSTRUCTIONS = """
You are the Family Medicine Tracker AI Assistant.

Your purpose is to provide general health education.

Response rules:
1. Always use simple English.
2. Give clear and short answers.
3. For simple questions, answer in 3 to 6 sentences.
4. Use bullet points only when helpful.
5. Avoid unnecessary introductions and repetition.
6. Explain medical terms in easy language.

Medical safety rules:
1. Do not diagnose medical conditions.
2. Do not prescribe medicines.
3. Do not recommend changing medicine doses.
4. Never tell users to stop prescribed medicines.
5. Encourage professional medical advice when needed.
6. For emergency symptoms, advise immediate emergency care.
7. Do not claim to have accessed medical records.
8. Respect user privacy.
9. Clearly explain uncertainty.
10. Do not replace doctors or emergency services.

If a user asks about stroke symptoms, explain that sudden
face drooping, arm weakness, speech difficulty, or other
sudden neurological symptoms need emergency medical care.

Keep answers helpful, accurate, and concise.
"""


# --------------------------------------------------
# REUSE GEMINI CLIENT
# --------------------------------------------------

@lru_cache(maxsize=1)
def get_gemini_client():

    api_key = getattr(
        settings,
        "GEMINI_API_KEY",
        "",
    )

    if not api_key:
        raise ValueError(
            "Gemini API key is not configured."
        )

    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=45000,
        ),
    )


# --------------------------------------------------
# ASK GEMINI
# --------------------------------------------------

def ask_gemini(message, history=None):

    if not isinstance(message, str) or not message.strip():
        raise ValueError("Please enter a valid message.")

    client = get_gemini_client()

    contents = []

    # Keep recent conversation context only
    recent_history = (history or [])[-MAX_HISTORY_MESSAGES:]

    for item in recent_history:

        role = item.get("role")
        text = item.get("text", "")

        if role not in ("user", "model"):
            continue

        if not isinstance(text, str) or not text.strip():
            continue

        contents.append(
            types.Content(
                role=role,
                parts=[
                    types.Part(
                        text=text.strip(),
                    )
                ],
            )
        )

    # Add current question
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part(
                    text=message.strip(),
                )
            ],
        )
    )

    # Generate a short answer
    response = client.models.generate_content(
    model=GEMINI_MODEL,
    contents=contents,
    config=types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTIONS,
        temperature=0.2,
        max_output_tokens=500,
    ),
)

    answer = response.text

    if not answer or not answer.strip():
        raise ValueError(
            "Gemini did not return an answer."
        )

    return answer.strip()