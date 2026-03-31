import { MetricCard } from "@/components/dashboard/SensorMetrics";
import { HistoryChart } from "@/components/dashboard/HistoryChart"; 
import { AlertsList } from "@/components/dashboard/AlertsList";
import { AICard } from "@/components/dashboard/AICard";
import { ChatBot } from "@/components/dashboard/ChatBot";
import { Droplets, Thermometer, Sun, CloudRain, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getSensorLatest, getSensorAI } from "@/api/sensors";

export default function Home() {
  const deviceId = "esp32_node_01";
  const [sensorData, setSensorData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [ailoading, setAiLoading] = useState(true);
  const [aiText, setAiText] = useState("");

  const fetchData = () => {
    setLoading(true);
    getSensorLatest(deviceId)
      .then((data) => setSensorData(data))
      .finally(() => setLoading(false));
  };

  const fetchAI = () => {
  setAiLoading(true);
  getSensorAI(deviceId)
    .then((res) => {
          // if ai is an object, convert to readable string
      if (typeof res.ai === "object") {
        setAiText(`Status: ${res.ai.status}\nReason: ${res.ai.reason}\nAction: ${res.ai.action}`);
      } else {
        setAiText(res.ai);
      }
    })
    .finally(() => setAiLoading(false));
};
  
  useEffect(() => {
    fetchData();
    fetchAI();
    const interval = setInterval(fetchData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of farm environmental conditions and active alerts.</p>
        </div>
        <Link href="/zones">
          <Button className="gap-2 shadow-sm">
            View All Zones
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Soil Moisture"
          value={loading ? "..." : sensorData.moisture ?? "-"}
          unit="%"
          icon={Droplets}
          trend="down"
          trendValue="2.1%"
          status={loading ? "..." : sensorData.status ?? "optimal"}
          className="border-l-4 border-l-amber-500"
        />
        <MetricCard
          title="Avg Soil Temp"
          value={loading ? "..." : sensorData.temperature ?? "-"}
          unit="°C"
          icon={Thermometer}
          trend="up"
          trendValue="0.4°C"
          status={loading ? "..." : sensorData.status ?? "optimal"}
          className="border-l-4 border-l-emerald-500"
        />
        <MetricCard
          title="Avg Air Humidity"
          value={loading ? "..." : sensorData.humidity ?? "-"}
          unit="%"
          icon={CloudRain}
          trend="neutral"
          trendValue="0%"
          status={loading ? "..." : sensorData.status ?? "optimal"}
          className="border-l-4 border-l-blue-500"
        />
        <MetricCard
          title="Light Intensity"
          value={loading ? "..." : sensorData.light ?? "-"}
          unit="lx"
          icon={Sun}
          trend="up"
          trendValue="12k"
          status={loading ? "..." : sensorData.status ?? "optimal"}
          className="border-l-4 border-l-yellow-500"
        />
      </div>

      {/* Charts + Alerts */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 h-[500px]">
        <div className="col-span-4 lg:col-span-5 h-full">
          <HistoryChart
            title="Soil Moisture Trends"
            deviceId={deviceId}
            field="moisture" // frontend name; backend mapping is handled
            color="hsl(var(--chart-1))"
            unit="%"
          />
        </div>

        <div className="col-span-3 lg:col-span-2 h-full">
          <AlertsList />
        </div>
      </div>
          <div className="grid gap-4 lg:grid-cols-2">
  <AICard text={aiText} loading={ailoading} />
  <ChatBot deviceId={deviceId} />
</div>

    </div>
  );
}