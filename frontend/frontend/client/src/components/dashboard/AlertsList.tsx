import { AlertTriangle, WifiOff, Droplets, Cpu, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getActiveAlerts, Alert } from "@/api/sensors";

interface AlertsListProps {
  includeAI?: boolean;
}

export function AlertsList({ includeAI = true }: AlertsListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const activeAlerts = await getActiveAlerts();
      const combinedAlerts = [...activeAlerts];

      // Order by severity, then most recent first
      combinedAlerts.sort((a, b) => {
        const order = { critical: 0, medium: 1, low: 2 };
        if (order[a.severity] !== order[b.severity]) {
          return order[a.severity] - order[b.severity];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setAlerts(combinedAlerts);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [includeAI]);

  const getIcon = (alert: Alert) => {
    if (alert.id.startsWith("ai-")) return Cpu;
    if (alert.message.toLowerCase().includes("offline")) return WifiOff;
    if (alert.message.toLowerCase().includes("moisture")) return Droplets;
    return AlertTriangle;
  };

  const getColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium":
        return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-blue-600 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
            All systems optimal
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = getIcon(alert);
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-muted/50",
                  getColor(alert.severity)
                )}
              >
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-sm leading-none text-foreground">
                    {alert.message}
                  </p>
                  {alert.aiInsight && (
                    <p className="text-xs text-gray-700 italic">
                      AI Insight: {alert.aiInsight}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono bg-background px-1.5 py-0.5 rounded border">
                      {alert.zoneId.toUpperCase()}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(alert.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
