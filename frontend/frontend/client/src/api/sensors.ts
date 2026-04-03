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
  deviceId?: string;
  temperature?: number;
  humidity?: number;
  moisture?: number;
  light?: number;
  timestamp?: string;
  status?: "optimal" | "warning" | "critical";
}

export interface ConversationMessage {
  role: "user" | "assistant";
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
  range: "24h" | "7d" | "30d" | "90d" = "24h"
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
  const res = await fetch(`${API}/api/sensors/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any, idx: number) => {
    const status = item?.status;
    const severity: Alert["severity"] =
      status === "critical" ? "critical" : status === "warning" ? "medium" : "low";
    return {
      id: `${item?.deviceId || "device"}-${idx}-${Date.now()}`,
      message: String(item?.reason || "No details available"),
      severity,
      zoneId: String(item?.deviceId || "unknown"),
      timestamp: new Date().toISOString(),
      aiInsight: String(item?.action || ""),
    };
  });
}

export async function getSensorsOverview(): Promise<SensorData[]> {
  const res = await fetch(`${API}/api/sensors`);
  if (!res.ok) throw new Error("Failed to fetch sensor overview");
  const raw = await res.json();

  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.devices)
      ? raw.devices
      : [];

  const toNumber = (v: any): number | undefined => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return rows.map((row: any, idx: number) => {
    const deviceId =
      String(
        row?.deviceId ??
        row?.device_id ??
        row?.id ??
        row?.zoneId ??
        row?._id ??
        ""
      ).trim() || `device-${idx + 1}`;

    const moisture = toNumber(row?.moisture ?? row?.soil_moisture_pct);
    const temperature = toNumber(row?.temperature ?? row?.temperature_c);
    const humidity = toNumber(row?.humidity ?? row?.humidity_pct);
    const light = toNumber(row?.light ?? row?.light_raw);

    let status: SensorData["status"] = row?.status;
    if (!status) {
      if (moisture !== undefined && moisture < 20) status = "critical";
      else if (temperature !== undefined && temperature > 35) status = "warning";
      else status = "optimal";
    }

    return {
      deviceId,
      moisture,
      temperature,
      humidity,
      light,
      timestamp: row?.timestamp ?? row?._time ?? undefined,
      status,
    };
  });
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

    if (!res.ok) {
      const fallbackText = await res.text().catch(() => "");
      throw new Error(fallbackText || `Chat failed: ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    return { reply: data.reply ?? "I couldn't generate a response right now." };
  } catch (err) {
    console.error("Chat failed:", err);
    return { reply: "I couldn't generate a response right now. Please try again." };
  }
}
