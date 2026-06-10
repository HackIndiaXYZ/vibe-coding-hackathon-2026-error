import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, patientsTable, doctorsTable } from "@workspace/db";
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
      patientsAhead: waitingIdx >= 0 ? waitingIdx : null,
      estimatedWaitMinutes: waitingIdx >= 0 ? waitingIdx * 12 : null,
    };
  });

  const finishMinutes = waiting.length * 12;
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

  await db
    .update(doctorsTable)
    .set({ currentPatientId: null })
    .where(eq(doctorsTable.currentPatientId, params.data.patientId));

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

  if (doctors.length > 0) {
    await db
      .update(doctorsTable)
      .set({ currentPatientId: params.data.patientId })
      .where(eq(doctorsTable.id, doctors[0].id));
  }

  res.json(StartConsultationResponse.parse(serializeDates(updated)));
});

export default router;
