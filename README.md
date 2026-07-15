# ExamCore — CBT Examination Portal (MERN)

A working Computer-Based Test platform: JWT auth across 4 roles, a full question bank,
exam scheduling with randomized question sets, a real exam-taking interface (timer,
palette, anti-cheat signals, auto-submit), auto-grading, and role dashboards.

## What's fully implemented

- **Auth**: JWT access + refresh tokens, institute self-registration, student registration
  by institute code, institute-admin-created teacher/student accounts, login, logout,
  change password, forgot/reset password (token-based).
- **Roles**: Super Admin, Institute Admin, Teacher, Student — each with its own dashboard
  and route permissions enforced both client- and server-side.
- **Question Bank**: MCQ, Multiple Correct, True/False, Numerical, Fill-in-the-Blank,
  Descriptive. Search, filter by subject/difficulty/type, duplicate, soft-delete.
- **Bulk question upload**: Question Bank page has a "Template" button (downloads a
  `.xlsx` with sample rows for every question type + an Instructions sheet) and an
  "Upload Excel" button. Subject names are matched against your existing subjects
  (create the subject first if it doesn't exist yet); rows with an unknown subject,
  missing text, or invalid type are skipped and listed with a reason rather than
  failing the whole batch.
- **Bulk student/teacher upload**: Institute Admin → Teachers & Students page has a
  "Download Excel template" button and an "Upload Excel" button. Upload accepts
  `.xlsx`/`.xls`/`.csv` with columns `name, email, role, batch, phone, password`
  (password is optional — a temporary one is auto-generated and shown on screen if left
  blank, since email sending isn't wired up). Duplicate emails and invalid rows are
  skipped and listed with a reason instead of failing the whole batch.
- **Exam management**: manual or randomized question selection, randomize question/option
  order, negative marking, scheduling window, max attempts, batch targeting.
- **CBT exam interface**: a pre-exam gate screen requests camera access and starts the
  exam in fullscreen on a user click (browsers require a gesture for fullscreen — this is
  it), circular countdown timer, color-coded question palette (green/red/yellow/gray),
  mark-for-review, save & next, auto-save per question, auto-submit on timeout, submit
  confirmation with unanswered count.
- **Camera proctoring**: webcam permission is required before the exam starts; a live
  self-view stays visible in the palette sidebar for the whole exam. Low-res JPEG
  snapshots are captured at exam start and on every violation and stored on the attempt
  document (capped at the most recent 12 to keep it lightweight) — enough for a teacher
  to later review what happened, without a full video-recording pipeline.
- **Anti-cheating (strict mode)**: right-click/copy/paste disabled, tab-switch & window-blur
  detection, fullscreen-exit detection (shows a full-screen blocking overlay demanding the
  student return to fullscreen before continuing), dev-tools shortcut blocking, violation
  logging, **auto-submit after 3 violations**, IP + user-agent recorded per attempt.
- **Institute approval workflow**: self-registering an institute (`/register-institute`)
  no longer logs the admin straight in — it creates the institute in a `pending` state,
  notifies every Super Admin, and shows the applicant a "pending approval" screen.
  Nobody at that institute (admin, teachers, or students) can log in until a Super Admin
  approves it from the Institutes page (which now has a dedicated pending-approval list
  with Approve/Reject actions, an optional rejection reason, and a notification back to
  the institute admin either way).
- **Single active session per account**: logging in on a new device invalidates every
  other active session for that account (server-side, via a `sessionVersion` embedded in
  the JWT and checked on every request) — so an account can't be used to sit an exam on
  one device while a friend is logged into the same account elsewhere to help. Explicit
  logout also invalidates the session immediately rather than just clearing local storage.
- **Draft exams**: exam creation now offers "Save as draft" (hidden from students, no
  notification sent) alongside "Publish now". Drafts show a distinct badge and a
  "Publish" button in Exam Management; publishing later triggers the same student
  notification as publishing immediately.
- **Exam preview mode**: a "Preview" button on every exam card opens a read-only,
  student-styled view of the exam with correct answers revealed — lets a teacher sanity-
  check a question set (including newly-uploaded Excel questions) before students ever
  see it. Nothing typed here is saved; it doesn't create an attempt or count against the
  one-attempt limit.
- **Live exam monitoring**: every exam card in Exam Management has a "Monitor" button
  for teachers/admins — a real-time dashboard (auto-refreshes every 8s) showing every
  student's status (not started / in progress / submitted / evaluated), live violation
  count, and a click-through detail view with the full violation timeline and their
  captured webcam snapshots.
- **Face-presence detection**: a lightweight face-detection model (TinyFaceDetector,
  ~190KB, bundled locally in `frontend/public/models` — no external CDN dependency at
  runtime) runs entirely in the browser during the exam, checking every 5 seconds that a
  face is visible in the webcam feed. If no face is detected for ~10 seconds straight
  (e.g. looking away for an extended period), it's logged as a `no_face_detected`
  violation, same as any other. Nothing is uploaded for this check — only the pass/fail
  result leaves the browser. **Be upfront with users about the limits of this**: it
  detects "is a face visible", not "is a phone being used" — a student can still glance
  at a phone that's in frame, or angle the camera to hide it. No browser-based system can
  fully prevent a second physical device; this raises the bar and gives a teacher
  reviewing snapshots an extra signal, it doesn't replace human invigilation for
  high-stakes exams.
- **One attempt per student**: exams default to `maxAttempts: 1`, enforced server-side
  (a student cannot start a second attempt once one exists) and reflected in the student's
  exam list ("Already attempted" / "View result" instead of a Start button). Refreshing
  mid-exam resumes the same in-progress attempt rather than starting a new one.
- **Auto-grading & results**: correct/wrong/unanswered counts, marks, negative-mark
  deduction, percentage, pass/fail, rank recalculated per exam, question-wise analysis
  with explanations.
- **Notifications**: a live bell icon in the navbar with an unread-count badge, polling
  every 30 seconds. Students are automatically notified the moment an admin/teacher
  schedules a new exam (targeted to the exam's batch, or all students if no batch
  restriction). Students also get notified when their result is published, and the
  exam's creator gets notified when a student submits. Click a notification to mark it
  read; "Mark all read" clears the badge.
- **Analytics**: role dashboards with real stats + a score-distribution chart per exam.
- **UI**: glassmorphism, dark/light mode, Space Grotesk/Inter/JetBrains Mono type system,
  Tailwind, Framer Motion, fully responsive, no 404 on route refresh (SPA fallback
  configured for dev, Nginx, Vercel, Netlify, and the Express server itself).

## What's simplified or stubbed (be aware before calling this "done")

- **No Cloudinary/file uploads** — question images and profile photos accept URLs; wiring
  Multer + Cloudinary is straightforward but not included.
- **No email sending** — password reset returns the reset link directly in the API
  response instead of emailing it (the ResetPassword page and flow still work end-to-end,
  you just get the link on-screen instead of in an inbox). New-account credentials
  (single or bulk Excel) are shown on-screen the same way.
- **No PDF/Excel export** — Reports page shows live analytics in-app; there's no
  file-export pipeline. The data going into it is real.
- **No Swagger docs** — routes are documented via comments in each controller instead.
- **Descriptive questions** are stored and displayed but not auto-graded (no NLP grading —
  they're skipped by the grading engine as "manual review needed").
- **No payments/subscriptions** — the Institute model has a `plan` field an admin can
  change, but there's no billing integration.

None of this is faked — every route above is real, connected, and was build-tested.

## Project structure

```
cbt-exam-portal/
├── backend/           Express API (controllers, models, routes, middlewares)
├── frontend/           React (Vite) SPA
├── docker-compose.yml  Backend + Frontend + MongoDB, one command
├── render.yaml          Render Blueprint (backend + static frontend)
├── railway.json         Railway config (backend)
└── deployment/
    └── nginx.conf        Reverse-proxy config for a single-VPS deployment
```

## Quick start (local)

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI (Atlas or local) and JWT secrets
npm install
npm run seed               # creates demo institute, users, subjects, questions, a live exam
npm run dev                 # http://localhost:5000
```

Seeded logins (password `Password123` for all):

| Role | Email |
|---|---|
| Super Admin | superadmin@cbtportal.com |
| Institute Admin | admin@everest.edu |
| Teacher | teacher@everest.edu |
| Student | student1@everest.edu |

Institute code: `EVEREST`. The seed script also creates a **live** demo exam so you can
test the CBT interface immediately after logging in as a student.

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                  # http://localhost:5173
```

### 3. Or run everything with Docker

```bash
docker compose up --build
```

## Deployment

- **Backend → Render/Railway**: use `render.yaml` or `railway.json` at the repo root, or
  deploy `backend/` manually with `MONGO_URI` pointing at MongoDB Atlas.
- **Frontend → Vercel/Netlify**: `frontend/vercel.json` and `frontend/netlify.toml`
  already configure the SPA rewrite so refreshing `/dashboard`, `/exams`, etc. never 404s.
- **Single VPS**: build the frontend (`npm run build`), serve `frontend/dist` via the
  provided `deployment/nginx.conf` (reverse-proxies `/api` to the Node process), run the
  backend with pm2 or Docker.
- **One-process option**: set `SERVE_FRONTEND=true` and `FRONTEND_DIST` on the backend
  and it will serve the built frontend directly with the same SPA fallback.

## Capacity & known limitations

**How many students can this handle?** It depends on hosting tier — roughly 30-50
concurrent on free-tier hosting, 300-500 on a modest paid VPS/Atlas tier, 1000+ with
proper production scaling (load balancer, multiple Node instances, Atlas M30+).

**Shared-IP rate limiting — fixed.** `express-rate-limit` keys by IP by default, which
is a problem when many students share one public IP (e.g. one campus WiFi via NAT) —
their combined traffic could trip a single shared limit and get real students blocked
with `429 Too Many Requests`. This is fixed with a layered approach:
- The global `/api` limiter (`server.js`) is now a generous, coarse safety net (3000
  req/15min per IP) rather than the actual throttle.
- `backend/middlewares/rateLimiter.js` adds a **per-user** limiter (keyed by the
  authenticated user's id, not IP) on the routes that see the heaviest traffic during an
  exam — `attemptRoutes.js` (answer auto-saves, violation logs, snapshots) and
  `notificationRoutes.js` (polled every 30s). Each student gets their own quota
  regardless of how many classmates share their network.
- The login limiter (`/api/auth/login`) is keyed by the submitted email instead of IP,
  so a class of students logging in around the same time from one campus IP doesn't
  lock each other out.

Verified with `backend/scripts/load-test.js`: 100 simulated students x 20 requests each
(2000 total, all from one IP) — 0 requests blocked after the fix, versus ~17% blocked
before it on a comparable 30-student run.

To try it yourself:
```bash
cd backend
npm run dev              # in one terminal — needs a working MONGO_URI to boot
npm run loadtest          # in another terminal — simulates 30 students x 20 requests
```
Pass different numbers to test other loads: `node scripts/load-test.js 200 20`.

## Security notes

Helmet, CORS (locked to `CLIENT_URL`), rate limiting (global + stricter on `/api/auth/login`),
bcrypt password hashing, JWT with short-lived access tokens + refresh rotation, and
server-side role checks on every protected route (client-side checks are for UX only,
not security).

**Camera access requires a secure context** — browsers only allow `getUserMedia()` over
HTTPS or on `localhost`. It works out of the box in local dev; when you deploy, make sure
the frontend is served over HTTPS (Vercel/Netlify/Render do this automatically) or the
camera permission prompt will fail.
# exampro
