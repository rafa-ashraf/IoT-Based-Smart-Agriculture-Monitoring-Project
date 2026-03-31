const API = import.meta.env.VITE_API_URL;

export async function getSensorLatest(deviceId: string) {
  const res = await fetch(`${API}/api/sensors/${deviceId}`);
  if (!res.ok) throw new Error("Failed to fetch latest sensor data");
  return res.json(); // { temperature, humidity, moisture, light, status }
}

export async function getSensorHistory(
  deviceId: string,
  field: "temperature" | "humidity" | "moisture" | "light",
  range: "24h" | "7d" | "1m" = "24h"
) {
  // Map frontend field to backend field
  const fieldMap: Record<string, string> = {
    temperature: "temperature_c",
    humidity: "humidity_pct",
    moisture: "soil_moisture_pct",
    light: "light_raw"
  };

  const res = await fetch(
    `${API}/api/sensors/${deviceId}/history?field=${fieldMap[field]}&range=${range}`
  );
  if (!res.ok) throw new Error("Failed to fetch sensor history");
  return res.json(); // [{ value, timestamp }]
}
export interface Alert {
  id: string;
  message: string;
  severity: "low" | "medium" | "critical";
  zoneId: string;
  timestamp: string;
}

// Fetch active alerts from backend
export async function getActiveAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

//AI frontend integration
export async function getSensorAI(deviceId: string) {
  try {
    const res = await fetch(`${API}/api/sensors/${deviceId}/ai`);
  
//debug for AI
  const text = await res.text(); 
  console.log("STATUS:", res.status);
  console.log("RESPONSE:", text);

  if (!res.ok) throw new Error(`Failed AI fetch: ${res.status}`);
  return JSON.parse(text);
} catch (err) {
    console.error("AI fetch failed:", err);

    return {
      ai: "⚠️ AI unavailable"
    };
  }
}