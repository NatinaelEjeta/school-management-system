# Nejo preparatory School Academy — School Management System

   ## Screenshots

   ![Login](screenshots/login.png)
   ![Admin dashboard](screenshots/dashboard.png)
   ![Students](screenshots/students.png)
   ![Attendance](screenshots/attendance.png)
   ![Grades](screenshots/grades.png)

A full-stack, role-based school management web application. One codebase ships the UI **and** the REST API: admins manage students, teachers and courses; teachers keep an attendance register and a grade book; students get a personal portal with per-course averages, attendance history and a downloadable PDF report card.

Every request is authenticated with JWT and authorized **on the server** — the client role is never trusted.

---

## Features

- **Authentication & authorization**
  - Email + password login, hashed with **bcrypt** (10 rounds).
  - **JWT** sessions (7 days) delivered as an `httpOnly` cookie (`school_session`) — an `Authorization: Bearer <token>` header also works for API clients.
  - Role-based access control with three roles: **ADMIN**, **TEACHER**, **STUDENT**. Guards run on every API route (`requireRole`, `assertCourseAccess`), and the user record is re-loaded from the database on each request so demotions/deletions take effect immediately.
- **Student management (ADMIN)** — full CRUD with server-side search (`?search=`) and pagination (`?page=&pageSize=`, default 10 / max 50).
- **Teacher management (ADMIN)** — full CRUD, one linked user account per teacher.
- **Course management** — create/update/delete courses, assign (or clear) the owning teacher; `GET /api/courses` is role-scoped: admins see all, teachers see their own, students see what they are enrolled in.
- **Enrollment** — enroll/unenroll students per course (`POST`/`DELETE /api/courses/:id/students`), with a `?scope=unenrolled` roster listing for the enroll dialog.
- **Attendance register** — per course + date sheet with `PRESENT` / `ABSENT` / `LATE`, bulk-saved as an upsert; the `@@unique([enrollmentId, date])` constraint prevents duplicate records for the same student, course and date.
- **Grade book** — assessments with a free-form name, `score` and `maxScore` (validated so `score ≤ maxScore`), listed per course, deletable individually.
- **Student portal** — per-course averages plus an overall **weighted average** (`Σ score / Σ maxScore`), attendance summary (overall + per course + recent records), and a **PDF report card** export built with **jsPDF + jspdf-autotable** (A4, header band, per-course tables, averages and attendance rate).
- **Admin dashboard** — totals (students, teachers, courses, enrollments), overall attendance rate, and **Recharts** charts: average grade per course (bar chart) and attendance distribution (pie chart).
- **Robust API errors** — every failure returns `{ message, details? }`; Zod validation failures return `400` with field-level `details`, unique-constraint violations map to `409`, missing records to `404`, permission failures to `403`.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router — single `/` client page + API routes as the REST layer) |
| Language | **TypeScript 5** |
| UI | **Tailwind CSS 4** + **shadcn/ui** (New York style, neutral base) |
| Database | **SQLite** (local, via Prisma) / **PostgreSQL** (production) |
| ORM | **Prisma** |
| Validation | **Zod** (every request body) |
| Auth | **jsonwebtoken** + **bcryptjs** |
| Data fetching | **TanStack Query** (cache, mutations, invalidation) |
| Charts | **Recharts** |
| PDF | **jsPDF** + **jspdf-autotable** (dynamically imported) |

### Architecture Note

The app uses a **Next.js full-stack layout** (one `/` page client app + REST API under `src/app/api/**`) with an **Express-style server layer**, so the backend reads like a classic layered service:

- `src/server/controllers` — HTTP handlers: parse the request, enforce roles, set status codes.
- `src/server/services` — business logic and all Prisma queries.
- `src/server/middleware` — JWT authentication + RBAC guards (`requireRole`, `assertCourseAccess`).
- `src/server/validation.ts` — Zod schemas for every request body.
- `src/server/errors.ts` — `ApiError` + one centralized error handler used by every route.

**Every route checks permissions on the SERVER** — roles are never trusted from the client.

## Project Structure

```
prisma/
  schema.prisma                       # User, Student, Teacher, Course, Enrollment, Attendance, Grade
  seed.ts                             # Deterministic demo data (mulberry32 PRNG)
src/
  app/
    page.tsx                          # Single-page client app (login + role-based workspace)
    layout.tsx / globals.css          # Root layout, Tailwind 4 theme tokens
    api/
      route.ts                        # GET /api — health check
      auth/
        login/route.ts                # POST   /api/auth/login
        logout/route.ts               # POST   /api/auth/logout
        me/route.ts                   # GET    /api/auth/me
      students/
        route.ts                      # GET/POST         /api/students
        [id]/route.ts                 # GET/PUT/DELETE   /api/students/:id
      teachers/
        route.ts                      # GET/POST         /api/teachers
        [id]/route.ts                 # PUT/DELETE       /api/teachers/:id
      courses/
        route.ts                      # GET/POST         /api/courses
        [id]/route.ts                 # GET/PUT/DELETE   /api/courses/:id
        [id]/students/route.ts        # GET/POST         /api/courses/:id/students
        [id]/students/[studentId]/route.ts  # DELETE     /api/courses/:id/students/:studentId
      attendance/
        route.ts                      # GET/POST         /api/attendance
        me/route.ts                   # GET              /api/attendance/me
      grades/
        route.ts                      # GET/POST         /api/grades
        me/route.ts                   # GET              /api/grades/me
        [id]/route.ts                 # DELETE           /api/grades/:id
      dashboard/route.ts              # GET              /api/dashboard
      reports/[studentId]/route.ts    # GET              /api/reports/:studentId
  server/
    controllers/                      # HTTP handlers per resource
    services/                         # Business logic + Prisma
    middleware/auth.ts                # JWT auth + RBAC guards
    auth/tokens.ts                    # JWT sign/verify + cookie options
    validation.ts                     # Zod schemas
    errors.ts                         # ApiError + centralized error handling
    http.ts                           # JSON body / id / pagination helpers
  components/
    school/                           # Feature UI: login, dashboard, students, teachers,
                                      # courses, attendance, grades, report card, PDF export
    ui/                               # shadcn/ui primitives (New York)
  lib/
    api-client.ts                     # Typed fetch wrapper for the REST API
    db.ts                             # Prisma client singleton
    utils.ts                          # shadcn `cn()` helper
  types/
    school.ts                         # Shared DTOs, Role / AttendanceStatus unions, error body
```

## Getting Started (Local)

### Prerequisites

- **Node.js 20+** or **Bun 1.1+** (Bun is the primary runtime in this repo — the seed script and the production `start` script both use it)
- A `JWT_SECRET` — any random hex string of **at least 16 characters** (see below)

### Setup

```bash
# 1. Install dependencies
bun install            # or: npm install

# 2. Configure environment
cp .env.example .env   # then edit .env (see table below)

# 3. Push the Prisma schema to the SQLite database
bun run db:push        # npm/npx equivalent: npx prisma db push

# 4. Seed demo data (1 admin, 3 teachers, 15 students, courses, grades, attendance)
bun run db:seed

# 5. Start the dev server
bun run dev            # or: npm run dev
```

The app runs at **http://localhost:3000**.

Other useful scripts:

```bash
bun run lint           # ESLint      (npm equivalent: npm run lint / npx eslint .)
bun run build          # Production build (standalone output)
bun run start          # Serve the standalone build (NODE_ENV=production)
```

> **npm users:** the `db:seed` script invokes `bun prisma/seed.ts`. If you don't have Bun installed, run the seed with `npx tsx prisma/seed.ts` (after `npm install -D tsx`), or `npx prisma db seed` once a Node-compatible `prisma.seed` command is configured.

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite (default, local): `file:/home/z/my-project/db/custom.db` — PostgreSQL (production): `postgresql://user:pass@host:5432/school_mgmt` |
| `JWT_SECRET` | Yes | Secret used to sign JWTs. Minimum **16 characters**; generate one with `openssl rand -hex 32`. API calls fail with a `500` if it is missing or too short. |
| `NODE_ENV` | No | `development` (default) or `production`. In production the session cookie is marked `secure`. |

## Demo Accounts

The seed script (`bun run db:seed`) creates a complete demo dataset — **5 courses, 45 enrollments, 450 attendance records across 10 weekdays, and 135 grades** (three assessments per enrollment: *CAT 1* /20, *Midterm Exam* /50, *End-Term Exam* /100).

| Email | Password | Role | Notes |
| --- | --- | --- | --- |
| `admin@school.edu` | `Admin123!` | ADMIN | kebena — full access |
| `grace.mwangi@school.edu` | `Teacher123!` | TEACHER | Teaches Mathematics & Chemistry |
| `david.ochieng@school.edu` | `Teacher123!` | TEACHER | English Literature & History & Government |
| `fatima.hassan@school.edu` | `Teacher123!` | TEACHER | Physics |
| `brian.otieno@school.edu` | `Student123!` | STUDENT | Any of the 15 seeded students works, e.g. Brian Otieno |

## API Reference

**Authentication:** send the JWT either as the `httpOnly` cookie `school_session` (set automatically by `POST /api/auth/login`) or as an `Authorization: Bearer <token>` header. Unauthenticated requests get `401`; insufficient role gets `403`.

**Error format:** all errors are JSON — `{ "message": "…", "details": [{ "path": "…", "message": "…" }] }` (`details` is optional and present on validation errors).

| Method & Path | Role required | Description |
| --- | --- | --- |
| `POST /api/auth/login` | Public | Sign in, returns user + token, sets `school_session` cookie |
| `POST /api/auth/logout` | Public | Clears the session cookie |
| `GET /api/auth/me` | Any authenticated | Current session user |
| `GET /api/students?search=&page=&pageSize=` | ADMIN | Paginated student list with search |
| `POST /api/students` | ADMIN | Create a student (creates the linked user account) |
| `GET /api/students/:id` | ADMIN | Student detail |
| `PUT /api/students/:id` | ADMIN | Update a student |
| `DELETE /api/students/:id` | ADMIN | Delete a student (cascades) |
| `GET /api/teachers` | ADMIN | Teacher list |
| `POST /api/teachers` | ADMIN | Create a teacher |
| `PUT /api/teachers/:id` | ADMIN | Update a teacher |
| `DELETE /api/teachers/:id` | ADMIN | Delete a teacher (courses become unassigned) |
| `GET /api/courses` | Any authenticated | Role-scoped: ADMIN all / TEACHER own / STUDENT enrolled |
| `POST /api/courses` | ADMIN | Create a course (optional `teacherId`) |
| `GET /api/courses/:id` | ADMIN or owning TEACHER | Course detail + roster |
| `PUT /api/courses/:id` | ADMIN | Update course / reassign teacher |
| `DELETE /api/courses/:id` | ADMIN | Delete course (cascades enrollments) |
| `GET /api/courses/:id/students` | ADMIN or owning TEACHER | Course roster (`?scope=unenrolled` — ADMIN — lists students available to enroll) |
| `POST /api/courses/:id/students` | ADMIN | Enroll a student (`{ studentId }`) |
| `DELETE /api/courses/:id/students/:studentId` | ADMIN | Unenroll a student |
| `GET /api/attendance?courseId=&date=` | ADMIN or owning TEACHER | Attendance register sheet for course + date |
| `POST /api/attendance` | ADMIN or owning TEACHER | Bulk save the register (`{ courseId, date, records: [{ enrollmentId, status }] }`) — upsert, duplicate-safe |
| `GET /api/attendance/me` | STUDENT | Own attendance summary + per-course breakdown |
| `GET /api/grades?courseId=` | ADMIN or owning TEACHER | Grade book for a course |
| `POST /api/grades` | ADMIN or owning TEACHER | Add an assessment grade (`{ enrollmentId, assessmentName, score, maxScore }`) |
| `GET /api/grades/me` | STUDENT | Own grades, per-course averages, overall weighted average |
| `DELETE /api/grades/:id` | ADMIN or owning TEACHER | Delete a grade |
| `GET /api/dashboard` | ADMIN | Dashboard stats: totals, attendance rate, chart data |
| `GET /api/reports/:studentId` | ADMIN or that student | Full report card data (used by the PDF export) |
| `GET /api` | Public | Health check |

## Switching to PostgreSQL

SQLite is perfect for local development, but production deployments should use PostgreSQL:

1. Edit `prisma/schema.prisma` and change the datasource provider:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string, e.g.:

   ```env
   DATABASE_URL="postgresql://user:password@host:5432/school_mgmt"
   ```

3. Generate and apply the initial migration:

   ```bash
   bunx prisma migrate dev --name init
   ```

4. Seed the database — the seed script uses plain Prisma calls and works unchanged on both engines:

   ```bash
   bun run db:seed
   ```

Optionally, convert the `role` / `status` string columns to native PostgreSQL **enums** — the exact variant is documented in the comments of `prisma/schema.prisma` (SQLite has no enum type, which is why the application layer validates these values).

## Deployment

### Render

1. Create a new **Web Service** from the repository.
2. Set the commands:
   - **Build:** `bun install && bunx prisma generate && bunx prisma migrate deploy`
   - **Start:** `npm run build && npm run start` — the `start` script in `package.json` launches the standalone Next.js server (`bun .next/standalone/server.js`). Alternatively use `next build && next start` directly.
3. Add environment variables:
   - `DATABASE_URL` — the **Render PostgreSQL internal URL** (`postgresql://…` — remember to switch the Prisma provider to `postgresql` as described above)
   - `JWT_SECRET` — a fresh `openssl rand -hex 32` value
   - `NODE_ENV=production`
4. Run the seed once from the Render shell so the demo accounts exist:

   ```bash
   bun run db:seed
   ```

### Railway

1. Create a project **from the repo** and add the **PostgreSQL** plugin.
2. Set the same environment variables (`DATABASE_URL` from the Railway PostgreSQL plugin, `JWT_SECRET`, `NODE_ENV=production`) and switch the Prisma provider to `postgresql`.
3. Use the same build/start commands as above.
4. Seed once via the Railway CLI:

   ```bash
   railway run bun run db:seed
   ```

## Testing

The original request called for **Jest + Supertest**; in this build environment the app ships with end-to-end **browser verification** of all flows (login, RBAC per role, CRUD, attendance, grades, report card) instead of automated test files, due to platform constraints.

### Adding automated tests (when self-hosting)

The layered `src/server` design makes the API straightforward to test with Jest + Supertest:

1. Install the toolchain: `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`.
2. Add a Jest config with `ts-jest` (preset `ts-jest`) pointing at a `tests/` directory, and a test DB URL (e.g. a separate SQLite file or a throwaway Postgres schema) so tests never touch dev data.
3. Because routes live in Next.js App Router modules, the practical pattern is to boot the handlers through a tiny harness (or run `next dev` on a test port and point Supertest's `request` at `http://localhost:<port>`), then cover at minimum:
   - `POST /api/auth/login` — happy path sets the `school_session` cookie; wrong password returns `401`.
   - `GET /api/students` as a STUDENT/TEACHER token — returns **403** (RBAC enforced server-side).
   - `POST /api/attendance` twice for the same course + date — the second save **upserts** (no duplicate rows; a raw duplicate insert hits the unique constraint → `409`).
4. Run with `npx jest`.

No test files are included in this repository.

## License

This project is released under the **MIT License** — free to use, modify and distribute.
