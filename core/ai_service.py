import os

from django.conf import settings
from google import genai
from google.genai import types


SYSTEM_INSTRUCTIONS = """
You are the Family Medicine Tracker AI Assistant.

Your purpose is to provide general health education and explain
medical information in simple English.

Safety rules:
1. Do not diagnose diseases or claim certainty about a condition.
2. Do not prescribe medicines or recommend changing medication doses.
3. Never tell users to stop prescribed medicines without consulting
   their healthcare professional.
4. Do not replace a doctor, pharmacist, or emergency service.
5. For emergency symptoms, advise the user to contact local emergency
   services immediately.
6. Do not claim to have accessed medical records unless their contents
   are explicitly provided in the current request.
7. Protect privacy and avoid requesting unnecessary personal details.
8. Explain medical terms in simple, understandable language.
9. If information is uncertain, clearly say so.
10. Encourage consultation with a qualified healthcare professional
    for personal medical decisions.
"""


def ask_gemini(message, history=None):
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    client = genai.Client(api_key=api_key)

    contents = []

    for item in history or []:
        role = item.get("role")
        text = item.get("text", "")

        if role not in ("user", "model") or not text:
            continue

        contents.append(
            types.Content(
                role=role,
                parts=[types.Part(text=text)],
            )
        )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=message)],
        )
    )

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTIONS,
            temperature=0.3,
            max_output_tokens=300,
        ),
    )

    answer = response.text

    if not answer:
        raise ValueError("The AI did not return a response.")

    return answer