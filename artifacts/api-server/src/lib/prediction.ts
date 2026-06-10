import { Response } from "express";
import { db, patientsTable, consultationLogsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "./logger";

export interface GlobalSseConnection {
  res: Response;
}

export const globalSseConnections: GlobalSseConnection[] = [];

// Helper to broadcast refresh to all connected screens
export function broadcastQueueRefresh() {
  logger.info({ connsCount: globalSseConnections.length }, "Broadcasting global queue refresh");
  for (const conn of globalSseConnections) {
    try {
      conn.res.write("data: refresh\n\n");
    } catch (err) {
      logger.error({ err }, "Error writing refresh event to SSE");
    }
  }
}

// Dynamically learn the average duration of a visitType
export async function getExpectedDuration(visitType: string): Promise<number> {
  const normalized = visitType.toLowerCase();
  try {
    const logs = await db.select().from(consultationLogsTable);
    const matched = logs.filter(
      (l) => l.visitType.toLowerCase() === normalized && l.actualDuration != null
    );
    if (matched.length > 0) {
      const sum = matched.reduce((acc, l) => acc + (l.actualDuration ?? 0), 0);
      return Math.round(sum / matched.length);
    }
  } catch (err) {
    logger.error({ err, visitType }, "Error getting expected duration, using fallback");
  }

  // Fallback presets
  if (normalized.includes("follow")) {
    return 5;
  }
  if (normalized.includes("emergency")) {
    return 18;
  }
  return 12; // default checkup / general / specialist
}

// Recalculates estimated wait time, call time, and queue position for every waiting patient
export async function recalculateQueue() {
  try {
    logger.info("Recalculating queue predictions...");
    // 1. Get all patients sorted by tokenNumber
    const patients = await db
      .select()
      .from(patientsTable)
      .orderBy(patientsTable.tokenNumber);

    // 2. Find if a patient is currently in consultation
    const inConsult = patients.find((p) => p.status === "in_consultation");
    
    // 3. Get all waiting patients
    const waiting = patients.filter((p) => p.status === "waiting");

    // Calculate remaining time for the patient in consultation
    let currentConsultRemaining = 0;
    if (inConsult) {
      const expectedDuration = await getExpectedDuration(inConsult.visitType);
      
      // Get actual consultation start time
      const activeLogs = await db
        .select()
        .from(consultationLogsTable)
        .where(
          and(
            eq(consultationLogsTable.patientId, inConsult.id),
            isNull(consultationLogsTable.endTime)
          )
        )
        .limit(1);

      const startTime = activeLogs.length > 0 
        ? new Date(activeLogs[0].startTime) 
        : (inConsult.calledAt ? new Date(inConsult.calledAt) : new Date());

      const elapsed = (Date.now() - startTime.getTime()) / 60000;
      currentConsultRemaining = Math.max(1, expectedDuration - elapsed);
    }

    // 4. Update wait times for each waiting patient
    let cumulativeWait = currentConsultRemaining;
    for (let i = 0; i < waiting.length; i++) {
      const patient = waiting[i];
      const waitTime = Math.round(cumulativeWait);
      
      await db
        .update(patientsTable)
        .set({
          estimatedWaitMinutes: waitTime,
          patientsAhead: i,
        })
        .where(eq(patientsTable.id, patient.id));

      const expectedDuration = await getExpectedDuration(patient.visitType);
      cumulativeWait += expectedDuration;
    }

    logger.info("Queue predictions updated in database");

    // 5. Broadcast refresh to all connected screens
    broadcastQueueRefresh();
  } catch (err) {
    logger.error({ err }, "Error in recalculateQueue");
  }
}
