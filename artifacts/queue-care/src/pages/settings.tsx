import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  clinicName: z.string().min(2),
  doctorName: z.string().min(2),
  maxQueueSize: z.coerce.number().min(1),
  avgConsultationMinutes: z.coerce.number().min(1),
  notificationsEnabled: z.boolean(),
  autoCallNext: z.boolean(),
});

export default function Settings() {
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      clinicName: "",
      doctorName: "",
      maxQueueSize: 50,
      avgConsultationMinutes: 15,
      notificationsEnabled: true,
      autoCallNext: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        clinicName: settings.clinicName,
        doctorName: settings.doctorName,
        maxQueueSize: settings.maxQueueSize,
        avgConsultationMinutes: settings.avgConsultationMinutes,
        notificationsEnabled: settings.notificationsEnabled,
        autoCallNext: settings.autoCallNext || false,
      });
    }
  }, [settings, form]);

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    updateSettings.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-3xl">
        <header>
          <h1 className="font-serif text-4xl tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage clinic preferences and queue rules.</p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="rounded-3xl border-border shadow-none">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Clinic Profile</CardTitle>
                <CardDescription>Basic information displayed to patients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clinicName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinic Name</FormLabel>
                        <FormControl>
                          <Input className="rounded-xl bg-muted/50 border-transparent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor Name</FormLabel>
                        <FormControl>
                          <Input className="rounded-xl bg-muted/50 border-transparent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-none">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Queue Rules</CardTitle>
                <CardDescription>Configure how the AI manages your waitlist.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxQueueSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Daily Queue Size</FormLabel>
                        <FormControl>
                          <Input type="number" className="rounded-xl bg-muted/50 border-transparent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="avgConsultationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baseline Consult Time (min)</FormLabel>
                        <FormControl>
                          <Input type="number" className="rounded-xl bg-muted/50 border-transparent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <FormField
                    control={form.control}
                    name="notificationsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">System Notifications</FormLabel>
                          <p className="text-sm text-muted-foreground">Receive alerts for critical queue delays.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoCallNext"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-call Next</FormLabel>
                          <p className="text-sm text-muted-foreground">Automatically call the next patient when completing a consult.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" className="rounded-full px-8" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
