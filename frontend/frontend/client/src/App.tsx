import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/layout/AppShell";
import Home from "@/pages/Home";
import Sensors from "@/pages/Sensors";
import SensorDetails from "@/pages/SensorDetails";
import Assistant from "@/pages/Assistant";
import Zones from "@/pages/Zones";
import ZoneDetails from "@/pages/ZoneDetails";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sensors" component={Sensors} />
        <Route path="/sensors/:id" component={SensorDetails} />
        <Route path="/assistant" component={Assistant} />
        <Route path="/zones" component={Zones} />
        <Route path="/zones/:id" component={ZoneDetails} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
