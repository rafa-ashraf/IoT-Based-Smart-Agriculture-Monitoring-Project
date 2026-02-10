import { useRoute, Link } from "wouter";
import { mockZones, getHistoryData } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download, Sprout } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Droplets, Thermometer, Sun, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ZoneDetails() {
  const [match, params] = useRoute("/zones/:id");
  const zone = mockZones.find((z) => z.id === params?.id);

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold">Zone not found</h2>
        <Link href="/zones">
          <Button>Return to Zones</Button>
        </Link>
      </div>
    );
  }

  // Generate fake history for this zone
  const moistureData = getHistoryData("moisture", "24h");
  const tempData = getHistoryData("temp", "24h");
  const humidityData = getHistoryData("humidity", "24h");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/zones">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{zone.name}</h1>
              <Badge variant="outline" className="text-sm font-normal">
                {zone.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Sprout className="h-4 w-4" />
              {zone.crop} • {zone.size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="history">Historical Data</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          {/* Current Readings */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Soil Moisture"
              value={zone.metrics.soilMoisture}
              unit="%"
              icon={Droplets}
              status={zone.metrics.soilMoisture < 30 ? "warning" : "optimal"}
            />
            <MetricCard
              title="Soil Temperature"
              value={zone.metrics.soilTemp}
              unit="°C"
              icon={Thermometer}
              status="optimal"
            />
            <MetricCard
              title="Air Temperature"
              value={zone.metrics.airTemp}
              unit="°C"
              icon={Thermometer}
              status="optimal"
            />
             <MetricCard
              title="Light Level"
              value={(zone.metrics.light / 1000).toFixed(1)}
              unit="k lx"
              icon={Sun}
              status="optimal"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
             <Card>
               <CardHeader>
                 <CardTitle className="text-base">Soil Conditions</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                   Detailed Soil Composition Visualizer (Mock)
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardHeader>
                 <CardTitle className="text-base">Irrigation Status</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-muted-foreground">Next Schedule</span>
                     <span className="font-medium">Today, 18:00</span>
                   </div>
                   <div className="flex justify-between items-center pb-2 border-b">
                     <span className="text-sm text-muted-foreground">Duration</span>
                     <span className="font-medium">45 mins</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-muted-foreground">Volume</span>
                     <span className="font-medium">1200 Liters</span>
                   </div>
                   <Button className="w-full mt-2" variant="secondary">Manual Override</Button>
                 </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid gap-6">
            <ChartCard 
              title="Soil Moisture Trend" 
              data={moistureData} 
              color="hsl(var(--chart-1))"
              unit="%"
            />
            <div className="grid md:grid-cols-2 gap-6">
              <ChartCard 
                title="Temperature Trend" 
                data={tempData} 
                color="hsl(var(--chart-3))"
                unit="°C"
              />
              <ChartCard 
                title="Humidity Trend" 
                data={humidityData} 
                color="hsl(var(--chart-2))"
                unit="%"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
