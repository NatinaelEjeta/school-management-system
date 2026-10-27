'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  School as SchoolIcon,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import type { AuthUser, Role } from '@/types/school'
import { AvatarInitials, RoleBadge, ThemeToggle } from './shared'
import { DashboardView } from './dashboard-view'
import { StudentsView } from './students-view'
import { TeachersView } from './teachers-view'
import { CoursesView } from './courses-view'
import { CourseDetailView } from './course-detail-view'
import { MyGradesView } from './my-grades-view'
import { MyAttendanceView } from './my-attendance-view'
import { ReportCardView } from './report-card-view'

export type View =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'course-detail'
  | 'my-grades'
  | 'my-attendance'
  | 'report-card'

interface NavItem {
  id: View
  label: string
  icon: LucideIcon
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'courses', label: 'Courses', icon: BookOpen },
  ],
  TEACHER: [{ id: 'courses', label: 'My Courses', icon: BookOpen }],
  STUDENT: [
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'my-grades', label: 'My Grades', icon: BarChart3 },
    { id: 'my-attendance', label: 'My Attendance', icon: ClipboardCheck },
    { id: 'report-card', label: 'Report Card', icon: FileText },
  ],
}

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'School-wide overview of students, staff and performance.' },
  students: { title: 'Students', subtitle: 'Create, edit, search and manage student records.' },
  teachers: { title: 'Teachers', subtitle: 'Manage teacher accounts and their course load.' },
  courses: { title: 'Courses', subtitle: 'Courses, assignments and enrollments.' },
  'course-detail': { title: 'Course detail', subtitle: 'Roster, attendance register and grade book.' },
  'my-grades': { title: 'My Grades', subtitle: 'Assessment scores, course averages and overall average.' },
  'my-attendance': { title: 'My Attendance', subtitle: 'Your attendance record across all courses.' },
  'report-card': { title: 'Report Card', subtitle: 'Preview and download your report card as a PDF.' },
}

export function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = React.useState<View>(user.role === 'ADMIN' ? 'dashboard' : user.role === 'TEACHER' ? 'courses' : 'courses')
  const [activeCourseId, setActiveCourseId] = React.useState<number | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)

  const navItems = NAV_BY_ROLE[user.role]

  const openCourse = React.useCallback((courseId: number) => {
    setActiveCourseId(courseId)
    setView('course-detail')
  }, [])

  const switchView = React.useCallback((next: View) => {
    setView(next)
    setMobileNavOpen(false)
    if (next !== 'course-detail') setActiveCourseId(null)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Clear the local session even if the server call fails.
    } finally {
      queryClient.clear()
      onLogout()
    }
  }

  function renderNavItems(className?: string) {
    return navItems.map((item) => {
      const isActive = item.id === view || (item.id === 'courses' && view === 'course-detail')
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => switchView(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            className,
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </button>
      )
    })
  }

  const meta = view === 'course-detail' ? VIEW_META['course-detail'] : VIEW_META[view]

  function renderContent() {
    switch (view) {
      case 'dashboard':
        return <DashboardView />
      case 'students':
        return <StudentsView />
      case 'teachers':
        return <TeachersView />
      case 'courses':
        return <CoursesView user={user} onOpenCourse={openCourse} />
      case 'course-detail':
        return activeCourseId === null ? (
          <CoursesView user={user} onOpenCourse={openCourse} />
        ) : (
          <CourseDetailView user={user} courseId={activeCourseId} onBack={() => switchView('courses')} />
        )
      case 'my-grades':
        return <MyGradesView />
      case 'my-attendance':
        return <MyAttendanceView />
      case 'report-card':
        return <ReportCardView studentId={user.studentId} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <SchoolIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Greenfield Academy</p>
              <p className="text-[11px] text-muted-foreground">School Management</p>
            </div>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
            {renderNavItems()}
          </nav>
          <Separator />
          <div className="flex items-center gap-3 p-4">
            <AvatarInitials name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Sign out" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
            {/* Mobile nav */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 lg:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b px-5 py-4">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
                      <SchoolIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Greenfield Academy</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="space-y-1 p-3" aria-label="Mobile navigation">
                  {renderNavItems()}
                </nav>
                <Separator />
                <div className="flex items-center gap-3 p-4">
                  <AvatarInitials name={user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                    <RoleBadge role={user.role} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Sign out" onClick={handleLogout} disabled={loggingOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">{meta.title}</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
            </div>

            {/* Mobile user chip */}
            <div className="hidden items-center gap-2 sm:flex lg:hidden">
              <AvatarInitials name={user.name} className="h-8 w-8" />
            </div>

            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 lg:flex"
              aria-label="Sign out"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{renderContent()}</div>
          </main>

          <footer className="mt-auto border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
            Greenfield Academy — School Management System · Signed in as {user.name}
          </footer>
        </div>
      </div>
    </div>
  )
}
