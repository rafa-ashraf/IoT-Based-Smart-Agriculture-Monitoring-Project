const API = import.meta.env.VITE_API_URL;

export async function getSensors() {
  const response = await fetch(`${API}/api/sensors/temperature`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch temperature");
  }

  return response.json();
}
export async function getHumidity() {
  const res = await fetch(`${API}/api/sensors/humidity`);
  if (!res.ok) throw new Error("Failed to fetch humidity");
  return res.json();
}

export async function getMoisture() {
  const res = await fetch(`${API}/api/sensors/moisture`);
  if (!res.ok) throw new Error("Failed to fetch moisture");
  return res.json();
}

export async function getTemperatureHistory() {
  const res = await fetch(`${API}/api/sensors/temperature/history`);
  if (!res.ok) throw new Error("Failed to fetch temperature history");
  return res.json();
}
