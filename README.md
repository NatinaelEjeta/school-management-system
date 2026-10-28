# Nejo Preparatory School Academy - School Management System

A full-stack, role-based school management web app. Admins manage students, teachers and courses; teachers take attendance and enter grades; students get a personal portal with grades, attendance and a downloadable PDF report card.

Every request is authenticated with JWT and authorized on the server. The client role is never trusted.

**Live demo:** https://school-management-system-sigma-five.vercel.app

## Screenshots

![Login](screenshots/login.png)
![Admin dashboard](screenshots/dashboard.png)
![Students](screenshots/students.png)
![Attendance](screenshots/attendance.png)
![Grades](screenshots/grades.png)

## Features

- **Authentication:** email and password login, passwords hashed with bcrypt, JWT sessions in an httpOnly cookie
- **Role-based access control:** ADMIN, TEACHER and STUDENT roles, checked on every API route
- **Students and teachers (admin):** create, edit, delete, with server-side search and pagination
- **Courses:** create courses, assign a teacher, enroll and unenroll students. Each role only sees its own courses
- **Attendance:** per course and date, marked present, absent or late. Duplicate records for the same student, course and date are prevented by a database constraint
- **Grades:** teachers add assessments (name, score, max score). Students see per-course averages and an overall average
- **Admin dashboard:** totals, overall attendance rate, and charts (average grade per course, attendance distribution)
- **PDF report card:** downloadable per student
- **Change password:** signed-in users can change their password (current password verified, new one validated and hashed with bcrypt). Demo accounts are protected from changes
- **Validation and errors:** every request body is validated with Zod and failures return clear status codes (400, 401, 403, 404, 409)

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) with API routes as the REST layer |
| Language | TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Validation | Zod |
| Auth | jsonwebtoken, bcryptjs |
| Data fetching | TanStack Query |
| Charts | Recharts |
| PDF | jsPDF, jspdf-autotable |
| Hosting | Vercel |


## Architecture

The backend uses a layered structure under `src/server`:

- `controllers`: HTTP handlers that parse requests and set status codes
- `services`: business logic and all database queries
- `middleware`: JWT authentication and role guards (`requireRole`, `assertCourseAccess`)
- `validation.ts`: Zod schemas
- `errors.ts`: one centralized error handler

```
prisma/              schema and seed data
src/app/api/         REST API routes
src/server/          controllers, services, middleware, validation
src/components/      UI screens and shadcn/ui components
src/lib/             API client and Prisma client
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@school.edu | Admin123! |
| Teacher | grace.mwangi@school.edu | Teacher123! |
| Student | brian.otieno@school.edu | Student123! |

These accounts contain fake demo data only.

## Run locally

Requirements: Node.js 20 or newer, and a PostgreSQL database (a free one from [Neon](https://neon.tech) works well).

```bash
git clone https://github.com/NatinaelEjeta/school-management-system.git
cd school-management-system
npm install
```

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="a long random string, at least 16 characters"
```

Create the tables, add demo data and start the app:

```bash
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## API overview

All errors are JSON: `{ "message": "...", "details": [...] }`. Unauthenticated requests return 401, insufficient role returns 403.

| Endpoint | Access | Description |
| --- | --- | --- |
| `POST /api/auth/login` | Public | Sign in |
| `POST /api/auth/logout` | Public | Sign out |
| `GET /api/auth/me` | Any user | Current user |
| `POST /api/auth/change-password` | Any user | Change own password |
| `/api/students` | Admin | List, create, update, delete students |
| `/api/teachers` | Admin | List, create, update, delete teachers |
| `GET /api/courses` | Any user | Role-scoped course list |
| `POST /api/courses` | Admin | Create a course |
| `GET /api/courses/:id` | Admin or course teacher | Course detail and roster |
| `POST /api/courses/:id/students` | Admin | Enroll a student |
| `GET /api/attendance` | Admin or course teacher | Attendance sheet for a course and date |
| `POST /api/attendance` | Admin or course teacher | Save attendance (upsert, no duplicates) |
| `GET /api/attendance/me` | Student | Own attendance summary |
| `GET /api/grades` | Admin or course teacher | Grade book for a course |
| `POST /api/grades` | Admin or course teacher | Add a grade |
| `GET /api/grades/me` | Student | Own grades and averages |
| `GET /api/dashboard` | Admin | Dashboard statistics |
| `GET /api/reports/:studentId` | Admin or that student | Report card data |

## Deployment (Vercel and Neon)

1. Create a PostgreSQL database on Neon and copy the connection string.
2. Push the repository to GitHub and import it on [Vercel](https://vercel.com).
3. Add `DATABASE_URL` (your Neon string) and `JWT_SECRET` (a new random value) as environment variables.
4. Deploy. Create the tables and demo data once from your computer, with `DATABASE_URL` pointing to the Neon database:

```bash
npx prisma db push
npm run db:seed
```

## Roadmap

- Automated API tests (Jest and Supertest) for login, role permissions and attendance
- Email notifications when a grade is added
- CSV export for attendance

## Author

Natinael Ejeta - [GitHub](https://github.com/NatinaelEjeta)

## License

Copyright (c) 2026 Natinael Ejeta. All rights reserved.
