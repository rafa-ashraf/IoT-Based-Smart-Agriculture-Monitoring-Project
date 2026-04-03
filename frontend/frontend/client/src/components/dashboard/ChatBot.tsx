import { useEffect, useRef, useState } from "react";
import { sendChatMessage, ConversationMessage } from "@/api/sensors";
import { cn } from "@/lib/utils";

interface Message {
  from: "user" | "ai";
  text: string;
}

export function ChatBot({ deviceId, className }: { deviceId: string; className?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ai",
      text: "Ask me about this device's moisture, temperature, humidity, or what action to take next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async () => {
    const userMsg = input.trim();
    if (!userMsg || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const conversation: ConversationMessage[] = messages.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const { reply } = await sendChatMessage(deviceId, userMsg, conversation);
      setMessages((prev) => [...prev, { from: "ai", text: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "I couldn't process that right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("border rounded-lg p-4 w-full flex flex-col gap-2 shadow-lg bg-background", className)}>
      <h2 className="text-lg font-bold flex items-center justify-between">
        AI Assistant <span className="text-xs text-muted-foreground">Smart Farm Chat</span>
      </h2>

      <div ref={listRef} className="flex-1 overflow-y-auto h-64 p-2 border rounded bg-muted/30 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[85%] break-words ${
              m.from === "user"
                ? "bg-primary/15 text-foreground self-end ml-auto border border-primary/20"
                : "bg-card text-card-foreground self-start mr-auto border"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="text-muted-foreground italic text-sm">Thinking... please wait</div>
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
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
