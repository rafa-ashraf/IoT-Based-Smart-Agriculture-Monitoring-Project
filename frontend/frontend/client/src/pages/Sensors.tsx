import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Droplets, Thermometer, ArrowRight, Signal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSensorsOverview, SensorData } from "@/api/sensors";

export default function Sensors() {
  const [devices, setDevices] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await getSensorsOverview();
      setDevices(data);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "optimal":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/20";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sensors</h1>
        <p className="text-muted-foreground mt-1">
          Live backend-powered overview of all connected devices.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading sensors...</div>
      ) : devices.length === 0 ? (
        <div className="text-sm text-muted-foreground">No sensor devices found.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device, idx) => (
            <Card key={device.deviceId || `sensor-${idx}`} className="group overflow-hidden transition-all hover:shadow-md border-muted">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{device.deviceId || "Unknown Device"}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Signal className="h-3 w-3 text-emerald-500" />
                      Live telemetry node
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", getStatusColor(device.status))}>
                    {device.status || "unknown"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Droplets className="h-3 w-3" /> Moisture
                    </span>
                    <span className="text-lg font-mono font-semibold">{device.moisture ?? "-"}%</span>
                  </div>
                  <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Thermometer className="h-3 w-3" /> Temperature
                    </span>
                    <span className="text-lg font-mono font-semibold">{device.temperature ?? "-"}C</span>
                  </div>
                </div>

                <Link href={`/sensors/${encodeURIComponent(device.deviceId || "")}`}>
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                    View Sensor Details
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
