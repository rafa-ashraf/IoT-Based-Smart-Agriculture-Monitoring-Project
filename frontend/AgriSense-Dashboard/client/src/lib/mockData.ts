import { addHours, subDays, subHours, format } from "date-fns";

export type MetricType = "moisture" | "temp" | "humidity" | "light";

export interface Reading {
  timestamp: string;
  value: number;
}

export interface Zone {
  id: string;
  name: string;
  crop: string;
  status: "optimal" | "warning" | "critical" | "offline";
  lastUpdated: string;
  size: string;
  metrics: {
    soilMoisture: number; // %
    soilTemp: number; // Celsius
    airTemp: number; // Celsius
    humidity: number; // %
    light: number; // Lux
  };
}

export interface Alert {
  id: string;
  severity: "low" | "medium" | "critical";
  message: string;
  zoneId: string;
  timestamp: string;
}

// Generate some mock history data
const generateHistory = (hours: number, baseValue: number, variance: number) => {
  const data: Reading[] = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    data.push({
      timestamp: subHours(now, i).toISOString(),
      value: baseValue + (Math.random() * variance * 2 - variance),
    });
  }
  return data;
};

export const mockZones: Zone[] = [
  {
    id: "z1",
    name: "Node 1",
    crop: "Potato",
    status: "optimal",
    lastUpdated: new Date().toISOString(),
    size: "12.5 Acres",
    metrics: {
      soilMoisture: 42,
      soilTemp: 18.5,
      airTemp: 22.1,
      humidity: 45,
      light: 45000,
    },
  },
  {
    id: "z2",
    name: "Node 2",
    crop: "Tomatoes",
    status: "warning",
    lastUpdated: subHours(new Date(), 2).toISOString(),
    size: "2000 Sq Ft",
    metrics: {
      soilMoisture: 28, // Low
      soilTemp: 24.0,
      airTemp: 26.5,
      humidity: 80,
      light: 32000,
    },
  },
  {
    id: "z3",
    name: "Node 3",
    crop: "Apples",
    status: "critical",
    lastUpdated: subDays(new Date(), 1).toISOString(), // Stale
    size: "5 Acres",
    metrics: {
      soilMoisture: 15, // Very Low
      soilTemp: 12.0,
      airTemp: 15.0,
      humidity: 30,
      light: 55000,
    },
  },
  {
    id: "z4",
    name: "Field Delta",
    crop: "Soybeans",
    status: "offline",
    lastUpdated: subDays(new Date(), 3).toISOString(),
    size: "8 Acres",
    metrics: {
      soilMoisture: 0,
      soilTemp: 0,
      airTemp: 0,
      humidity: 0,
      light: 0,
    },
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "a1",
    severity: "critical",
    message: "Critical low moisture detected",
    zoneId: "z3",
    timestamp: subHours(new Date(), 1).toISOString(),
  },
  {
    id: "a2",
    severity: "medium",
    message: "Sensor gateway offline",
    zoneId: "z4",
    timestamp: subDays(new Date(), 1).toISOString(),
  },
  {
    id: "a3",
    severity: "low",
    message: "Irrigation scheduled in 2h",
    zoneId: "z1",
    timestamp: new Date().toISOString(),
  },
];

export const getHistoryData = (metric: MetricType, range: "24h" | "7d") => {
  const hours = range === "24h" ? 24 : 168;
  const baseMap = {
    moisture: 40,
    temp: 20,
    humidity: 50,
    light: 40000,
  };
  return generateHistory(hours, baseMap[metric], 5);
};
