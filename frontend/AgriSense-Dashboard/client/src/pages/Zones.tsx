import { mockZones } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Droplets, 
  Thermometer, 
  MapPin, 
  ArrowRight,
  Signal,
  SignalZero
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function Zones() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal": return "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20";
      case "warning": return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20";
      case "critical": return "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20";
      case "offline": return "bg-muted text-muted-foreground border-muted-foreground/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sensors</h1>
        <p className="text-muted-foreground mt-1">
          Monitor status and readings for individual fields and greenhouses.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mockZones.map((zone) => (
          <Card key={zone.id} className="group overflow-hidden transition-all hover:shadow-md border-muted">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {zone.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {zone.size} • {zone.crop}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={cn("capitalize", getStatusColor(zone.status))}>
                  {zone.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Droplets className="h-3 w-3" /> Moisture
                  </span>
                  <span className="text-lg font-mono font-semibold">
                    {zone.metrics.soilMoisture}%
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Thermometer className="h-3 w-3" /> Soil Temp
                  </span>
                  <span className="text-lg font-mono font-semibold">
                    {zone.metrics.soilTemp}°C
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                   {zone.status === "offline" ? (
                     <SignalZero className="h-3 w-3" />
                   ) : (
                     <Signal className="h-3 w-3 text-emerald-500" />
                   )}
                   Gateway: {zone.status === "offline" ? "Disconnected" : "Strong"}
                </span>
                <span>
                  Updated {formatDistanceToNow(new Date(zone.lastUpdated), { addSuffix: true })}
                </span>
              </div>

              <Link href={`/zones/${zone.id}`}>
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
