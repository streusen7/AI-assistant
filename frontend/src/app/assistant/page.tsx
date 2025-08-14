"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
}

export default function AssistantPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/auth/login");

    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      } else {
        console.warn("Speech Recognition not supported");
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [router]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleChat = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { sender: "user", text: input };
    setChatHistory((prev) => [...prev, userMessage]);
    setLoading(true);
    setResponse(null);
    setAudioUrl(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const chatRes = await fetch("http://localhost:8000/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!chatRes.ok) throw new Error("LLM request failed");
      const { response: llmResponse } = await chatRes.json();
      setResponse(llmResponse);

      const assistantMessage: ChatMessage = {
        sender: "assistant",
        text: llmResponse,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);

      const audioRes = await fetch("http://localhost:8000/tts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: llmResponse }),
      });

      if (!audioRes.ok) throw new Error("TTS request failed");
      const audioBlob = await audioRes.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
      setResponse("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  useEffect(() => {
    chatWindowRef.current?.scrollTo({
      top: chatWindowRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatHistory]);

  return (
    <div className="min-h-screen bg-gray-950 text-red px-6 py-12 text-lg">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">Nemi Assistant 🤖</h1>

        {/* Chat history */}
        <div
          ref={chatWindowRef}
          className="h-[60vh] overflow-y-auto bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-4"
        >
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.sender === "user" ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`max-w-xl px-4 py-3 rounded-2xl ${
                  msg.sender === "user"
                    ? "bg-purple-600 self-end ml-auto text-right"
                    : "bg-gray-700 self-start mr-auto text-left"
                }`}
              >
                <p>{msg.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input and buttons */}
        <div className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask me anything..."
              className="w-full text-lg p-4 pr-14 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <button
              onClick={toggleListening}
              type="button"
              disabled={!recognitionRef.current || loading}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-3 rounded-full ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-gray-700 hover:bg-gray-600"
              } ${!recognitionRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              🎤
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleChat}
              disabled={loading || !input.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-semibold disabled:opacity-50 text-xl"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>

        {/* Play audio */}
        {response && audioUrl && (
          <div className="flex justify-end">
            <button
              onClick={() => new Audio(audioUrl).play()}
              className="text-base bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              ▶️ Play Response
            </button>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-10 w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-lg flex items-center justify-center gap-2"
        >
          ⬅️ Back to Dashboard
        </button>
      </div>
    </div>
  );
}
