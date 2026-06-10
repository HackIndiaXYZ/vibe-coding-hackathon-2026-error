import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { patientsTable } from "./patients";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "called" | "approaching"
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
