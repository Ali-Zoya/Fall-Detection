# SafeWalk – AI-Powered Fall Detection and Emergency Response System

SafeWalk watches a camera feed for possible falls, gives the user a countdown to cancel, and otherwise e-mails the user's primary emergency contact. It replaces the earlier "MAZT" project.

> **Not a medical device.** SafeWalk can miss falls and raise false alarms. It does not contact ambulances or emergency services (in India call **112**), it does not monitor 24/7 on its own, and it has not been clinically validated. Do not rely on it as the only safety measure.

## How it works

```
Camera ─▶ MediaPipe Pose Landmarker (in the browser, 33 landmarks)
       ─▶ custom TypeScript fall algorithm (torso angle, hip drop speed, posture persistence)
       ─▶ possible fall ─▶ countdown (default 10 s, "I'm Safe – Cancel Alert")
       ─▶ not cancelled ─▶ POST /api/falls ─▶ PostgreSQL + alert e-mail ─▶ real send status
```

* **Privacy:** video frames are analysed locally in the browser and never uploaded. The server only receives the final event (time, outcome, evidence score, optional location).
* **No fake detection:** there is no random or mock logic in the live pipeline. The *Test Lab* page feeds scripted skeletons through the same algorithm and is clearly labelled; it saves nothing and sends nothing.
* **Honest e-mail status:** an alert is `sent` when the mail server accepted it, or `failed` with the server's error. E-mail has no reliable delivery receipt, so SafeWalk never claims a message was read.

### Monitoring states
Idle → Initializing Camera → Detecting Person → Monitoring → Possible Fall Detected → Fall Confirmation Countdown → Fall Confirmed → Alert Sent (or Error). Monitoring lives in a layout-level provider, so it keeps running when you move between pages.

## Project layout

```
backend/    Node + Express + TypeScript + Prisma (PostgreSQL), Zod, JWT, bcrypt, Nodemailer / Brevo e-mail, chatbot service
frontend/   React + Vite + TypeScript + Tailwind + React Router + MediaPipe
cleanup-legacy.ps1   moves the old MAZT/Next.js files into _legacy_mazt
```

## Requirements
Node.js 20+ (22 recommended), PostgreSQL 14+, a webcam, Chrome/Edge/Firefox. E-mail settings and an AI key are optional for running locally.

## Quick start (Windows PowerShell)
```powershell
cd C:\Users\AQUIB\Downloads\falldetection
powershell -ExecutionPolicy Bypass -File .\setup-and-run.ps1
```
This does every step below for you (needs Node.js 20+ and PostgreSQL installed; it asks for your `postgres` password once).

## Manual setup (Windows PowerShell)

### 0. Clean out the old MAZT files (once)
```powershell
cd C:\Users\AQUIB\Downloads\falldetection
powershell -ExecutionPolicy Bypass -File .\cleanup-legacy.ps1
```

### 1. PostgreSQL
Create a database (using `psql` or pgAdmin):
```powershell
psql -U postgres -c "CREATE DATABASE safewalk;"
```

### 2. Backend
```powershell
cd backend
Copy-Item .env.example .env
notepad .env          # set DATABASE_URL and JWT_SECRET (see below)
npm install
npx prisma migrate dev --name init
npm run dev           # http://localhost:4000  (health check: http://localhost:4000/health)
```
Generate a JWT secret:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Frontend (second terminal)
```powershell
cd frontend
Copy-Item .env.example .env
npm install           # also copies MediaPipe WASM to public/wasm and downloads the pose model
npm run dev           # http://localhost:5173
```
If the model download is blocked, download it manually (see `frontend/public/models/README.md`):
```powershell
Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task" -OutFile "public\models\pose_landmarker_lite.task"
```
Browsers allow camera access on `http://localhost` and on HTTPS sites only.

## E-mail alert setup
Fall alerts are e-mailed to the **primary** emergency contact. Configure ONE of these in `backend/.env`, then restart the backend:

**Option A – SMTP (simplest on your own computer).** Works with any mailbox. Gmail example:
1. Turn on 2-Step Verification for the Google account, then create an *App password* at <https://myaccount.google.com/apppasswords>.
2. Set
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=the-16-character-app-password
   ```

**Option B – Brevo HTTPS API (use this when deployed).** Render's free plan blocks SMTP ports, so SMTP does not work there.
1. Create a free account at <https://www.brevo.com>, add and verify a sender address, and create an API key (SMTP & API → API keys).
2. Set `BREVO_API_KEY=...` and `EMAIL_FROM=the-verified-sender@example.com`. When both are set, Brevo is used instead of SMTP.

Then open **Settings → Send test email** in the app: it mails your own account address and reports the mail server's answer. Without any e-mail settings the app still works, but a confirmed fall is recorded with status `not_configured` and the UI says nothing was sent.

## AI chatbot setup
The floating assistant (SafeWalk Help, Emergency Guidance, Safety & Prevention) calls the backend, which calls any OpenAI-compatible provider. In `backend/.env`:
```
AI_API_KEY=...
AI_MODEL=...                       # e.g. a model name offered by your provider
AI_API_BASE_URL=https://api.openai.com/v1
```
Without these the assistant answers from the built-in knowledge base and says the AI model is not configured. Emergency wording ("not breathing", "unconscious", …) triggers a fixed *Call 112* banner independent of the AI. The chatbot gives general information only, not diagnosis or medication advice, and never receives camera frames. Its knowledge base is a short curated summary based on public WHO / NHS / Red Cross / India guidance and **should be reviewed by a qualified professional before real-world use**.

## API overview
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | service/database status |
| POST | `/api/auth/register`, `/api/auth/login` | JWT (Bearer) |
| GET/PUT | `/api/auth/me`, `/api/auth/profile` | profile and settings |
| GET/POST/PUT/DELETE | `/api/contacts` | one primary contact enforced |
| POST/GET | `/api/falls`, `/api/falls/:id`, POST `/api/falls/:id/resend` | `clientEventId` makes creation idempotent (no duplicate e-mail) |
| GET | `/api/notifications` | alert e-mail history |
| POST | `/api/notifications/test` | sends a test e-mail to your own address |
| POST | `/api/chat`, GET `/api/chat/status` | stateless, nothing stored |

## Testing
These checks run without a camera, database or mail server:
```powershell
cd frontend; npm run test:fall      # algorithm vs. scripted scenarios (walking, sitting, bending, falls, …)
cd ..\backend; npm run test:chat    # emergency detection + knowledge-base retrieval
```
Manual checks you should do yourself:
1. Register, add a contact with an e-mail address you can read, and use *Settings → Send test email*.
2. *Test Lab* → run "Sudden fall" and "Walking" scenarios.
3. *Monitoring* → Start, stand in view, then actually lower yourself to the floor safely (put a mattress down). Try pressing **I'm Safe** and also letting the countdown finish.
4. Check *Fall History* and *Alerts* for the real status; use *Resend alert* only when the earlier e-mail failed.
5. Turn the camera off / block it and confirm the error messages.

## Deployment (all free plans)
| Part | Service | Why |
|---|---|---|
| Database | **Neon** (PostgreSQL) | free plan does not expire (Render's free database is deleted after 30 days) |
| Backend | **Render** web service (`backend/render.yaml`) | free; sleeps after 15 minutes without traffic and takes about a minute to wake |
| Frontend | **Vercel** (`frontend/vercel.json`) | free static hosting over HTTPS (needed for the camera) |
| E-mail | **Brevo** API | free plan, works over HTTPS (Render blocks SMTP ports) |

1. **GitHub:** push this project to a repository (the `.gitignore` already keeps `.env`, `node_modules` and `pgsql/` out).
2. **Neon:** create a project, copy the connection string (`postgresql://...neon.tech/neondb?sslmode=require`).
3. **Brevo:** verify a sender address and create an API key (see *E-mail alert setup*).
4. **Render:** New → Blueprint → pick the repository. It reads `backend/render.yaml`. Enter `DATABASE_URL` (Neon), `BREVO_API_KEY`, `EMAIL_FROM`, and for now `FRONTEND_URL=http://localhost:5173`. The start command runs `prisma migrate deploy`, which creates the tables. Check `https://<your-service>.onrender.com/health`.
5. **Vercel:** New Project → the same repository → Root Directory `frontend` → environment variable `VITE_API_BASE_URL=https://<your-service>.onrender.com` → Deploy.
6. **Render again:** change `FRONTEND_URL` to the Vercel address (no trailing slash) so the browser is allowed to call the API, and let it redeploy.
7. Open the Vercel address, register, add a contact, and use *Settings → Send test email*.

`npm ci` on Render needs `backend/package-lock.json` to match `package.json`, so run `npm install` in `backend` and commit the lock file before deploying.

## Known limitations
* Fall detection is a heuristic on a single 2‑D camera; it can fail with poor lighting, occlusion, unusual camera angles or several people in view. The "evidence score" is not a probability.
* The browser tab must stay open with the camera on; hidden tabs are slowed down by browsers.
* Alerts are e-mails to ONE contact. They can land in spam, and nobody is notified unless that person reads e-mail promptly. `sent` does not mean read.
* On Render's free plan the backend sleeps when idle, so the first alert after a quiet period can be delayed by about a minute.
* No ambulance/emergency-service integration. No 24/7 monitoring service. No clinical validation.
* Chat answers (especially AI-generated ones) can be wrong; the first-aid knowledge base needs professional review.
* India-oriented defaults (112, +91); other countries need small changes.

## Privacy
Passwords are hashed with bcrypt. Camera video is processed in the browser only. Location is sent only if you enable it in Settings. Chat messages are not stored by SafeWalk but are sent to your configured AI provider when one is set.
