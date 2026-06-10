import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export let db: NodePgDatabase<typeof schema>;
export let pool: pg.Pool;

// Helper to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Offline Mock DB implementation
  console.log("⚠️ DATABASE_URL is not set. Running in OFFLINE MOCK MODE with in-memory database!");

  // In-memory data
  const mockSettings = {
    id: 1,
    clinicName: "QueueCare Clinic",
    doctorName: "Dr. Aisha Patel",
    specialization: "General Medicine",
    maxQueueSize: 50,
    avgConsultationMinutes: 12,
    openTime: "08:00",
    closeTime: "18:00",
    notificationsEnabled: true,
    smsEnabled: false,
    autoCallNext: false,
  };

  const mockDoctors = [
    {
      id: 1,
      name: "Dr. Aisha Patel",
      specialization: "General Medicine",
      isActive: true,
      currentPatientId: null as number | null,
    },
  ];

  const mockPatients: any[] = [];
  const mockNotifications: any[] = [];

  let nextPatientId = 1;
  let nextNotificationId = 1;

  // Mock Postgres client-like object
  const mockPool = {
    query: async (sql: string, params: any[] = []) => {
      const lowerSql = sql.toLowerCase();

      // --- SETTINGS ---
      if (lowerSql.includes('from "settings"')) {
        return { rows: [mockSettings] };
      }
      if (lowerSql.includes('insert into "settings"')) {
        return { rows: [mockSettings] };
      }
      if (lowerSql.includes('update "settings"')) {
        const setMatches = sql.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
        if (setMatches) {
          for (const match of setMatches) {
            const parts = match.split("=");
            const col = parts[0].replace(/"/g, "").trim();
            const paramIdx = parseInt(parts[1].replace(/\$/g, "").trim(), 10) - 1;
            const field = toCamelCase(col);
            if (field in mockSettings) {
              (mockSettings as any)[field] = params[paramIdx];
            }
          }
        }
        return { rows: [mockSettings] };
      }

      // --- DOCTORS ---
      if (lowerSql.includes('from "doctors"')) {
        return { rows: mockDoctors };
      }
      if (lowerSql.includes('update "doctors"')) {
        const setMatches = sql.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
        if (setMatches) {
          for (const match of setMatches) {
            const parts = match.split("=");
            const col = parts[0].replace(/"/g, "").trim();
            const paramIdx = parseInt(parts[1].replace(/\$/g, "").trim(), 10) - 1;
            const field = toCamelCase(col);
            if (field in mockDoctors[0]) {
              (mockDoctors[0] as any)[field] = params[paramIdx];
            }
          }
        }
        return { rows: mockDoctors };
      }

      // --- PATIENTS ---
      if (lowerSql.includes('from "patients"')) {
        if (lowerSql.includes('where "patients"."id" = $1') || lowerSql.includes('where "patients"."id" = $2')) {
          const idVal = params[0];
          const found = mockPatients.find((p) => p.id === idVal);
          return { rows: found ? [found] : [] };
        }
        if (lowerSql.includes('where "patients"."token_number" = $1')) {
          const tokenVal = params[0];
          const found = mockPatients.find((p) => p.tokenNumber === tokenVal);
          return { rows: found ? [found] : [] };
        }
        return { rows: mockPatients };
      }
      if (lowerSql.includes('insert into "patients"')) {
        const colsMatch = sql.match(/insert into "patients"\s*\(([^)]+)\)/i);
        const newPatient: any = { 
          id: nextPatientId++, 
          createdAt: new Date().toISOString(), 
          calledAt: null, 
          completedAt: null 
        };
        if (colsMatch) {
          const cols = colsMatch[1].split(",").map((c) => c.replace(/"/g, "").trim());
          for (let i = 0; i < cols.length; i++) {
            const field = toCamelCase(cols[i]);
            newPatient[field] = params[i];
          }
        }
        mockPatients.push(newPatient);
        return { rows: [newPatient] };
      }
      if (lowerSql.includes('update "patients"')) {
        const idMatch = sql.match(/where "patients"\."id"\s*=\s*\$(\d+)/i);
        let patientId = -1;
        if (idMatch) {
          const paramIdx = parseInt(idMatch[1], 10) - 1;
          patientId = params[paramIdx];
        }
        const patient = mockPatients.find((p) => p.id === patientId);
        if (patient) {
          const setMatches = sql.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
          if (setMatches) {
            for (const match of setMatches) {
              const parts = match.split("=");
              const col = parts[0].replace(/"/g, "").trim();
              const paramIdx = parseInt(parts[1].replace(/\$/g, "").trim(), 10) - 1;
              const field = toCamelCase(col);
              patient[field] = params[paramIdx];
            }
          }
          return { rows: [patient] };
        }
        return { rows: [] };
      }

      // --- NOTIFICATIONS ---
      if (lowerSql.includes('from "notifications"')) {
        const patientIdMatch = sql.match(/"patient_id"\s*=\s*\$(\d+)/i);
        const typeMatch = sql.match(/"type"\s*=\s*\$(\d+)/i);
        let filtered = mockNotifications;
        if (patientIdMatch) {
          const pid = params[parseInt(patientIdMatch[1], 10) - 1];
          filtered = filtered.filter(n => n.patientId === pid);
        }
        if (typeMatch) {
          const typeVal = params[parseInt(typeMatch[1], 10) - 1];
          filtered = filtered.filter(n => n.type === typeVal);
        }
        return { rows: filtered };
      }
      if (lowerSql.includes('insert into "notifications"')) {
        const colsMatch = sql.match(/insert into "notifications"\s*\(([^)]+)\)/i);
        const newNotif: any = { 
          id: nextNotificationId++, 
          createdAt: new Date().toISOString() 
        };
        if (colsMatch) {
          const cols = colsMatch[1].split(",").map((c) => c.replace(/"/g, "").trim());
          for (let i = 0; i < cols.length; i++) {
            const field = toCamelCase(cols[i]);
            newNotif[field] = params[i];
          }
        }
        mockNotifications.push(newNotif);
        return { rows: [newNotif] };
      }

      return { rows: [] };
    },
  };

  pool = mockPool as any;
  db = drizzle(pool, { schema });
}

export * from "./schema";
