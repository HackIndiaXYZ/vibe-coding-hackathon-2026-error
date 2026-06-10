import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useTrackPatientByToken, getTrackPatientByTokenQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, Users, BellRing } from "lucide-react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function Track() {
  const params = useParams();
  const token = Number(params.token);
  const queryClient = useQueryClient();
  useRealtimeRefresh();

  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

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

  // Server-Sent Events for real-time notifications
  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(`/api/patients/track/${token}/events`);

    eventSource.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotification(data);
        setShowNotificationPopup(true);
        
        // Auto-dismiss after 12 seconds
        setTimeout(() => {
          setShowNotificationPopup(false);
        }, 12000);
      } catch (err) {
        console.error("Failed to parse SSE event data", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 pb-24 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md pt-12 space-y-12 z-10">
        <div className="text-center space-y-4">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Your Token</p>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xl font-serif">{patientsAhead}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Patients Ahead</p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xl font-serif">{estimatedWaitMinutes} min</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Estimated Wait</p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xl font-serif">
                {new Date(Date.now() + estimatedWaitMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Expected Call</p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time SMS Notification Overlay */}
      <AnimatePresence>
        {showNotificationPopup && notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card/95 border border-border/80 backdrop-blur-md rounded-2xl shadow-2xl p-4 z-50 cursor-default transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    SMS ALERT • NOW
                  </span>
                  <button 
                    onClick={() => setShowNotificationPopup(false)}
                    className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-full hover:bg-muted/50 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    ✕
                  </button>
                </div>
                <h4 className="font-serif font-bold text-sm text-foreground mb-1">Message Received</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed font-mono bg-muted/40 p-3 rounded-xl border border-border/40 mt-2 select-text">
                  {notification.message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
