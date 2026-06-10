import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  clinicName: text("clinic_name").notNull().default("QueueCare Clinic"),
  doctorName: text("doctor_name").notNull().default("Dr. Aisha Patel"),
  specialization: text("specialization").notNull().default("General Medicine"),
  maxQueueSize: integer("max_queue_size").notNull().default(50),
  avgConsultationMinutes: integer("avg_consultation_minutes").notNull().default(12),
  openTime: text("open_time").notNull().default("08:00"),
  closeTime: text("close_time").notNull().default("18:00"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  autoCallNext: boolean("auto_call_next").notNull().default(false),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
