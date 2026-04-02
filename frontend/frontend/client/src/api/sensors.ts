const API = import.meta.env.VITE_API_URL;

export interface Alert {
  id: string;
  message: string;
  severity: "low" | "medium" | "critical";
  zoneId: string;
  timestamp: string;
  aiInsight?: string; // AI recommendation
}

export interface SensorData {
  temperature?: number;
  humidity?: number;
  moisture?: number;
  light?: number;
  status?: "optimal" | "warning" | "critical";
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ========================
// FETCH LATEST SENSOR DATA
// ========================
export async function getSensorLatest(deviceId: string): Promise<SensorData> {
  const res = await fetch(`${API}/api/sensors/${deviceId}`);
  if (!res.ok) throw new Error("Failed to fetch latest sensor data");
  return res.json();
}

// ========================
// FETCH SENSOR HISTORY
// ========================
export async function getSensorHistory(
  deviceId: string,
  field: "temperature" | "humidity" | "moisture" | "light",
  range: "24h" | "7d" | "1m" = "24h"
): Promise<{ value: number; timestamp: string }[]> {
  const fieldMap: Record<string, string> = {
    temperature: "temperature_c",
    humidity: "humidity_pct",
    moisture: "soil_moisture_pct",
    light: "light_raw",
  };

  const res = await fetch(
    `${API}/api/sensors/${deviceId}/history?field=${fieldMap[field]}&range=${range}`
  );
  if (!res.ok) throw new Error("Failed to fetch sensor history");
  return res.json();
}

// ========================
// FETCH ACTIVE ALERTS
// ========================
export async function getActiveAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

// ========================
// AI INTEGRATION
// ========================

// Returns a smart AI alert for a given device
export async function getAIInsights(
  deviceId: string
): Promise<{ aiAlert?: Alert; aiReply?: string }> {
  try {
    const res = await fetch(`${API}/api/sensors/${deviceId}/ai`);
    if (!res.ok) throw new Error(`AI fetch failed: ${res.status}`);

    const data = await res.json();

    // Expected backend response:
    // { aiAlert: {id, message, severity, zoneId, timestamp, aiInsight}, aiReply: "chat response" }
    return data;
  } catch (err) {
    console.error("AI fetch failed:", err);
    return {};
  }
}

// ========================
// CHATBOT
// ========================
export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendChatMessage(
  deviceId: string,
  message: string,
  conversation?: ConversationMessage[]
): Promise<{ reply: string }> {
  try {
    const res = await fetch(`${API}/api/sensors/${deviceId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversation }),
    });

    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

    const data = await res.json();
    return { reply: data.reply ?? "AI unavailable" };
  } catch (err) {
    console.error("Chat failed:", err);
    return { reply: "AI unavailable" };
  }
}


