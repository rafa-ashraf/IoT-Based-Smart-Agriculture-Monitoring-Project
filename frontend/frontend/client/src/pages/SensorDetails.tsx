import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/dashboard/SensorMetrics";
import { HistoryChart } from "@/components/dashboard/HistoryChart";
import { ChatBot } from "@/components/dashboard/ChatBot";
import { Droplets, Thermometer, Sun, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSensorLatest, SensorData } from "@/api/sensors";

export default function SensorDetails() {
  const [match, params] = useRoute("/sensors/:id");
  const deviceId = params?.id || "";
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [loading, setLoading] = useState(true);

  const fetchLatest = async () => {
    if (!deviceId) return;
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

  useEffect(() => {
    if (!match) return;
    fetchLatest();
    const interval = setInterval(fetchLatest, 60000);
    return () => clearInterval(interval);
  }, [match, deviceId]);

  if (!match) return null;

  const status = sensorData.status || "optimal";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/sensors">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{deviceId}</h1>
              <Badge variant="outline" className="capitalize">{status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Real-time device telemetry and AI assistance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchLatest}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/assistant">
            <Button size="sm" className="gap-2">
              <Bot className="h-4 w-4" />
              Open Assistant
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-[500px]">
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Soil Moisture" value={loading ? "..." : sensorData.moisture ?? "-"} unit="%" icon={Droplets} status={status} />
            <MetricCard title="Temperature" value={loading ? "..." : sensorData.temperature ?? "-"} unit="C" icon={Thermometer} status={status} />
            <MetricCard title="Humidity" value={loading ? "..." : sensorData.humidity ?? "-"} unit="%" icon={CloudRain} status={status} />
            <MetricCard title="Light" value={loading ? "..." : sensorData.light ?? "-"} unit="lx" icon={Sun} status={status} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryChart
            title="Soil Moisture Trend"
            deviceId={deviceId}
            field="moisture"
            unit="%"
            color="hsl(var(--chart-1))"
          />
          <div className="grid md:grid-cols-2 gap-6">
            <HistoryChart title="Temperature Trend" deviceId={deviceId} field="temperature" unit="C" color="hsl(var(--chart-3))" />
            <HistoryChart title="Humidity Trend" deviceId={deviceId} field="humidity" unit="%" color="hsl(var(--chart-2))" />
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Device Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <ChatBot deviceId={deviceId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
