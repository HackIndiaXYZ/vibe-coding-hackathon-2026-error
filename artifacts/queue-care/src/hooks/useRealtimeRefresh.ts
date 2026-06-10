import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/queue/events");

    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        console.log("🔄 Realtime refresh triggered by backend predictions");
        queryClient.invalidateQueries();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error on queue events", err);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
