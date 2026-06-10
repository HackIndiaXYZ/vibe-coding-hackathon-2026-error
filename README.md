# QueueCare AI 🏥

> Know Your Turn. Not Just Your Token.

QueueCare AI is an AI-powered clinic queue management platform that replaces paper token slips, manual patient calling, and uncertain waiting times with a real-time digital queue system.

Patients can track their position live, doctors can focus on consultations, and receptionists can manage the entire queue from a single dashboard.

---

# Problem Statement

Millions of patients spend hours waiting in clinics without knowing when they will be called.

Most clinics still rely on:

- Paper token slips
- Receptionists shouting token numbers
- Manual queue management
- No wait-time visibility
- No patient notifications

This creates:

- Long waiting times
- Frustrated patients
- Crowded waiting rooms
- Increased receptionist workload

QueueCare AI solves this with real-time queue management and intelligent wait-time prediction.

---

# Solution

QueueCare AI is a smart clinic operating system that:

- Generates digital tokens
- Predicts waiting times
- Tracks queue progress in real time
- Automatically notifies patients
- Provides dashboards for doctors and receptionists
- Displays queue status on patient devices and waiting room screens

---

# Key Features

## Reception Dashboard

Receptionists can:

- Add patients
- Generate tokens
- View live queue
- Call next patient
- Skip patients
- Recall patients
- Monitor queue health

### Dashboard Metrics

- Total Patients Today
- Patients Waiting
- Patients Completed
- Average Wait Time
- Queue Health Score

---

## Doctor Dashboard

Doctors can:

- View current patient
- Start consultation
- Complete consultation
- View upcoming patients
- Track consultation duration

When a consultation is completed, the system automatically updates the queue and recalculates predictions.

---

## Patient Queue Tracking

Each patient receives:

- Unique tracking link
- QR code access

Patients can view:

- Current serving token
- Their token number
- Patients ahead
- Estimated wait time
- Expected call time

All information updates in real time.

---

## Waiting Room Display

A large-screen display for clinics showing:

- Current token being served
- Upcoming tokens
- Average waiting time
- Queue status

Automatically updates without refresh.

---

## AI Wait-Time Prediction

QueueCare AI continuously learns from:

- Consultation durations
- Queue length
- Visit types
- Historical patient flow

Predictions include:

- Estimated Wait Time
- Expected Call Time
- Queue Completion Time

Example:

Token #25

Expected Call:
11:42 AM

Estimated Wait:
18 Minutes

---

## Real-Time Notifications

Patients automatically receive updates when:

### Token Generated

Your token #25 has been generated.

### Turn Approaching

Only 2 patients remain before your turn.

### Patient Called

Your token #25 is now being called.

Please proceed to the consultation room.

### Final Call

Please proceed immediately or your token may be skipped.

---

# Workflow

## Receptionist Flow

Register Patient

↓

Generate Token

↓

Patient Receives Tracking Link

↓

Patient Added To Queue

↓

Call Next Patient

↓

Patient Notified

---

## Doctor Flow

View Current Patient

↓

Start Consultation

↓

Consultation Timer Starts

↓

Complete Consultation

↓

Consultation Duration Saved

↓

AI Recalculates Queue

↓

Next Patient Automatically Called

---

## Patient Flow

Receive Token

↓

Track Queue

↓

View Live Position

↓

Receive Call Notification

↓

Attend Consultation

---

# Automated Backend Actions

When a doctor clicks **Complete Consultation**:

1. Consultation duration is recorded
2. Patient status changes to Completed
3. AI prediction engine updates
4. Queue recalculates
5. Next patient is selected
6. Notification is sent
7. Waiting room display updates
8. Patient tracking pages update
9. Dashboard metrics refresh
10. Analytics are updated

No manual intervention required.

---

# Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS

## Backend

- Supabase

## Database

- PostgreSQL

## Authentication

- Phone Number OTP

## Realtime

- Supabase Realtime

## AI Layer

- Wait-Time Prediction Engine
- Queue Health Analysis
- Queue Optimization Logic

---

# Database Schema

## Clinics

- clinic_id
- clinic_name
- doctor_name
- specialization
- phone_number
- consultation_duration

## Patients

- patient_id
- patient_name
- phone_number
- visit_type
- status

## Tokens

- token_number
- patient_id
- queue_position
- estimated_wait
- expected_call_time

## Consultations

- consultation_id
- patient_id
- doctor_id
- start_time
- end_time
- duration

## Notifications

- notification_id
- patient_id
- notification_type
- sent_at

---

# Future Roadmap

- WhatsApp Integration
- Appointment Booking
- Multi-Doctor Clinics
- Voice Calling System
- Electronic Health Records (EHR)
- AI Queue Optimization
- Multi-Branch Management

---

# Impact

QueueCare AI helps clinics:

- Reduce patient uncertainty
- Improve waiting room experience
- Lower receptionist workload
- Increase operational efficiency
- Deliver predictable patient flow

The result is a smarter, faster, and more transparent healthcare experience for everyone.

---

# Tagline

**Know Your Turn. Not Just Your Token.**
