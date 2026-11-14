# SafeWalk – AI-Powered Fall Detection & Emergency Response System

SafeWalk is an intelligent, privacy-first computer vision system designed to detect human falls in real time and automatically notify designated emergency contacts. 

By running pose-estimation algorithms entirely on the client device, video frames never leave the browser, ensuring complete user privacy while delivering rapid, automated alerting.

---

## 🌟 Key Features

- **On-Device Computer Vision:** Real-time 33-point skeletal landmark detection powered by MediaPipe. Video frames are processed entirely in the browser and never transmitted or stored on remote servers.
- **Intelligent Fall Heuristics:** Evaluates body angle, velocity of hip descent, and posture persistence to accurately differentiate between actual falls and normal daily activities (such as sitting down or bending over).
- **Safety Cancellation Window:** Configurable countdown timer (default 10 seconds) with an immediate *"I'm Safe"* action to prevent false alarms before an alert is dispatched.
- **Automated Emergency Dispatch:** Instant notifications delivered to designated primary emergency contacts via verified transactional email (SMTP or Brevo API).
- **Interactive First-Aid Assistant:** Built-in guidance for emergency procedures, fall prevention, and home safety recommendations.
- **Auditable Event History:** Complete record of all detected events, delivery receipts, and alert statuses.

---

## 🏗️ Architecture

```
Webcam Feed ──▶ MediaPipe Pose (33 Skeletal Landmarks)
             ──▶ Custom Biomechanical Fall Detection Algorithm
             ──▶ Fall Candidate Identified ──▶ Cancellation Countdown
             ──▶ [If Uncancelled] ──▶ Secure API Dispatch ──▶ Transactional Email Alert
```

### Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, MediaPipe Tasks Vision, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT Authentication
- **Notifications:** Nodemailer (SMTP) / Brevo API

---

## 📋 System Requirements

- **Node.js:** v20.x or later (v22 LTS recommended)
- **Database:** PostgreSQL 14+
- **Hardware:** Standard webcam / front-facing camera
- **Browser:** Modern Chromium-based browser (Chrome, Edge), Firefox, or Safari (Camera access requires `localhost` or HTTPS)

---

## 🚀 Getting Started

### 1. Database Setup
Ensure PostgreSQL is running and create a database:
```sql
CREATE DATABASE safewalk;
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```
*The backend server will start on `http://localhost:4000` (Health check: `http://localhost:4000/health`).*

#### Environment Variables (`backend/.env`):
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://postgres:password@localhost:5432/safewalk`)
- `JWT_SECRET`: Secure random string for session tokens
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: (Optional) Email dispatch credentials

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
*The frontend application will start on `http://localhost:5173`.*

---

## 🧪 Testing & Simulation

The platform includes automated test suites and an interactive simulation environment:

- **Algorithm Validation:**
  ```bash
  cd frontend && npm run test:fall
  ```
  Evaluates the fall algorithm against scripted scenarios (e.g., standard walking, rapid sitting, stumbling, and sudden falls).

- **Chatbot Validation:**
  ```bash
  cd backend && npm run test:chat
  ```
  Validates emergency classification and knowledge-base information retrieval.

- **Interactive Test Lab:**
  Navigate to the `/test-lab` route inside the application to replay scripted biomechanical motions and inspect algorithmic scoring in real time without requiring physical falls.

---

## 🔒 Privacy & Security

- **Zero Video Uploads:** Live camera feeds are processed strictly in client-side memory using WebAssembly. No video, images, or raw frames are ever saved, streamed, or uploaded to any server.
- **Encrypted Credentials:** User passwords are encrypted using `bcrypt` with high salt rounds.
- **Isolated Sessions:** Authentication uses signed JSON Web Tokens (JWT) with strict expiration periods.
- **Telemetry & Location:** Location coordinates are optional and transmitted only if explicitly enabled by the user in settings.

---

## ⚠️ Disclaimer

SafeWalk is an assistive technology prototype and is **not certified as a medical diagnostic device**. It is designed to assist caregivers and family members, but cannot replace professional healthcare or emergency response services. In the event of a critical emergency, always contact local emergency dispatch (e.g., **112** in India, **911** in the US, or **999** in the UK) directly.

---

## 📄 License

This project is licensed under the MIT License.
