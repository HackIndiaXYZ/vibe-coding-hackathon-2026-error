import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  useRegisterPatient, 
  useGetQueue, 
  useGetAiInsights, 
  useGetAnalyticsSummary,
  useCallNextPatient,
  getGetQueueQueryKey,
  getGetAiInsightsQueryKey,
  getGetAnalyticsSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const patientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone is required"),
  visitType: z.string().min(1, "Visit type is required"),
  symptoms: z.string().optional(),
});

export default function Reception() {
  const queryClient = useQueryClient();
  useRealtimeRefresh();
  const [generatedToken, setGeneratedToken] = useState<number | null>(null);
  
  const { data: queueData } = useGetQueue();
  const { data: analytics } = useGetAnalyticsSummary();
  const { data: aiInsights } = useGetAiInsights();
  
  const registerPatient = useRegisterPatient();
  const callNextPatient = useCallNextPatient();

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      phone: "",
      visitType: "general",
      symptoms: "",
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAiInsightsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  function onSubmit(values: z.infer<typeof patientSchema>) {
    registerPatient.mutate({ data: values }, {
      onSuccess: (data) => {
        setGeneratedToken(data.tokenNumber);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
      }
    });
  }

  const handleCallNext = () => {
    callNextPatient.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="font-serif text-4xl tracking-tight">Reception</h1>
            <p className="text-muted-foreground mt-2">Manage registrations and monitor the queue.</p>
          </div>
          <Button 
            onClick={handleCallNext} 
            disabled={callNextPatient.isPending || !queueData?.patients.some(p => p.status === 'waiting')}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Call Next Patient
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Patients Today</p>
              <p className="font-serif text-4xl mt-2">{analytics?.patientsToday || 0}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Waiting</p>
              <p className="font-serif text-4xl mt-2">{queueData?.totalWaiting || 0}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="font-serif text-4xl mt-2">{queueData?.totalCompleted || 0}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg Wait</p>
              <p className="font-serif text-4xl mt-2">{analytics?.averageWaitMinutes || 0}m</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-3xl shadow-none">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">New Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="rounded-xl bg-muted/50 border-transparent focus-visible:border-primary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 234 567 8900" className="rounded-xl bg-muted/50 border-transparent focus-visible:border-primary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visitType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visit Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-muted/50 border-transparent focus-visible:border-primary">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General Checkup</SelectItem>
                              <SelectItem value="specialist">Specialist Consult</SelectItem>
                              <SelectItem value="followup">Follow-up</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symptoms (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description..." 
                              className="rounded-xl bg-muted/50 border-transparent focus-visible:border-primary resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full rounded-full mt-4" disabled={registerPatient.isPending}>
                      {registerPatient.isPending ? "Generating..." : "Generate Token"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            {/* AI Insights */}
            <Card className="rounded-3xl shadow-none bg-gradient-to-br from-[#e5efe5] to-[#c8e0c8] border-none">
              <CardContent className="p-6">
                <h3 className="font-serif text-xl mb-4">AI Queue Insights</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm opacity-80">Queue Health</p>
                    <p className="font-medium capitalize">{aiInsights?.queueHealth || "Calculating..."}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Predicted Finish</p>
                    <p className="font-medium">{aiInsights?.predictedFinishTime || "N/A"}</p>
                  </div>
                  {aiInsights?.recommendations && aiInsights.recommendations.length > 0 && (
                    <div className="pt-2 border-t border-black/10 space-y-2">
                      <p className="text-xs font-bold tracking-wider uppercase opacity-75">AI Recommendations</p>
                      <ul className="list-disc pl-4 text-xs space-y-1">
                        {aiInsights.recommendations.map((rec, i) => (
                          <li key={i} className="leading-snug">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue List */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl shadow-none h-full">
              <CardHeader className="flex flex-row justify-between items-center border-b border-border pb-4">
                <div>
                  <CardTitle className="font-serif text-2xl">Today's Queue</CardTitle>
                  <CardDescription>Live tracking of all patients</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Current Token</p>
                  <p className="font-serif text-3xl text-accent-foreground">{queueData?.currentToken || "--"}</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {queueData?.patients.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No patients in queue</div>
                  ) : (
                    queueData?.patients.map(patient => (
                      <div key={patient.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-serif text-xl">
                            {patient.tokenNumber}
                          </div>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{patient.visitType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          {patient.estimatedWaitMinutes != null && patient.status === 'waiting' && (
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-medium">~{patient.estimatedWaitMinutes} min wait</span>
                              <span className="text-xs text-muted-foreground">
                                Call: {new Date(Date.now() + patient.estimatedWaitMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <StatusBadge status={patient.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Token Modal */}
        <Dialog open={!!generatedToken} onOpenChange={(open) => !open && setGeneratedToken(null)}>
          <DialogContent className="rounded-[2rem] sm:max-w-md text-center p-8">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl text-center">Token Generated</DialogTitle>
              <DialogDescription className="text-center">
                Please hand this to the patient or have them scan the QR code to track their status.
              </DialogDescription>
            </DialogHeader>
            <div className="py-8">
              <div className="text-8xl font-serif font-medium mb-8">
                {generatedToken}
              </div>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-border">
                  <QRCodeSVG 
                    value={`${window.location.origin}/track/${generatedToken}`}
                    size={160}
                    fgColor="#17150e"
                  />
                </div>
              </div>
            </div>
            <Button onClick={() => setGeneratedToken(null)} className="w-full rounded-full">
              Done
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
