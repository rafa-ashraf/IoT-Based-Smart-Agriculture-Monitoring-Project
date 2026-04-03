import { useEffect, useState } from "react";
import { Bot, MessageSquare, Sparkles, Thermometer, Droplets, AlertTriangle } from "lucide-react";
import { ChatBot } from "@/components/dashboard/ChatBot";
import { getSensorsOverview } from "@/api/sensors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Assistant() {
  const [deviceId, setDeviceId] = useState("esp32_node_01");
  const [deviceIds, setDeviceIds] = useState<string[]>([]);

  useEffect(() => {
    getSensorsOverview()
      .then((rows) => {
        const ids = rows.map((r) => r.deviceId).filter(Boolean) as string[];
        if (ids.length) {
          setDeviceIds(ids);
          setDeviceId((prev) => (ids.includes(prev) ? prev : ids[0]));
        }
      })
      .catch(() => setDeviceIds([]));
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              AI Assistant
            </h1>
            <p className="text-muted-foreground mt-1">
              Sensor-aware assistant for decisions, troubleshooting, and irrigation guidance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Live AI
            </Badge>
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              Device Context
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assistant Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Active Device</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {(deviceIds.length ? deviceIds : [deviceId]).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Thermometer className="h-4 w-4 mt-0.5" />
                Ask about heat stress, cold risk, and temperature trends.
              </p>
              <p className="flex items-start gap-2">
                <Droplets className="h-4 w-4 mt-0.5" />
                Ask for irrigation timing based on moisture behavior.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                Ask why alerts triggered and what to do first.
              </p>
            </div>
          </CardContent>
        </Card>

        <ChatBot deviceId={deviceId} className="min-h-[620px]" />
      </div>
    </div>
  );
}
