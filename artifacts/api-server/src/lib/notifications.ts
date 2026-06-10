import { Response } from "express";
import { db, patientsTable, settingsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

export interface SseConnection {
  patientId: number;
  res: Response;
}

export const sseConnections: SseConnection[] = [];

// Helper to broadcast notification to a specific patient if they are connected
export function broadcastNotification(patientId: number, type: "called" | "approaching", message: string) {
  const conns = sseConnections.filter((c) => c.patientId === patientId);
  logger.info({ patientId, connsCount: conns.length, type }, "Broadcasting notification to SSE clients");
  for (const conn of conns) {
    try {
      conn.res.write(`event: notification\ndata: ${JSON.stringify({ type, message })}\n\n`);
    } catch (err) {
      logger.error({ err, patientId }, "Error writing to SSE stream");
    }
  }
}

// Main check function called on any queue updates
export async function checkAndSendNotifications() {
  try {
    // 1. Get current settings
    const [settings] = await db.select().from(settingsTable).limit(1);
    const clinicName = settings?.clinicName ?? "QueueCare Clinic";
    const doctorName = settings?.doctorName ?? "Dr. Aisha Patel";
    const avgConsultMins = settings?.avgConsultationMinutes ?? 12;

    // 2. Fetch all patients who are not completed/skipped
    const patients = await db
      .select()
      .from(patientsTable)
      .orderBy(patientsTable.tokenNumber);

    const waiting = patients.filter((p) => p.status === "waiting");
    const called = patients.filter((p) => p.status === "called");

    // 3. Check Called Patient
    for (const patient of called) {
      // Check if we already logged a "called" notification for this patient
      const existing = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.patientId, patient.id),
            eq(notificationsTable.type, "called")
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // Generate message
        const message = `🏥 ${clinicName}\n\nHello ${patient.name},\n\nYour token #${patient.tokenNumber} is now being called.\n\nPlease proceed to the consultation room.\n\nDoctor: ${doctorName}\n\nEstimated consultation start: Now\n\nThank you.`;

        // Log to database
        await db.insert(notificationsTable).values({
          patientId: patient.id,
          type: "called",
          phone: patient.phone,
          message,
        });

        logger.info({ patientId: patient.id, phone: patient.phone }, "Logged 'called' notification in DB");

        // Broadcast to SSE clients
        broadcastNotification(patient.id, "called", message);
      }
    }

    // 4. Check Waiting Patients who have exactly 2 patients ahead
    for (const patient of waiting) {
      // Find the index of this patient in the waiting queue
      const waitingIdx = waiting.findIndex((w) => w.id === patient.id);
      
      // If exactly 2 people are ahead of them (i.e. waitingIdx === 2)
      if (waitingIdx === 2) {
        // Check if we already logged an "approaching" notification for this patient
        const existing = await db
          .select()
          .from(notificationsTable)
          .where(
            and(
              eq(notificationsTable.patientId, patient.id),
              eq(notificationsTable.type, "approaching")
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Calculate estimated start time
          const waitMins = 2 * avgConsultMins;
          const estStart = new Date(Date.now() + waitMins * 60000);
          const estTimeStr = estStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // Generate message
          const message = `🏥 ${clinicName}\n\nHello ${patient.name},\n\nOnly 2 patients are ahead of you.\n\nToken #${patient.tokenNumber}\n\nEstimated consultation start:\n${estTimeStr}\n\nPlease be ready.`;

          // Log to database
          await db.insert(notificationsTable).values({
            patientId: patient.id,
            type: "approaching",
            phone: patient.phone,
            message,
          });

          logger.info({ patientId: patient.id, phone: patient.phone }, "Logged 'approaching' notification in DB");

          // Broadcast to SSE clients
          broadcastNotification(patient.id, "approaching", message);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error running checkAndSendNotifications");
  }
}
