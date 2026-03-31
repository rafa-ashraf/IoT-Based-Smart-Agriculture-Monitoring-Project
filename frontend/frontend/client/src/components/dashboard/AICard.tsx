import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AICard({ text, loading }: { text: string; loading: boolean }) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>AI Insights 🌱</CardTitle>
      </CardHeader>
      <CardContent>
        {loading? (
          <p className="text-sm text-muted-foreground">Analyzing data...</p>
        ) : (
          <p className="text-sm whitespace-pre-line">{text}</p>
        )
      }
      </CardContent>
    </Card>
  );
}