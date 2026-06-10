import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetQueue, getGetQueueQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function WaitingRoom() {
  const queryClient = useQueryClient();
  const { data: queueData } = useGetQueue();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const upcomingPatients = queueData?.patients.filter(p => p.status === 'waiting').slice(0, 6) || [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col p-8 md:p-12">
      <header className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-4">
          <div className="h-6 w-6 rounded-full bg-accent" />
          <span className="font-serif text-3xl tracking-tight">QueueCare</span>
        </div>
        <div className="flex gap-8 text-right">
           <div>
             <p className="text-muted-foreground font-medium text-lg">Average Wait</p>
             <p className="font-serif text-3xl">{queueData?.averageWaitMinutes || 0}m</p>
           </div>
        </div>
      </header>

      <main className="flex-1 flex gap-12">
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-border shadow-sm p-12">
          <p className="text-2xl font-medium text-muted-foreground mb-8">Currently Serving</p>
          <motion.div 
            key={queueData?.currentToken}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[12rem] md:text-[16rem] leading-none font-serif tracking-tighter text-foreground"
          >
            {queueData?.currentToken || "--"}
          </motion.div>
        </div>

        <div className="w-[400px] flex flex-col bg-muted/30 rounded-[3rem] p-8 border border-border">
          <h2 className="font-serif text-3xl mb-8">Up Next</h2>
          <div className="space-y-4 flex-1">
            {upcomingPatients.length === 0 ? (
              <p className="text-muted-foreground text-lg">No one waiting.</p>
            ) : (
              upcomingPatients.map((patient, i) => (
                <motion.div 
                  key={patient.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 flex justify-between items-center shadow-sm border border-border"
                >
                  <span className="font-serif text-4xl">{patient.tokenNumber}</span>
                  <span className="text-muted-foreground text-lg">{patient.name.split(' ')[0]}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
