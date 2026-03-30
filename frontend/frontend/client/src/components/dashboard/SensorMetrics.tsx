import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "optimal" | "warning" | "critical";
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  status = "optimal",
  className,
}: MetricCardProps) {
  const statusColors = {
    optimal: "text-primary bg-primary/10",
    warning: "text-amber-500 bg-amber-500/10",
    critical: "text-destructive bg-destructive/10",
  };

  return (
    <Card className={cn("overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-full", statusColors[status])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight font-mono">
          {value}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </div>
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500 mr-1" />}
            {trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground mr-1" />}
            
            <span className={cn(
              trend === "up" ? "text-emerald-600" : 
              trend === "down" ? "text-rose-600" : "text-muted-foreground"
            )}>
              {trendValue}
            </span>
            <span className="text-muted-foreground ml-1">vs last hour</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
