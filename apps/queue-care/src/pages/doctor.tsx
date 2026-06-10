import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  useGetDoctorCurrentPatient, 
  useStartConsultation, 
  useCompletePatient,
  useSkipPatient,
  getGetDoctorCurrentPatientQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Doctor() {
  const queryClient = useQueryClient();
  const { data: viewData } = useGetDoctorCurrentPatient();
  
  const startConsult = useStartConsultation();
  const completeConsult = useCompletePatient();
  const skipPatient = useSkipPatient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetDoctorCurrentPatientQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleStart = (patientId: number) => {
    startConsult.mutate({ patientId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDoctorCurrentPatientQueryKey() });
      }
    });
  };

  const handleComplete = (patientId: number) => {
    completeConsult.mutate({ patientId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDoctorCurrentPatientQueryKey() });
      }
    });
  };

  const handleSkip = (patientId: number) => {
    skipPatient.mutate({ patientId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDoctorCurrentPatientQueryKey() });
      }
    });
  };

  const current = viewData?.currentPatient;
  const upcoming = viewData?.upcomingPatients || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <header>
          <h1 className="font-serif text-4xl tracking-tight">Doctor Workspace</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {viewData?.doctor?.name || 'Doctor'}.</p>
        </header>

        <Card className="rounded-[2.5rem] border-border shadow-none overflow-hidden bg-white">
          <div className="p-8 md:p-12">
            <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Current Consultation</p>
            
            {!current ? (
              <div className="py-12 text-center">
                <p className="text-2xl font-serif text-muted-foreground">No patient currently assigned.</p>
                {upcoming.length > 0 && (
                  <Button 
                    className="mt-6 rounded-full" 
                    onClick={() => handleStart(upcoming[0].id)}
                    disabled={startConsult.isPending}
                  >
                    Start next: Token {upcoming[0].tokenNumber}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-6xl font-serif tracking-tighter text-accent-foreground">{current.tokenNumber}</span>
                      <span className="px-3 py-1 bg-muted rounded-full text-sm font-medium capitalize">{current.visitType}</span>
                    </div>
                    <h2 className="text-3xl font-medium">{current.name}</h2>
                  </div>
                </div>

                {current.symptoms && (
                  <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Symptoms</p>
                    <p className="text-lg leading-relaxed">{current.symptoms}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button 
                    className="flex-1 rounded-full py-6 text-lg" 
                    onClick={() => handleComplete(current.id)}
                    disabled={completeConsult.isPending}
                  >
                    Complete Consultation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-full py-6 text-lg bg-transparent hover:bg-muted"
                    onClick={() => handleSkip(current.id)}
                    disabled={skipPatient.isPending}
                  >
                    Skip to End
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="font-serif text-2xl px-2">Upcoming Patients</h3>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground px-2">Queue is empty.</p>
          ) : (
            upcoming.map((patient) => (
              <Card key={patient.id} className="rounded-2xl border-border shadow-none bg-white/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center font-serif text-2xl">
                      {patient.tokenNumber}
                    </div>
                    <div>
                      <p className="text-lg font-medium">{patient.name}</p>
                      <p className="text-muted-foreground capitalize">{patient.visitType}</p>
                    </div>
                  </div>
                  {!current && (
                    <Button 
                      variant="outline" 
                      className="rounded-full"
                      onClick={() => handleStart(patient.id)}
                      disabled={startConsult.isPending}
                    >
                      Start
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
