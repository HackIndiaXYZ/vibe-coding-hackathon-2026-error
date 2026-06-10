import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
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

  const waiting = patients.filter((p) => p.status === "waiting").length;
  const completed = patients.filter((p) => p.status === "completed");
  const inConsult = patients.filter(
    (p) => p.status === "in_consultation",
  ).length;

  const avgConsult =
    completed.length > 0
      ? completed
          .filter((p) => p.calledAt && p.completedAt)
          .reduce(
            (sum, p) =>
              sum +
              (new Date(p.completedAt!).getTime() -
                new Date(p.calledAt!).getTime()) /
                60000,
            0,
          ) / Math.max(completed.length, 1)
      : 12;

  const load = Math.min(100, Math.round((waiting / 20) * 100));

  let queueHealth: "excellent" | "good" | "moderate" | "critical" =
    "excellent";
  if (waiting > 15) queueHealth = "critical";
  else if (waiting > 10) queueHealth = "moderate";
  else if (waiting > 5) queueHealth = "good";

  const finishMins = waiting * Math.round(avgConsult);
  const finishTime = new Date(
    Date.now() + finishMins * 60000,
  ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const recommendations: string[] = [];
  if (waiting > 10)
    recommendations.push("Consider opening a second consultation room");
  if (avgConsult > 15)
    recommendations.push("Average consultation time is above target — review workflow");
  if (waiting < 3)
    recommendations.push("Queue is light — ideal time for administrative tasks");
  if (recommendations.length === 0)
    recommendations.push("Queue flow is optimal. Maintain current pace.");

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
