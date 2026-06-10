import { Router, type IRouter } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db, patientsTable, doctorsTable, consultationLogsTable } from "@workspace/db";
import {
  SkipPatientParams,
  CompletePatientParams,
  StartConsultationParams,
  GetQueueResponse,
  CallNextPatientResponse,
  SkipPatientResponse,
  CompletePatientResponse,
  StartConsultationResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";
import { checkAndSendNotifications } from "../lib/notifications";
import { recalculateQueue, getExpectedDuration, globalSseConnections } from "../lib/prediction";

const router: IRouter = Router();

router.get("/queue", async (req, res): Promise<void> => {
  const patients = await db
    .select()
    .from(patientsTable)
    .orderBy(patientsTable.tokenNumber);

  const waiting = patients.filter((p) => p.status === "waiting");
  const completed = patients.filter((p) => p.status === "completed");
  const inConsult = patients.find((p) => p.status === "in_consultation");

  const totalWait =
    completed.length > 0
      ? completed.reduce((sum, p) => {
          if (!p.calledAt || !p.completedAt) return sum;
          const mins =
            (new Date(p.completedAt).getTime() -
              new Date(p.calledAt).getTime()) /
            60000;
          return sum + mins;
        }, 0) / completed.length
      : 12;

  const withEstimates = patients.map((p, _idx) => {
    const waitingIdx = waiting.findIndex((w) => w.id === p.id);
    return {
      ...p,
      patientsAhead: waitingIdx >= 0 ? (p.patientsAhead ?? waitingIdx) : null,
      estimatedWaitMinutes: waitingIdx >= 0 ? (p.estimatedWaitMinutes ?? waitingIdx * 12) : null,
    };
  });

  let finishMinutes = 0;
  if (waiting.length > 0) {
    const lastPatient = waiting[waiting.length - 1];
    const expectedDuration = await getExpectedDuration(lastPatient.visitType);
    finishMinutes = (lastPatient.estimatedWaitMinutes ?? 0) + expectedDuration;
  }
  const finishTime = new Date(Date.now() + finishMinutes * 60000).toISOString();

  const queueState = GetQueueResponse.parse(serializeDates({
    patients: withEstimates,
    currentToken: inConsult?.tokenNumber ?? null,
    totalWaiting: waiting.length,
    totalCompleted: completed.length,
    averageWaitMinutes: Math.round(totalWait),
    queueStatus: "active",
    estimatedQueueFinish: waiting.length > 0 ? finishTime : null,
  }));

  res.json(queueState);
});

router.post("/queue/next", async (req, res): Promise<void> => {
  const nextPatient = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.status, "waiting"))
    .orderBy(patientsTable.tokenNumber)
    .limit(1);

  if (nextPatient.length === 0) {
    res.status(404).json({ error: "No patients in queue" });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({ status: "called", calledAt: new Date() })
    .where(eq(patientsTable.id, nextPatient[0].id))
    .returning();

  // Recalculate queue wait times
  await recalculateQueue();

  // Run in background to process notifications
  checkAndSendNotifications();

  res.json(CallNextPatientResponse.parse(serializeDates(updated)));
});

router.post("/queue/:patientId/skip", async (req, res): Promise<void> => {
  const params = SkipPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({ status: "skipped" })
    .where(eq(patientsTable.id, params.data.patientId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  // Recalculate queue wait times
  await recalculateQueue();

  // Run in background to process notifications
  checkAndSendNotifications();

  res.json(SkipPatientResponse.parse(serializeDates(updated)));
});

router.post("/queue/:patientId/complete", async (req, res): Promise<void> => {
  const params = CompletePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(patientsTable.id, params.data.patientId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  // Find and update active consultation log with end time and actual duration
  const [activeLog] = await db
    .select()
    .from(consultationLogsTable)
    .where(
      and(
        eq(consultationLogsTable.patientId, params.data.patientId),
        isNull(consultationLogsTable.endTime)
      )
    )
    .orderBy(desc(consultationLogsTable.startTime))
    .limit(1);

  if (activeLog) {
    const endTime = new Date();
    const actualDuration = Math.max(1, Math.round((endTime.getTime() - new Date(activeLog.startTime).getTime()) / 60000));
    await db
      .update(consultationLogsTable)
      .set({ endTime, actualDuration })
      .where(eq(consultationLogsTable.id, activeLog.id));
  } else {
    // Fallback: create log from calledAt or createdAt
    const startTime = updated.calledAt ? new Date(updated.calledAt) : new Date(updated.createdAt);
    const endTime = new Date();
    const actualDuration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    await db.insert(consultationLogsTable).values({
      patientId: updated.id,
      tokenNumber: updated.tokenNumber,
      doctorId: 1, // default doctor
      visitType: updated.visitType,
      startTime,
      endTime,
      actualDuration,
    });
  }

  // Automatically select the next patient
  const nextPatient = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.status, "waiting"))
    .orderBy(patientsTable.tokenNumber)
    .limit(1);

  if (nextPatient.length > 0) {
    const nextP = nextPatient[0];
    await db
      .update(patientsTable)
      .set({ status: "called", calledAt: new Date() })
      .where(eq(patientsTable.id, nextP.id));

    await db
      .update(doctorsTable)
      .set({ currentPatientId: nextP.id })
      .where(eq(doctorsTable.id, 1));
  } else {
    await db
      .update(doctorsTable)
      .set({ currentPatientId: null })
      .where(eq(doctorsTable.id, 1));
  }

  // Recalculate queue wait times
  await recalculateQueue();

  // Run in background to process notifications
  checkAndSendNotifications();

  res.json(CompletePatientResponse.parse(serializeDates(updated)));
});

router.post("/queue/:patientId/start", async (req, res): Promise<void> => {
  const params = StartConsultationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(patientsTable)
    .set({ status: "in_consultation" })
    .where(eq(patientsTable.id, params.data.patientId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const doctors = await db
    .select()
    .from(doctorsTable)
    .where(eq(doctorsTable.isActive, true))
    .limit(1);

  const doctorId = doctors.length > 0 ? doctors[0].id : 1;
  if (doctors.length > 0) {
    await db
      .update(doctorsTable)
      .set({ currentPatientId: params.data.patientId })
      .where(eq(doctorsTable.id, doctors[0].id));
  }

  // Log consultation start
  await db.insert(consultationLogsTable).values({
    patientId: updated.id,
    tokenNumber: updated.tokenNumber,
    doctorId,
    visitType: updated.visitType,
    startTime: new Date(),
  });

  // Recalculate queue wait times
  await recalculateQueue();

  res.json(StartConsultationResponse.parse(serializeDates(updated)));
});

router.get("/queue/events", async (req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const conn = { res };
  globalSseConnections.push(conn);

  // Keep connection alive with heartbeat
  res.write(":\n\n");

  req.on("close", () => {
    const idx = globalSseConnections.indexOf(conn);
    if (idx >= 0) {
      globalSseConnections.splice(idx, 1);
    }
  });
});

export default router;
