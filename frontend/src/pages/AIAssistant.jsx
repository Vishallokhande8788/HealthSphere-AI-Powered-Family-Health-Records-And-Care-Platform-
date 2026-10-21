import { useEffect, useRef, useState } from "react";
import api from "../api";

const SUGGESTED_QUESTIONS = [
  "What is blood pressure?",
  "Explain diabetes in simple English.",
  "What is the difference between a virus and bacteria?",
  "Why is taking medicine on time important?",
];

const INITIAL_MESSAGE = {
  role: "model",
  text: "Hello! I'm your Family Medicine Tracker AI Assistant. Ask me general health questions, and I'll explain them in simple English.",
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question = input) => {
    const text = question.trim();

    if (!text || loading) return;

    if (text.length > 4000) {
      setError("Message must be 4000 characters or fewer.");
      return;
    }

    setError("");

    // Exclude the initial greeting because it is not part of
    // the actual conversation sent to Gemini.
    const conversation = messages.slice(1);

    // The Django endpoint accepts up to 12 history messages.
    const history = conversation.slice(-12);

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post(
        "ai/chat/",
        {
          message: text,
          history,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        },
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: response.data.answer,
        },
      ]);
    } catch (err) {
      console.error("AI Assistant error:", err);

      const message =
        err.response?.status === 401
          ? "Your login session has expired. Please log in again."
          : err.response?.data?.error ||
            "Unable to contact the AI Assistant. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (loading) return;

    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-cyan-600 px-5 py-5 text-white">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">
              🤖 AI Health Assistant
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              Powered by Google Gemini
            </p>
          </div>

          <button
            type="button"
            onClick={clearChat}
            disabled={loading}
            className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium transition hover:bg-white/20 disabled:opacity-50"
          >
            Clear Chat
          </button>
        </div>

        {/* Chat messages */}
        <div className="h-[55vh] min-h-[350px] space-y-5 overflow-y-auto bg-slate-50 p-5">
          {messages.map((message, index) => {
            const isUser = message.role === "user";

            return (
              <div
                key={index}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm md:max-w-[75%] ${
                    isUser
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold opacity-70">
                    {isUser ? "You" : "AI Assistant"}
                  </p>
                  {message.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
              🤖 Generating your answer...
              <p className="mt-1 text-xs">This may take a few seconds.</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="border-t border-slate-200 bg-white px-5 py-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Try asking:
            </p>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={loading}
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-left text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 bg-white p-5"
        >
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a general health question..."
              rows={2}
              maxLength={4000}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="min-h-[56px] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Wait..." : "Send"}
            </button>
          </div>

          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            AI provides general health education only. It cannot diagnose
            conditions or prescribe medicines. Consult a qualified healthcare
            professional for personal medical advice.
          </p>
        </form>
      </div>
    </div>
  );
}
