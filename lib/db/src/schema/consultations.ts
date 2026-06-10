import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const consultationLogsTable = pgTable("consultation_logs", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  tokenNumber: integer("token_number").notNull(),
  doctorId: integer("doctor_id").notNull(),
  visitType: text("visit_type").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  actualDuration: integer("actual_duration"), // in minutes
});

export const insertConsultationLogSchema = createInsertSchema(consultationLogsTable).omit({ id: true });
export type InsertConsultationLog = z.infer<typeof insertConsultationLogSchema>;
export type ConsultationLog = typeof consultationLogsTable.$inferSelect;
