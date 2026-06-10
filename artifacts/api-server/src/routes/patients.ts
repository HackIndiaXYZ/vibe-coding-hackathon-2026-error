import { Router, type IRouter } from "express";
import { eq, ne, and } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import {
  RegisterPatientBody,
  GetPatientParams,
  GetPatientResponse,
  TrackPatientByTokenParams,
  TrackPatientByTokenResponse,
  ListPatientsResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

function computeEstimates(patients: typeof patientsTable.$inferSelect[]) {
  const AVG_MINUTES = 12;
  const waiting = patients.filter((p) => p.status === "waiting");
  return waiting.map((p, idx) => ({
    ...p,
    patientsAhead: idx,
    estimatedWaitMinutes: idx * AVG_MINUTES,
  }));
}

router.get("/patients", async (req, res): Promise<void> => {
  const patients = await db
    .select()
    .from(patientsTable)
    .orderBy(patientsTable.tokenNumber);
  const withEstimates = computeEstimates(patients);
  const patientMap = new Map(withEstimates.map((p) => [p.id, p]));
  const result = patients.map((p) => patientMap.get(p.id) ?? p);
  res.json(ListPatientsResponse.parse(serializeDates(result)));
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = RegisterPatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const allPatients = await db.select().from(patientsTable);
  const maxToken = allPatients.reduce(
    (max, p) => Math.max(max, p.tokenNumber),
    0,
  );
  const tokenNumber = maxToken + 1;

  const waitingCount = allPatients.filter((p) => p.status === "waiting").length;
  const estimatedWait = waitingCount * 12;

  const [patient] = await db
    .insert(patientsTable)
    .values({
      ...parsed.data,
      tokenNumber,
      estimatedWaitMinutes: estimatedWait,
      patientsAhead: waitingCount,
    })
    .returning();

  res.status(201).json(GetPatientResponse.parse(serializeDates(patient)));
});

router.get("/patients/track/:token", async (req, res): Promise<void> => {
  const params = TrackPatientByTokenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const patients = await db
    .select()
    .from(patientsTable)
    .orderBy(patientsTable.tokenNumber);

  const patient = patients.find((p) => p.tokenNumber === params.data.token);
  if (!patient) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  const currentServing = patients.find((p) => p.status === "in_consultation");
  const waitingBefore = patients.filter(
    (p) =>
      p.status === "waiting" && p.tokenNumber < patient.tokenNumber,
  ).length;

  const tracking = TrackPatientByTokenResponse.parse(serializeDates({
    patient: {
      ...patient,
      patientsAhead: waitingBefore,
      estimatedWaitMinutes: waitingBefore * 12,
    },
    currentServingToken: currentServing?.tokenNumber ?? null,
    patientsAhead: waitingBefore,
    estimatedWaitMinutes: waitingBefore * 12,
    queueStatus: "active",
  }));

  res.json(tracking);
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json(GetPatientResponse.parse(serializeDates(patient)));
});

export default router;
