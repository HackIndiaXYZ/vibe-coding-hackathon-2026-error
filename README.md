# QueueCare AI 🏥

> Know Your Turn. Not Just Your Token.

QueueCare AI is a production-grade clinic operating system that replaces paper token slips, manual patient calling, and uncertain waiting times with an AI-powered real-time digital queue system. 

Patients track their queue position live on their own devices, doctors manage consultations from a focused workspace, and receptionists run the clinic using an analytical dashboard.

---

## 📖 The Problem We Solve
Millions of patients spend hours waiting in clinics without knowing when they will be called. Traditional manual token-calling creates three critical pain points:

| Traditional Clinic | Why It Fails? | QueueCare AI Solution |
| :--- | :--- | :--- |
| **Paper Tokens** | Easy to lose; patient is locked to the physical waiting room. | **Dynamic Live Link**: Real-time position tracking on mobile web. |
| **Manual Calling** | Receptionists must yell names/numbers; highly disruptive and chaotic. | **SSE Live Pushes**: Real-time digital alerts on patient and waiting room screens. |
| **Blind Waiting** | Zero wait-time visibility; causes frustration and overcrowded rooms. | **AI Wait Predictor**: Dynamic estimation using visit types and doctor speed. |

---

## 🏗️ Architecture: The Patient Flow Sandwich

```
┌─────────────────────────────────────────────────────────────────┐
│  📺 Layer 3: Dashboards & Displays                              │
│      React SPA · Live SSE state · Reception, Doctor, Patients   │
└────────────────────────┬────────────────────────────────────────┘
                         │ SSE (Server-Sent Events) & HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  🧠 Layer 2: QueueCare API Core                                 │
│      Express API · SQLite / Postgres · Real-time event hooks    │
│                                                                 │
│      ┌─────────────────────────────────────────────────┐        │
│      │  Tier A: Queue Engine  (Active State Manager)   │        │
│      │  → Patient status: waiting, called, completed   │        │
│      │  → Automatic next-patient calling & notifications│       │
│      ├─────────────────────────────────────────────────┤        │
│      │  Tier B: Wait Estimator (AI Prediction Engine)   │        │
│      │  → Dynamic estimation based on visit type       │        │
│      │  → Real-time average consultation drift factor  │        │
│      └─────────────────────────────────────────────────┘        │
│      Recalculates wait times in <5ms on queue changes           │
└────────────────────────┬────────────────────────────────────────┘
                         │ Drizzle ORM
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  💾 Layer 1: Data Engine                                        │
│      PostgreSQL (Production) / In-memory Mock (Local Fallback)  │
│      → Unified schema: clinics, patients, logs, queues         │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ The Cascading Wait Prediction Engine
Wait times are not linear. QueueCare AI uses a multi-factor estimation algorithm to predict expected call times:
- **Base Duration**: Defined by the clinic's default consultation window (e.g., 15 minutes).
- **Visit Type Modifiers**: Consultations for procedures (e.g., dressings, minor surgery) scale wait time predictions upward, while simple follow-ups or report check-ins scale them downward.
- **Drift Factor**: An automated rolling average calculates the doctor's actual completion speed dynamically and offsets predictions based on real-time consultation drift.

All recalculations trigger automatically in the background when:
1. A receptionist adds a patient to the queue.
2. A doctor starts a consultation.
3. A doctor clicks **Complete Consultation** (which auto-calls the next patient).

---

## 🎯 Real-World Clinic Scenario Coverage

| Scenario / Event | Action Taken | Real-Time Impact |
| :--- | :--- | :--- |
| **New Patient Check-in** | Receptionist registers patient. | Unique token is minted, QR code is generated, and patient is added to the waiting queue. |
| **Patient Tracks Queue** | Patient opens live link. | Screen displays their token, number of patients ahead, and a dynamic progress bar. |
| **Doctor consultation starts** | Doctor clicks "Start Consultation". | Active patient status is updated to `called`; consultation timer starts. |
| **Consultation complete** | Doctor clicks "Complete". | Current patient marked `completed`. **Next waiting patient is automatically transitioned to `called` status**, updating all displays instantly. |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `18.0.0+`
- **pnpm**: `9.0.0+` (Run via `npx --package=pnpm pnpm` if not globally installed)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/HackIndiaXYZ/vibe-coding-hackathon-2026-error.git
cd vibe-coding-hackathon-2026-error
```

### Step 2 — Install Dependencies
```bash
npx pnpm install --ignore-scripts
```
> [!NOTE]
> The `--ignore-scripts` flag is recommended on Windows environments to skip UNIX-specific preinstall hooks.

### Step 3 — Run the Project
You can run both the frontend and API server concurrently in development mode:
```bash
npx pnpm run dev
```
- **Frontend SPA Dashboard**: Available at `http://localhost:5173`
- **Backend API Server**: Running at `http://localhost:5000`

---

## ⚙️ Configuration Reference
Configuration variables are managed via environment files. The defaults are pre-configured to fall back to safe development values.

### Backend Settings
| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the backend API server to bind to. |
| `NODE_ENV` | `development` | In `production`, Express serves the frontend SPA static files from `queue-care/dist/public`. |
| `DATABASE_URL` | *None* | Connection string for PostgreSQL database. Falls back to an in-memory mock DB if not provided. |

---

## 🛠️ Codebase Structure

- [artifacts/api-server](file:///D:/Clinic-Queue-Manager/artifacts/api-server) — The core backend Express API server.
  - [app.ts](file:///D:/Clinic-Queue-Manager/artifacts/api-server/src/app.ts) — Main Express app configuration, middleware, and production static hosting config.
  - [routes/queue.ts](file:///D:/Clinic-Queue-Manager/artifacts/api-server/src/routes/queue.ts) — Contains queue state transitions (calls, completions, skips) and wait recalculations.
- [artifacts/queue-care](file:///D:/Clinic-Queue-Manager/artifacts/queue-care) — The React + TypeScript frontend dashboard and display screens.
  - [src/pages/reception.tsx](file:///D:/Clinic-Queue-Manager/artifacts/queue-care/src/pages/reception.tsx) — The reception dashboard for checking in patients and managing tokens.
  - [src/pages/doctor.tsx](file:///D:/Clinic-Queue-Manager/artifacts/queue-care/src/pages/doctor.tsx) — Doctor console for consultation tracking and automatic flow progression.
- [lib/db](file:///D:/Clinic-Queue-Manager/lib/db) — Shared Drizzle database schema, migrations, and mock database pooling logic.

---

## 🗺️ Future Roadmap
- [ ] **WhatsApp & SMS Alerts**: Push wait time updates and call notifications directly to the patient's phone.
- [ ] **Multi-Doctor Scheduling**: Support clinic rooms with multiple active consultation rooms and cross-room routing.
- [ ] **Historical Analytics**: Generate charts showing peak hours, average wait time per day, and doctor consultation speed.
- [ ] **Voice Announcement Integration**: Auto-generate spoken announcements in waiting room displays ("Token 24, please proceed to Room 1").
