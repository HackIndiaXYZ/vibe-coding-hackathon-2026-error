import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, doctorsTable, patientsTable } from "@workspace/db";
import {
  ListDoctorsResponse,
  GetDoctorCurrentPatientResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/doctors", async (req, res): Promise<void> => {
  const doctors = await db.select().from(doctorsTable);
  res.json(ListDoctorsResponse.parse(doctors));
});

router.get("/doctors/current-patient", async (req, res): Promise<void> => {
  const doctors = await db
    .select()
    .from(doctorsTable)
    .where(eq(doctorsTable.isActive, true))
    .limit(1);

  const doctor = doctors[0] ?? {
    id: 1,
    name: "Dr. Aisha Patel",
    specialization: "General Medicine",
    isActive: true,
    currentPatientId: null,
  };

  let currentPatient = null;
  if (doctor.currentPatientId) {
    const [p] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, doctor.currentPatientId));
    currentPatient = p ?? null;
  }

  const calledPatient = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.status, "called"))
    .orderBy(patientsTable.tokenNumber)
    .limit(1);

  const effectiveCurrent =
    currentPatient ??
    (calledPatient.length > 0 ? calledPatient[0] : null);

  const upcomingPatients = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.status, "waiting"))
    .orderBy(patientsTable.tokenNumber)
    .limit(5);

  res.json(
    GetDoctorCurrentPatientResponse.parse(serializeDates({
      doctor,
      currentPatient: effectiveCurrent ?? undefined,
      upcomingPatients,
    })),
  );
});

export default router;
