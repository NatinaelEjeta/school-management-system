# Worklog — Greenfield Academy School Management System

---
Task ID: 1
Agent: main-agent (Z.ai Code)
Task: Database schema and seed (Prisma)

Work Log:
- Rewrote prisma/schema.prisma: User, Student, Teacher, Course, Enrollment, Attendance, Grade with FKs, cascades, @@unique([studentId, courseId]) and @@unique([enrollmentId, date]) + indexes.
- SQLite provider (sandbox constraint); README will document switching to postgresql for deployment.
- Created prisma/seed.ts (deterministic mulberry32 PRNG): 1 admin, 3 teachers, 15 students, 5 courses, 45 enrollments, 450 attendance rows (10 weekdays), 135 grades.
- Added `db:seed` script + `prisma.seed` config in package.json.
- Ran `bun run db:push` (schema in sync) and `bun run db:seed` successfully.
- Added JWT_SECRET to .env (openssl rand -hex 32).

Stage Summary:
- Demo accounts: admin@school.edu / Admin123! ; grace.mwangi@school.edu / Teacher123! ; brian.otieno@school.edu / Student123!
- Deps added: jsonwebtoken, @types/jsonwebtoken, bcryptjs, jspdf@2.5.2, jspdf-autotable@3.8.2.
- Stack adaptation: Next.js 16 App Router (single `/` page + /api routes) instead of Vite+Express; SQLite instead of PostgreSQL (sandbox mandate). Same REST surface, JWT+bcrypt, Zod, Recharts, controllers/services/middleware layout under src/server.

---
Task ID: 8-a
Agent: general-purpose
Task: README.md and .env.example for the School Management System

Work Log:
- Read worklog.md, package.json, prisma/schema.prisma, prisma/seed.ts and the full src/server + src/app/api tree to verify every claim before writing.
- Created README.md with: title/description, full feature list (JWT+bcrypt RBAC, student/teacher CRUD, courses, enrollment, attendance upsert register, grade book, student portal with weighted averages, admin dashboard with Recharts, jsPDF report card), tech stack table, architecture note (Next.js full-stack + Express-style src/server layer, server-side permission checks), project structure tree, local setup commands (bun/npm), env var table, demo accounts table, complete API reference (25+ endpoints with required roles, school_session httpOnly cookie + Bearer header, { message, details? } error format), PostgreSQL switch guide (provider change + bunx prisma migrate dev --name init + seed), Render and Railway deployment guides (incl. railway run bun run db:seed), testing note (browser verification shipped; how to add Jest+Supertest without writing test files), MIT license line.
- Created .env.example with DATABASE_URL (SQLite default + commented PostgreSQL line), JWT_SECRET placeholder, NODE_ENV.
- Verified against code: cookie name school_session + 7-day TTL + Bearer support (src/server/auth/tokens.ts, middleware/auth.ts), min-16-char JWT_SECRET guard, error shape { message, details? } with P2002->409 mapping (src/server/errors.ts), role matrix from requireRole/assertCourseAccess calls in all 8 controllers, students search=pagination params (page/pageSize max 50), attendance bulk upsert keyed on @@unique([enrollmentId, date]), grades GET requires courseId, dashboard ADMIN-only, reports ADMIN-or-own-student, seed counts (1/3/15/5/45/450/135) and assessment names (CAT 1 /20, Midterm /50, End-Term /100), shadcn components.json style "new-york", standalone build/start scripts in package.json.
- No application files touched (only README.md, .env.example, worklog.md append).

Stage Summary:
- Artifacts: /home/z/my-project/README.md (production-quality docs), /home/z/my-project/.env.example (template env file).

---
Task ID: 2
Agent: main-agent (Z.ai Code)
Task: Auth & roles (JWT + bcrypt, login/logout/me, RBAC middleware)

Work Log:
- src/server/auth/tokens.ts: jsonwebtoken sign/verify (7d TTL), AUTH_COOKIE options (httpOnly, sameSite=lax, secure in prod), JWT_SECRET >= 16 chars enforced.
- src/server/middleware/auth.ts: authenticate() re-loads user from DB every request (roles never trusted from token); requireRole() guard; assertCourseAccess() for teacher-owns-course / student-enrolled checks.
- src/server/services/auth.service.ts: bcrypt.compare login, error-neutral 401 messages.
- Routes: POST /api/auth/login (sets cookie), POST /api/auth/logout (clears), GET /api/auth/me.
- Verified via curl: valid login 200 + cookie; wrong password 401; RBAC student->admin route 403; unauthenticated 401.

Stage Summary:
- Auth uses httpOnly cookie school_session with Bearer-header fallback (easy API testing).

---
Task ID: 3
Agent: main-agent (Z.ai Code)
Task: Backend CRUD APIs (controllers/services/routes, Zod, centralized errors)

Work Log:
- 8 services (auth/students/teachers/courses/attendance/grades/dashboard/reports) + 8 controllers + 18 route files under src/app/api/**.
- src/server/validation.ts: Zod schemas for every input; src/server/errors.ts: ApiError + handleApiError (Zod->400 w/ details, P2002->409, P2025->404).
- Fixed bug: Student/Teacher DTO mappers referenced non-existent createdAt on those models -> switched to user.createdAt (spec's tables have no createdAt on students/teachers).
- Full curl verification: students search/pagination, teachers CRUD, courses CRUD, enroll (409 on duplicate), unenroll, attendance upsert per (enrollmentId,date), grades add/delete, dashboard stats, report card, teacher 403 on other teacher's course, Zod 400s with field details. Zero unhandled errors in dev.log.

Stage Summary:
- REST API surface complete; permissions enforced server-side on every route.

---
Task ID: 4
Agent: main-agent (Z.ai Code)
Task: Frontend pages (login, role-based shell, students/teachers/courses CRUD)

Work Log:
- src/lib/api-client.ts (typed fetch wrapper + ApiClientError), src/components/theme-provider.tsx.
- school-app.tsx: TanStack Query + ThemeProvider + session bootstrap via /api/auth/me; query cache cleared on login/logout.
- login-view.tsx: split brand panel + form, demo quick-fill buttons, loading/error states.
- app-shell.tsx: role-based sidebar (desktop) + Sheet drawer (mobile), header w/ theme toggle + sign out, sticky footer (mt-auto).
- students-view.tsx: debounced search, pagination, create/edit dialog (grade select, DOB, optional password on edit), delete confirm, report-card PDF action.
- teachers-view.tsx, courses-view.tsx: same patterns; course form assigns teacher via Select.
- shared.tsx: StatCard, EmptyState, ErrorAlert, TableSkeleton, StatusBadge, RoleBadge, PercentBar, AvatarInitials, formatDate (tz-safe).

Stage Summary:
- Verified in browser: login -> admin dashboard -> students table + live search -> courses -> course detail.

---
Task ID: 5
Agent: main-agent (Z.ai Code)
Task: Course detail (attendance/grades) + student portal + admin dashboard w/ Recharts

Work Log:
- course-detail-view.tsx: tabs Students/Attendance/Grades; enroll dialog (checkbox multi-select via ?scope=unenrolled); attendance register (date picker, P/A/L segmented buttons, Mark all present, bulk upsert save); grade book (add-grade dialog with student select/score/max validation, delete confirm).
- dashboard-view.tsx: 4 StatCards, Recharts BarChart (avg grade/course, themed via currentColor + var() in Tooltip contentStyle), PieChart attendance breakdown, courses overview bars.
- my-grades-view.tsx (overall + per-course averages), my-attendance-view.tsx (rate, by-course, recent records max-h-96 custom scrollbar), report-card-view.tsx (preview + download).
- Fixed OKLCH vs hsl() CSS var bug in chart theming; fixed pagination math precedence bug.

Stage Summary:
- Browser-verified: attendance marked & saved (persisted to DB: 8 PRESENT + 1 ABSENT), teacher add-grade dialog -> "Quiz 1 8/10" recorded + toast, student views all render, dashboard charts render.

---
Task ID: 6
Agent: main-agent (Z.ai Code)
Task: PDF report card export (jsPDF)

Work Log:
- report-card-pdf.ts: dynamic import of jspdf@2.5.2 + jspdf-autotable@3.8.2; A4 layout: emerald header band, student summary (overall avg/attendance rate), course summary table, full assessment details table, attendance summary + signature lines.
- Wired to: student Report Card view (self) + admin students table row action.
- Browser test: clicking Download PDF produced /home/z/Downloads/report-card-brian-otieno.pdf (21.5KB, 2 pages); raw-stream content verified to contain all sections (Greenfield Academy, Brian Otieno, courses, CAT/Midterm/End-Term, attendance summary, signatures).

Stage Summary:
- Note: automated Jest/Supertest files intentionally NOT written (platform rule: no test code); README documents how to add them when self-hosting.

---
Task ID: 7
Agent: main-agent (Z.ai Code)
Task: Lint + dev server + agent-browser E2E verification

Work Log:
- bun run lint: passes clean.
- Discovered sandbox kills child processes at command end; working pattern: (setsid bun run dev < /dev/null > /dev/null 2>&1 &) survives across commands (server up 15+ min during tests).
- agent-browser E2E matrix (all passed, zero page/console errors):
  * Login screen renders (email/password/demo buttons).
  * Admin: dashboard (15/3/5/90.9% + charts), students table + search "otieno", course detail, attendance mark-all-present -> set ABSENT -> save -> DB persisted.
  * UI logout works; Teacher login: nav = My Courses only, sees only own courses, grades tab + add-grade dialog end-to-end.
  * Student login: nav = My Courses/My Grades/My Attendance/Report Card; grades w/ averages; attendance summary; report card preview + real PDF download.
  * Mobile 390x844: hamburger + drawer nav, footer bbox bottom = viewport height (sticky, no gap).
  * Dark mode toggle: html class dark/light + body bg changes.
- Re-seeded DB after testing for pristine demo data (450 attendance, 135 grades); live server serves fresh stats.
- dev.log shows no unhandled errors in final runs.

Stage Summary:
- App is browser-verified end-to-end for all 3 roles. Dev server running on 3000.
