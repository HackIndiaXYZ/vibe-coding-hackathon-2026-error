import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable, settingsTable, consultationLogsTable } from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetHourlyAnalyticsResponse,
  GetAiInsightsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/summary", async (req, res): Promise<void> => {
  const patients = await db.select().from(patientsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPatients = patients.filter(
    (p) => new Date(p.createdAt) >= today,
  );
  const completed = patients.filter((p) => p.status === "completed");
  const waiting = patients.filter((p) => p.status === "waiting");

  let avgWait = 12;
  let avgConsult = 12;
  if (completed.length > 0) {
    const consultTimes = completed
      .filter((p) => p.calledAt && p.completedAt)
      .map(
        (p) =>
          (new Date(p.completedAt!).getTime() -
            new Date(p.calledAt!).getTime()) /
          60000,
      );
    if (consultTimes.length > 0) {
      avgConsult =
        consultTimes.reduce((a, b) => a + b, 0) / consultTimes.length;
    }
  }

  const hourCounts: Record<number, number> = {};
  todayPatients.forEach((p) => {
    const h = new Date(p.createdAt).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  });
  const peakHourNum = Object.entries(hourCounts).sort(
    ([, a], [, b]) => b - a,
  )[0]?.[0];
  const peakHour = peakHourNum
    ? `${peakHourNum}:00`
    : "10:00";

  const efficiency =
    patients.length > 0
      ? Math.round(
          (completed.length / Math.max(1, patients.length)) * 100,
        )
      : 85;

  res.json(
    GetAnalyticsSummaryResponse.parse({
      patientsToday: todayPatients.length,
      patientsServed: completed.length,
      averageWaitMinutes: Math.round(avgWait),
      averageConsultationMinutes: Math.round(avgConsult),
      peakHour,
      queueEfficiency: efficiency,
      totalWaiting: waiting.length,
    }),
  );
});

router.get("/analytics/hourly", async (req, res): Promise<void> => {
  const patients = await db.select().from(patientsTable);

  const hourly: Record<string, { count: number; waits: number[] }> = {};

  for (let h = 8; h <= 17; h++) {
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourly[key] = { count: 0, waits: [] };
  }

  patients.forEach((p) => {
    const h = new Date(p.createdAt).getHours();
    if (h >= 8 && h <= 17) {
      const key = `${h.toString().padStart(2, "0")}:00`;
      if (hourly[key]) {
        hourly[key].count += 1;
        if (p.estimatedWaitMinutes) {
          hourly[key].waits.push(p.estimatedWaitMinutes);
        }
      }
    }
  });

  const result = Object.entries(hourly).map(([hour, data]) => ({
    hour,
    patients: data.count,
    avgWait:
      data.waits.length > 0
        ? Math.round(
            data.waits.reduce((a, b) => a + b, 0) / data.waits.length,
          )
        : 0,
  }));

  res.json(GetHourlyAnalyticsResponse.parse(result));
});

router.get("/analytics/ai-insights", async (req, res): Promise<void> => {
  const patients = await db.select().from(patientsTable);
  const [settings] = await db.select().from(settingsTable).limit(1);
  const clinicAvg = settings?.avgConsultationMinutes ?? 12;

  const waitingPatients = patients.filter((p) => p.status === "waiting");
  const waitingCount = waitingPatients.length;
  const completed = patients.filter((p) => p.status === "completed");

  // Calculate average wait time of all waiting patients
  let avgWait = 0;
  if (waitingCount > 0) {
    const sumWait = waitingPatients.reduce((sum, p) => sum + (p.estimatedWaitMinutes ?? 0), 0);
    avgWait = sumWait / waitingCount;
  }

  // Calculate average consultation time today
  let avgConsult = clinicAvg;
  if (completed.length > 0) {
    const completedToday = completed.filter(
      (p) => p.calledAt && p.completedAt && new Date(p.completedAt).toDateString() === new Date().toDateString()
    );
    if (completedToday.length > 0) {
      const sumConsult = completedToday.reduce(
        (sum, p) =>
          sum +
          (new Date(p.completedAt!).getTime() - new Date(p.calledAt!).getTime()) /
            60000,
        0
      );
      avgConsult = sumConsult / completedToday.length;
    }
  }

  // Queue Health Score:
  // 0-15 min: healthy
  // 15-30 min: busy
  // 30+ min: overloaded
  let queueHealth: "healthy" | "busy" | "overloaded" = "healthy";
  if (avgWait > 30) {
    queueHealth = "overloaded";
  } else if (avgWait > 15) {
    queueHealth = "busy";
  }

  // Calculate dynamic finish time
  let finishMins = 0;
  if (waitingPatients.length > 0) {
    // Get expected duration for each waiting patient
    for (const patient of waitingPatients) {
      const norm = patient.visitType.toLowerCase();
      let expected = 12;
      if (norm.includes("follow")) expected = 5;
      else if (norm.includes("emergency")) expected = 18;
      finishMins += expected;
    }
    // Also add remaining time of the patient currently in consultation if any
    const inConsult = patients.find((p) => p.status === "in_consultation");
    if (inConsult) {
      const norm = inConsult.visitType.toLowerCase();
      let expected = 12;
      if (norm.includes("follow")) expected = 5;
      else if (norm.includes("emergency")) expected = 18;
      const elapsed = inConsult.calledAt ? (Date.now() - new Date(inConsult.calledAt).getTime()) / 60000 : 0;
      finishMins += Math.max(1, expected - elapsed);
    }
  }

  const finishTime = new Date(Date.now() + finishMins * 60000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Dynamic AI Insights / Recommendations
  const recommendations: string[] = [];
  
  // 1. Average consultation time percentage difference
  const diffPct = Math.round(((avgConsult - clinicAvg) / clinicAvg) * 100);
  if (diffPct > 0) {
    recommendations.push(`Average consultation time increased by ${diffPct}% today.`);
  } else if (diffPct < 0) {
    recommendations.push(`Average consultation time decreased by ${Math.abs(diffPct)}% today.`);
  } else {
    recommendations.push(`Average consultation time is stable at clinic average (${clinicAvg} min).`);
  }

  // 2. Queue expected finish time insight
  if (waitingCount > 0) {
    recommendations.push(`Queue expected to finish at ${finishTime}.`);
  } else {
    recommendations.push("No patients waiting. Queue is clear.");
  }

  // 3. Current wait times above clinic average
  if (avgWait > clinicAvg) {
    recommendations.push("Current wait times are above clinic average.");
  } else if (waitingCount > 0) {
    recommendations.push("Current wait times are within clinic limits.");
  }

  const load = Math.min(100, Math.round((waitingCount / 20) * 100));

  res.json(
    GetAiInsightsResponse.parse({
      queueHealth,
      predictedFinishTime: finishTime,
      avgConsultationMinutes: Math.round(avgConsult),
      recommendations,
      currentLoad: load,
    }),
  );
});

export default router;
