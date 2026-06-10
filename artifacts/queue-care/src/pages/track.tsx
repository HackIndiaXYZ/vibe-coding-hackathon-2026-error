import { useEffect } from "react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useTrackPatientByToken, getTrackPatientByTokenQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, Users } from "lucide-react";

export default function Track() {
  const params = useParams();
  const token = Number(params.token);
  const queryClient = useQueryClient();

  const { data: trackingInfo, isLoading } = useTrackPatientByToken(token, {
    query: {
      enabled: !!token,
      queryKey: getTrackPatientByTokenQueryKey(token)
    }
  });

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getTrackPatientByTokenQueryKey(token) });
    }, 5000);
    return () => clearInterval(interval);
  }, [token, queryClient]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Loading...</p></div>;
  }

  if (!trackingInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="font-serif text-3xl mb-4">Token not found</h1>
        <p className="text-muted-foreground">Please check your token number and try again.</p>
      </div>
    );
  }

  const { patient, currentServingToken, patientsAhead, estimatedWaitMinutes } = trackingInfo;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 pb-24">
      <div className="w-full max-w-md pt-12 space-y-12">
        <div className="text-center space-y-4">
          <p className="font-medium text-muted-foreground">Your Token</p>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl md:text-9xl font-serif tracking-tighter"
          >
            {patient.tokenNumber}
          </motion.div>
          <div className="flex justify-center">
             <StatusBadge status={patient.status} className="text-lg px-4 py-1" />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-border space-y-8">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Currently Serving</p>
            <p className="font-serif text-5xl">{currentServingToken || "--"}</p>
          </div>

          <div className="h-px w-full bg-border" />

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-2xl font-serif">{patientsAhead}</p>
              <p className="text-xs text-muted-foreground">People Ahead</p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-2xl font-serif">{estimatedWaitMinutes}m</p>
              <p className="text-xs text-muted-foreground">Est. Wait</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
