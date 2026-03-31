import { useState } from "react";
import { getSensorAI } from "@/api/sensors";

export function ChatBot({ deviceId }: { deviceId: string }) {
  const [messages, setMessages] = useState<{ from: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");
    setLoading(true);

    try {
      const aiResp = await getSensorAI(deviceId);
      const aiText = typeof aiResp.ai === "string" ? aiResp.ai : aiResp.ai.reason;
      setMessages((prev) => [...prev, { from: "ai", text: aiText }]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: "ai", text: "AI unavailable" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 w-full max-w-md flex flex-col gap-2 shadow-lg">
      <h2 className="text-lg font-bold">AI Assistant</h2>
      <div className="flex-1 overflow-y-auto h-64 p-2 border rounded bg-gray-50 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded ${m.from === "user" ? "bg-blue-100 self-end" : "bg-green-100 self-start"}`}
          >
            {m.text}
          </div>
        ))}
        {loading && <div className="text-gray-500">AI is thinking...</div>}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about the sensors..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="p-2 bg-blue-500 text-white rounded" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}