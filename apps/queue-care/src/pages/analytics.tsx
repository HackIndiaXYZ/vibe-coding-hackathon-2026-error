import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetAnalyticsSummary, useGetHourlyAnalytics, useGetAiInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Analytics() {
  const { data: summary } = useGetAnalyticsSummary();
  const { data: hourly } = useGetHourlyAnalytics();
  const { data: aiInsights } = useGetAiInsights();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-serif text-4xl tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-2">Clinic performance and AI recommendations.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Patients Served</p>
              <p className="font-serif text-4xl mt-2">{summary?.patientsServed || 0}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg Wait Time</p>
              <p className="font-serif text-4xl mt-2">{summary?.averageWaitMinutes || 0}m</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
              <p className="font-serif text-4xl mt-2">{summary?.peakHour || "N/A"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Efficiency Score</p>
              <p className="font-serif text-4xl mt-2">{summary?.queueEfficiency || 0}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="rounded-3xl border-border shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Hourly Patient Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourly || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--sidebar-ring))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--sidebar-ring))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: 'none' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="patients" 
                      stroke="hsl(var(--sidebar-ring))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPatients)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-none bg-gradient-to-br from-[#f0f7f6] to-[#d8eeeb] border-none">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {aiInsights?.recommendations && aiInsights.recommendations.length > 0 ? (
                <ul className="space-y-4">
                  {aiInsights.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-lg leading-relaxed">
                      <span className="text-accent-foreground font-serif">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No current recommendations.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
