import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export let db: NodePgDatabase<typeof schema>;
export let pool: pg.Pool;

// Helpers to convert case formats
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSnakeCaseRow(obj: any) {
  if (!obj) return obj;
  const newRow: any = {};
  for (const key of Object.keys(obj)) {
    newRow[camelToSnakeCase(key)] = obj[key];
  }
  return newRow;
}

// Emulates a real pg driver query result
function getMockResult(rows: any[], command = "SELECT") {
  const snakeRows = rows.map(toSnakeCaseRow);
  const fields = snakeRows.length > 0 
    ? Object.keys(snakeRows[0]).map((name) => ({ name })) 
    : [];
  return {
    command,
    rowCount: snakeRows.length,
    oid: null,
    rows: snakeRows,
    fields,
  };
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
    query: async (sql: any, params: any[] = []) => {
      let queryText = "";
      let isArrayMode = false;
      if (typeof sql === "string") {
        queryText = sql;
      } else if (sql && typeof sql === "object" && typeof sql.text === "string") {
        queryText = sql.text;
        params = sql.values || params;
        if (sql.rowMode === "array") {
          isArrayMode = true;
        }
      }
      const lowerSql = queryText.toLowerCase();

      const executeQuery = async () => {
        // --- SETTINGS ---
        if (lowerSql.includes('from "settings"')) {
          return getMockResult([mockSettings]);
        }
        if (lowerSql.includes('insert into "settings"')) {
          return getMockResult([mockSettings], "INSERT");
        }
        if (lowerSql.includes('update "settings"')) {
          const setMatches = queryText.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
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
          return getMockResult([mockSettings], "UPDATE");
        }

        // --- DOCTORS ---
        if (lowerSql.includes('from "doctors"')) {
          return getMockResult(mockDoctors);
        }
        if (lowerSql.includes('update "doctors"')) {
          const setMatches = queryText.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
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
          return getMockResult(mockDoctors, "UPDATE");
        }

        // --- PATIENTS ---
        if (lowerSql.includes('from "patients"')) {
          if (lowerSql.includes('where "patients"."id" = $1') || lowerSql.includes('where "patients"."id" = $2')) {
            const idVal = params[0];
            const found = mockPatients.find((p) => p.id === idVal);
            return getMockResult(found ? [found] : []);
          }
          if (lowerSql.includes('where "patients"."token_number" = $1')) {
            const tokenVal = params[0];
            const found = mockPatients.find((p) => p.tokenNumber === tokenVal);
            return getMockResult(found ? [found] : []);
          }
          return getMockResult(mockPatients);
        }
        if (lowerSql.includes('insert into "patients"')) {
          const colsMatch = queryText.match(/insert into "patients"\s*\(([^)]+)\)/i);
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
          return getMockResult([newPatient], "INSERT");
        }
        if (lowerSql.includes('update "patients"')) {
          const idMatch = queryText.match(/where "patients"\."id"\s*=\s*\$(\d+)/i);
          let patientId = -1;
          if (idMatch) {
            const paramIdx = parseInt(idMatch[1], 10) - 1;
            patientId = params[paramIdx];
          }
          const patient = mockPatients.find((p) => p.id === patientId);
          if (patient) {
            const setMatches = queryText.match(/"([a-z0-9_]+)"\s*=\s*\$(\d+)/g);
            if (setMatches) {
              for (const match of setMatches) {
                const parts = match.split("=");
                const col = parts[0].replace(/"/g, "").trim();
                const paramIdx = parseInt(parts[1].replace(/\$/g, "").trim(), 10) - 1;
                const field = toCamelCase(col);
                patient[field] = params[paramIdx];
              }
            }
            return getMockResult([patient], "UPDATE");
          }
          return getMockResult([]);
        }

        // --- NOTIFICATIONS ---
        if (lowerSql.includes('from "notifications"')) {
          const patientIdMatch = queryText.match(/"patient_id"\s*=\s*\$(\d+)/i);
          const typeMatch = queryText.match(/"type"\s*=\s*\$(\d+)/i);
          let filtered = mockNotifications;
          if (patientIdMatch) {
            const pid = params[parseInt(patientIdMatch[1], 10) - 1];
            filtered = filtered.filter(n => n.patientId === pid);
          }
          if (typeMatch) {
            const typeVal = params[parseInt(typeMatch[1], 10) - 1];
            filtered = filtered.filter(n => n.type === typeVal);
          }
          return getMockResult(filtered);
        }
        if (lowerSql.includes('insert into "notifications"')) {
          const colsMatch = queryText.match(/insert into "notifications"\s*\(([^)]+)\)/i);
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
          return getMockResult([newNotif], "INSERT");
        }

        return getMockResult([]);
      };

      const res = await executeQuery();

      if (isArrayMode && res && queryText) {
        let colsText = "";
        const returningMatch = queryText.match(/returning\s+(.+)$/i);
        if (returningMatch) {
          colsText = returningMatch[1];
        } else {
          const selectMatch = queryText.match(/select\s+(.+?)\s+from/i);
          if (selectMatch) {
            colsText = selectMatch[1];
          }
        }

        if (colsText) {
          const cols = colsText.split(",").map(colStr => {
            const parts = colStr.trim().split(/\s+as\s+/i);
            const target = parts[parts.length - 1].trim();
            const match = target.match(/(?:\.|^)"?([a-zA-Z0-9_]+)"?$/);
            return match ? match[1] : target.replace(/"/g, "");
          });

          res.rows = res.rows.map((row: any) => {
            return cols.map(col => {
              return row[col] !== undefined ? row[col] : null;
            });
          });

          res.fields = cols.map(name => ({ name }));
        }
      }

      return res;
    },
  };

  pool = mockPool as any;
  db = drizzle(pool, { schema });
}

export * from "./schema";
