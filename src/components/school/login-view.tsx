'use client'

import * as React from 'react'
import { BookOpen, ClipboardCheck, GraduationCap, School as SchoolIcon, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { api, ApiClientError } from '@/lib/api-client'
import type { AuthUser, LoginResponse } from '@/types/school'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@school.edu', password: 'Admin123!' },
  { label: 'Teacher', email: 'grace.mwangi@school.edu', password: 'Teacher123!' },
  { label: 'Student', email: 'brian.otieno@school.edu', password: 'Student123!' },
]

const FEATURES = [
  { icon: GraduationCap, title: 'Role-based access', text: 'Admins manage everything, teachers run their courses, students track their progress.' },
  { icon: ClipboardCheck, title: 'Attendance & grades', text: 'Daily attendance registers and weighted assessment scores per course.' },
  { icon: BookOpen, title: 'Report cards', text: 'One-click printable PDF report cards with averages and attendance.' },
]

export function LoginView({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const nextFieldErrors: { email?: string; password?: string } = {}
    const normalizedEmail = email.trim()
    if (!normalizedEmail) nextFieldErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextFieldErrors.email = 'Enter a valid email address.'
    if (!password) nextFieldErrors.password = 'Password is required.'
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) return

    setSubmitting(true)
    try {
      const result = await api.post<LoginResponse>('/api/auth/login', { email: normalizedEmail, password })
      onSuccess(result.user)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
    setFieldErrors({})
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-lg md:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-10 text-white md:flex">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <SchoolIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-tight">Nejo preparatory School Academy</p>
                  <p className="text-xs text-emerald-100">School Management System</p>
                </div>
              </div>
              <p className="mt-8 text-sm leading-relaxed text-emerald-50">
                One place to manage students, teachers, courses, attendance and grades — built for clarity and speed.
              </p>
              <ul className="mt-8 space-y-5">
                {FEATURES.map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <feature.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-emerald-100">{feature.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-emerald-100/80">© {new Date().getFullYear()} Nejo preparatory School Academy. All rights reserved.</p>
          </div>

          {/* Sign-in form */}
          <CardContent className="p-8 sm:p-10">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                <SchoolIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold leading-tight">Nejo preparatory School Academy</p>
                <p className="text-xs text-muted-foreground">School Management System</p>
              </div>
            </div>

            <CardHeader className="px-0 pt-2 md:pt-0">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your school account to continue.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={fieldErrors.email !== undefined}
                />
                {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldErrors.password !== undefined}
                />
                {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Demo accounts
              </span>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col gap-0.5 py-2 text-xs"
                  onClick={() => fillDemo(account)}
                >
                  <span className="font-semibold">{account.label}</span>
                  <span className="text-[10px] text-muted-foreground">{account.email}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </div>
      </main>

      <footer className="mt-auto border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground">
        Nejo preparatory School Academy — School Management System
      </footer>
    </div>
  )
}
