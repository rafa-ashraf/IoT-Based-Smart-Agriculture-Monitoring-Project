import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSensorHistory } from "@/api/sensors";

interface Reading {
  value: number;
  timestamp: string;
}

interface HistoryChartProps {
  title: string;
  deviceId: string;
  field: "temperature" | "humidity" | "moisture" | "light"; // frontend names
  color?: string;
  unit?: string;
}

export function HistoryChart({ title, deviceId, field, color = "hsl(var(--primary))", unit }: HistoryChartProps) {
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d">("24h");
  const [data, setData] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSensorHistory(deviceId, field, range)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [deviceId, field, range]);

  return (
    <Card className="col-span-4 border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {(["24h", "7d", "30d", "90d"] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pl-0">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />

              <XAxis
                dataKey="timestamp"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => format(new Date(val), range === "24h" ? "HH:mm" : "MMM d")}
              />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}${unit || ""}`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-popover p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Time</span>
                            <div className="font-bold">{format(new Date(label), "MMM d, HH:mm")}</div>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground">Value</span>
                            <div style={{ color }}>{Number(payload[0].value).toFixed(1)}{unit}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#gradient-${title})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {loading && <div className="text-xs text-muted-foreground mt-2">Loading data...</div>}
      </CardContent>
    </Card>
  );
}
