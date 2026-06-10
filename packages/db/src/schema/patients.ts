import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  tokenNumber: integer("token_number").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  visitType: text("visit_type").notNull(),
  symptoms: text("symptoms"),
  status: text("status").notNull().default("waiting"),
  estimatedWaitMinutes: integer("estimated_wait_minutes"),
  patientsAhead: integer("patients_ahead"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  calledAt: timestamp("called_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({
  id: true,
  createdAt: true,
  calledAt: true,
  completedAt: true,
});
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
