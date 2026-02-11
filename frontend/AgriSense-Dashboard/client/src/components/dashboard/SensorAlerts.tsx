import { AlertTriangle, WifiOff, Droplets, CheckCircle2 } from "lucide-react";
import { Alert, mockAlerts } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function AlertsList() {
  const getIcon = (alert: Alert) => {
    if (alert.message.includes("offline")) return WifiOff;
    if (alert.message.includes("moisture")) return Droplets;
    return AlertTriangle;
  };

  const getColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical": return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      case "low": return "text-blue-600 bg-blue-500/10 border-blue-500/20";
      default: return "text-muted-foreground";
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
        {mockAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
            All systems optimal
          </div>
        ) : (
          mockAlerts.map((alert) => {
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono bg-background px-1.5 py-0.5 rounded border">
                      {alert.zoneId.toUpperCase()}
                    </span>
                    <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
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
