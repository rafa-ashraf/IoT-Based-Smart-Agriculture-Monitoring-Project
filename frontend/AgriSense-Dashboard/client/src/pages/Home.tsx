import { MetricCard } from "@/components/dashboard/SensorMetrics";
import { ChartCard } from "@/components/dashboard/HistoryChart";
import { AlertsList } from "@/components/dashboard/SensorAlerts";
import { 
  Droplets, 
  Thermometer, 
  Sun, 
  CloudRain,
  ArrowRight
} from "lucide-react";
import { getHistoryData } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const moistureData = getHistoryData("moisture", "24h");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of farm environmental conditions and active alerts.
          </p>
        </div>
        <Link href="/zones">
          <Button className="gap-2 shadow-sm">
            View All Zones
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Soil Moisture"
          value="38"
          unit="%"
          icon={Droplets}
          trend="down"
          trendValue="2.1%"
          status="warning"
          className="border-l-4 border-l-amber-500"
        />
        <MetricCard
          title="Avg Soil Temp"
          value="18.2"
          unit="°C"
          icon={Thermometer}
          trend="up"
          trendValue="0.4°C"
          status="optimal"
          className="border-l-4 border-l-emerald-500"
        />
        <MetricCard
          title="Avg Air Humidity"
          value="45"
          unit="%"
          icon={CloudRain}
          trend="neutral"
          trendValue="0%"
          status="optimal"
          className="border-l-4 border-l-blue-500"
        />
        <MetricCard
          title="Light Intensity"
          value="42k"
          unit=" lx"
          icon={Sun}
          trend="up"
          trendValue="12k"
          status="optimal"
          className="border-l-4 border-l-yellow-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 h-[500px]">
        {/* Chart Section */}
        <div className="col-span-4 lg:col-span-5 h-full">
          <ChartCard 
            title="Soil Moisture Trends (Global)" 
            data={moistureData} 
            color="hsl(var(--chart-1))"
            unit="%"
          />
        </div>

        {/* Alerts Section */}
        <div className="col-span-3 lg:col-span-2 h-full">
          <AlertsList />
        </div>
      </div>
    </div>
  );
}
