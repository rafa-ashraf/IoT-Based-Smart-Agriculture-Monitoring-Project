import { MetricCard } from "@/components/dashboard/SensorMetrics";
import { HistoryChart } from "@/components/dashboard/HistoryChart"; 
import { AlertsList } from "@/components/dashboard/AlertsList";
import { Droplets, Thermometer, Sun, CloudRain, ArrowRight, Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getSensorsOverview, SensorData } from "@/api/sensors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [devices, setDevices] = useState<SensorData[]>([]);
  const [focusDeviceId, setFocusDeviceId] = useState("esp32_node_01");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getSensorsOverview();
      setDevices(data);
      if (data.length) {
        const ids = data.map((d) => d.deviceId).filter(Boolean) as string[];
        if (ids.length && !ids.includes(focusDeviceId)) {
          setFocusDeviceId(ids[0]);
        }
      }
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 60000); // refresh every 60s

    return () => clearInterval(interval);
  }, []);

  const fleet = useMemo(() => {
    const safeAvg = (values: number[]) =>
      values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "-";
    const moisture = devices.map((d) => Number(d.moisture)).filter((v) => Number.isFinite(v));
    const temperature = devices.map((d) => Number(d.temperature)).filter((v) => Number.isFinite(v));
    const humidity = devices.map((d) => Number(d.humidity)).filter((v) => Number.isFinite(v));
    const light = devices.map((d) => Number(d.light)).filter((v) => Number.isFinite(v));
    const critical = devices.filter((d) => d.status === "critical").length;
    const warning = devices.filter((d) => d.status === "warning").length;

    return {
      total: devices.length,
      critical,
      warning,
      avgMoisture: safeAvg(moisture),
      avgTemperature: safeAvg(temperature),
      avgHumidity: safeAvg(humidity),
      avgLight: safeAvg(light),
    };
  }, [devices]);

  const focusId = (devices.find((d) => d.deviceId === focusDeviceId) || devices[0])?.deviceId || "esp32_node_01";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Fleet overview across all sensor devices, with drill-down to device-level insights.
          </p>
        </div>
        <Link href="/sensors">
          <Button className="gap-2">
            View Sensors <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Soil Moisture"
          value={loading ? "..." : fleet.avgMoisture}
          unit="%"
          icon={Droplets}
          status={fleet.critical > 0 ? "critical" : fleet.warning > 0 ? "warning" : "optimal"}
        />
        <MetricCard
          title="Avg Temperature"
          value={loading ? "..." : fleet.avgTemperature}
          unit="°C"
          icon={Thermometer}
          status={fleet.critical > 0 ? "critical" : fleet.warning > 0 ? "warning" : "optimal"}
        />
        <MetricCard
          title="Avg Humidity"
          value={loading ? "..." : fleet.avgHumidity}
          unit="%"
          icon={CloudRain}
          status={fleet.critical > 0 ? "critical" : fleet.warning > 0 ? "warning" : "optimal"}
        />
        <MetricCard
          title="Avg Light"
          value={loading ? "..." : fleet.avgLight}
          unit="lx"
          icon={Sun}
          status={fleet.critical > 0 ? "critical" : fleet.warning > 0 ? "warning" : "optimal"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Fleet Health</CardTitle>
            <CardDescription>
              {fleet.total} devices tracked • {fleet.critical} critical • {fleet.warning} warning
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={fleet.critical > 0 ? "destructive" : "secondary"}>
              Critical: {fleet.critical}
            </Badge>
            <Badge variant="outline">Warning: {fleet.warning}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-7 h-[500px]">
        <div className="col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Trend focus device</p>
            <select
              value={focusId}
              onChange={(e) => setFocusDeviceId(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              {(devices.length ? devices : [{ deviceId: "esp32_node_01" }]).map((d, i) => (
                <option key={d.deviceId || `d-${i}`} value={d.deviceId || "esp32_node_01"}>
                  {d.deviceId || "unknown"}
                </option>
              ))}
            </select>
          </div>
          <HistoryChart
            title="Soil Moisture Trends"
            deviceId={focusId}
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

      {/* AI CTA */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask questions about alerts, trends, and recommended actions in a dedicated chat workspace.
            </p>
            <div className="flex gap-2">
              <Link href="/assistant">
                <Button>Open Assistant</Button>
              </Link>
              <Link href={focusId ? `/sensors/${focusId}` : "/sensors"}>
                <Button variant="outline">Open Device Insights</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
