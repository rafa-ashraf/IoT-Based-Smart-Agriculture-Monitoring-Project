import { MetricCard } from "@/components/dashboard/SensorMetrics";
import { HistoryChart } from "@/components/dashboard/HistoryChart"; 
import { AlertsList } from "@/components/dashboard/AlertsList";
import { ChatBot } from "@/components/dashboard/ChatBot";
import { Droplets, Thermometer, Sun, CloudRain, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getSensorLatest } from "@/api/sensors";

type SensorData = {
  temperature?: number;
  humidity?: number;
  moisture?: number;
  light?: number;
  status?: "optimal" | "warning" | "critical";
};

export default function Home() {
  const deviceId = "esp32_node_01";

  const [sensorData, setSensorData] = useState<SensorData>({});
  const [loading, setLoading] = useState(true);

  // ======================== FETCH SENSOR DATA ========================
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getSensorLatest(deviceId);
      setSensorData(data);
    } catch {
      setSensorData({});
    } finally {
      setLoading(false);
    }
  };

  // ======================== INITIAL LOAD + REFRESH ========================
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 60000); // refresh every 60s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of farm environmental conditions, smart alerts, and AI insights.
          </p>
        </div>
        <Link href="/zones">
          <Button className="gap-2">
            View All Zones <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* METRICS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Soil Moisture"
          value={loading ? "..." : sensorData.moisture ?? "-"}
          unit="%"
          icon={Droplets}
          status={sensorData.status ?? "optimal"}
        />
        <MetricCard
          title="Temperature"
          value={loading ? "..." : sensorData.temperature ?? "-"}
          unit="°C"
          icon={Thermometer}
          status={sensorData.status ?? "optimal"}
        />
        <MetricCard
          title="Humidity"
          value={loading ? "..." : sensorData.humidity ?? "-"}
          unit="%"
          icon={CloudRain}
          status={sensorData.status ?? "optimal"}
        />
        <MetricCard
          title="Light"
          value={loading ? "..." : sensorData.light ?? "-"}
          unit="lx"
          icon={Sun}
          status={sensorData.status ?? "optimal"}
        />
      </div>

      {/* CHART + SMART ALERTS */}
      <div className="grid gap-4 md:grid-cols-7 h-[500px]">
        <div className="col-span-5">
          <HistoryChart
            title="Soil Moisture Trends"
            deviceId={deviceId}
            field="moisture"
            unit="%"
            color="hsl(var(--chart-1))"
          />
        </div>
        <div className="col-span-2">
          {/* Unified alerts list with AI insights */}
          <AlertsList includeAI={true} />
        </div>
      </div>

      {/* AI CHAT */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChatBot deviceId={deviceId} />
      </div>
    </div>
  );
}