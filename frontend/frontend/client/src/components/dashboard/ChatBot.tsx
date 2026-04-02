import { useState } from "react";
import { sendChatMessage, ConversationMessage } from "@/api/sensors";

interface Message {
  from: "user" | "ai";
  text: string;
}

export function ChatBot({ deviceId }: { deviceId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const systemInstructions = `
You are an AI agricultural assistant built into the farm monitoring dashboard.
Your job is to help the user interpret sensor data, explain alerts, and provide practical advice.

Tone & Style:
- Friendly, encouraging, and concise.
- Offer short explanations and suggest next steps.
- If a question is vague, ask politely for clarification.
- After asking for clarification try to use knwoledge from web data to offer insight. 

Limitations:
- You cannot change device settings.
- If you lack data, ask which device or sensor the user means.
`;

  const sendMessage = async () => {
    const userMsg = input.trim();
    if (!userMsg || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      // Gemini @google/genai only supports USER and MODEL
const conversation: ConversationMessage[] = [
  { role: "user", content: systemInstructions },
  ...messages.map((m) => ({
    role: (m.from === "user" ? "user" : "model") as ConversationMessage["role"],
    content: m.text,
  })),
  { role: "user", content: userMsg },
];

      const { reply } = await sendChatMessage(deviceId, userMsg, conversation);
      setMessages((prev) => [...prev, { from: "ai", text: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Sorry, I couldn’t process that right now — please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 w-full max-w-md flex flex-col gap-2 shadow-lg">
      <h2 className="text-lg font-bold flex items-center justify-between">
        AI Assistant <span className="text-xs text-muted-foreground">🌱 Smart Farm Chat</span>
      </h2>

      <div className="flex-1 overflow-y-auto h-64 p-2 border rounded bg-gray-50 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[85%] break-words ${
              m.from === "user"
                ? "bg-blue-100 text-black self-end ml-auto"
                : "bg-green-100 text-black self-start mr-auto"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="text-gray-500 italic text-sm">🤔 Thinking... please wait</div>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 p-2 border rounded focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about moisture, temperature, or alerts..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className={`p-2 rounded text-white ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
