'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  GraduationCap,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api, ApiClientError, buildQueryString } from '@/lib/api-client'
import { ATTENDANCE_STATUSES, type AttendanceSheetResponse, type AttendanceStatus, type AuthUser, type CourseDetailResponse, type GradeRow, type StudentDto } from '@/types/school'
import { AvatarInitials, EmptyState, ErrorAlert, formatDate, formatPercent, TableSkeleton } from './shared'
import { cn } from '@/lib/utils'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_STYLES: Record<AttendanceStatus, { active: string; idle: string }> = {
  PRESENT: {
    active: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
    idle: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-950',
  },
  LATE: {
    active: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
    idle: 'text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950',
  },
  ABSENT: {
    active: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
    idle: 'text-rose-700 border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950',
  },
}

export function CourseDetailView({ user, courseId, onBack }: { user: AuthUser; courseId: number; onBack: () => void }) {
  const isAdmin = user.role === 'ADMIN'
  const isTeacher = user.role === 'TEACHER'

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get<CourseDetailResponse>(`/api/courses/${courseId}`),
  })

  if (courseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to courses
        </Button>
        <TableSkeleton rows={6} cols={4} />
      </div>
    )
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to courses
        </Button>
        <ErrorAlert
          message={courseQuery.error instanceof ApiClientError ? courseQuery.error.message : 'Failed to load this course.'}
          onRetry={() => void courseQuery.refetch()}
        />
      </div>
    )
  }

  const { course, roster } = courseQuery.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{course.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Teacher: {course.teacherName ?? 'Unassigned'}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {course.studentCount} enrolled
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          {(isAdmin || isTeacher) && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          {(isAdmin || isTeacher) && <TabsTrigger value="grades">Grades</TabsTrigger>}
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <StudentsTab courseId={courseId} courseName={course.name} roster={roster} isAdmin={isAdmin} />
        </TabsContent>
        {(isAdmin || isTeacher) && (
          <TabsContent value="attendance" className="mt-4">
            <AttendanceTab courseId={courseId} courseName={course.name} />
          </TabsContent>
        )}
        {(isAdmin || isTeacher) && (
          <TabsContent value="grades" className="mt-4">
            <GradesTab courseId={courseId} courseName={course.name} roster={roster} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Students tab (roster + enroll/unenroll)
// ---------------------------------------------------------------------------

function StudentsTab({
  courseId,
  courseName,
  roster,
  isAdmin,
}: {
  courseId: number
  courseName: string
  roster: CourseDetailResponse['roster']
  isAdmin: boolean
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [enrollOpen, setEnrollOpen] = React.useState(false)
  const [unenrolling, setUnenrolling] = React.useState<CourseDetailResponse['roster'][number] | null>(null)

  const unenrollMutation = useMutation({
    mutationFn: (studentId: number) => api.delete(`/api/courses/${courseId}/students/${studentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      setUnenrolling(null)
      toast({ title: 'Student unenrolled', description: 'Their attendance and grades for this course were removed.' })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not unenroll student',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Enrolled students</CardTitle>
          <CardDescription>{roster.length} students are taking {courseName}.</CardDescription>
        </div>
        {isAdmin ? (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEnrollOpen(true)}>
            <UserCheck className="mr-2 h-4 w-4" /> Enroll students
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {roster.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="No students enrolled"
              description={isAdmin ? 'Enroll students to start taking attendance and recording grades.' : 'No students have been enrolled in this course yet.'}
              action={
                isAdmin ? (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEnrollOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Enroll students
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Grade level</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                {isAdmin ? <TableHead className="w-24 text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((student) => (
                <TableRow key={student.enrollmentId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={student.name} />
                      <span className="text-sm font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{student.gradeLevel}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{student.email}</TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                        onClick={() => setUnenrolling(student)}
                        aria-label={`Unenroll ${student.name}`}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Unenroll
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <EnrollStudentsDialog open={enrollOpen} courseId={courseId} onOpenChange={setEnrollOpen} />

      <AlertDialog open={unenrolling !== null} onOpenChange={(open) => !open && setUnenrolling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll {unenrolling?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their attendance history and grades for this course will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => unenrolling && unenrollMutation.mutate(unenrolling.studentId)}
            >
              Unenroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function EnrollStudentsDialog({
  open,
  courseId,
  onOpenChange,
}: {
  open: boolean
  courseId: number
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = React.useState<Set<number>>(new Set())

  React.useEffect(() => {
    if (open) setSelected(new Set())
  }, [open])

  const enrollableQuery = useQuery({
    queryKey: ['course', courseId, 'enrollable'],
    queryFn: () => api.get<StudentDto[]>(`/api/courses/${courseId}/students${buildQueryString({ scope: 'unenrolled' })}`),
    enabled: open,
  })

  const enrollMutation = useMutation({
    mutationFn: async (studentIds: number[]) => {
      const results = await Promise.allSettled(
        studentIds.map((studentId) => api.post(`/api/courses/${courseId}/students`, { studentId })),
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      onOpenChange(false)
      toast({
        title: `${succeeded} ${succeeded === 1 ? 'student' : 'students'} enrolled`,
        description: failed > 0 ? `${failed} enrollment(s) failed — they may already be enrolled.` : 'Enrollment updated successfully.',
        variant: failed > 0 && succeeded === 0 ? 'destructive' : 'default',
      })
    },
  })

  const students = enrollableQuery.data ?? []

  function toggleStudent(studentId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll students</DialogTitle>
          <DialogDescription>Pick the students to enroll in this course.</DialogDescription>
        </DialogHeader>

        {enrollableQuery.isLoading ? (
          <TableSkeleton rows={5} cols={2} />
        ) : enrollableQuery.isError ? (
          <ErrorAlert
            message={enrollableQuery.error instanceof ApiClientError ? enrollableQuery.error.message : 'Failed to load students.'}
            onRetry={() => void enrollableQuery.refetch()}
          />
        ) : students.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Everyone is already enrolled" description="All students are already taking this course." />
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto custom-scrollbar rounded-md border p-2" role="listbox" aria-label="Students available to enroll">
            {students.map((student) => (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
              >
                <Checkbox
                  checked={selected.has(student.id)}
                  onCheckedChange={() => toggleStudent(student.id)}
                  aria-label={`Select ${student.name}`}
                />
                <AvatarInitials name={student.name} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{student.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {student.gradeLevel} · {student.email}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enrollMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={selected.size === 0 || enrollMutation.isPending}
            onClick={() => enrollMutation.mutate(Array.from(selected))}
          >
            {enrollMutation.isPending ? 'Enrolling…' : `Enroll ${selected.size === 0 ? '' : `(${selected.size})`}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Attendance tab (pick a course — via navigation — and a date, then mark)
// ---------------------------------------------------------------------------

function AttendanceTab({ courseId, courseName }: { courseId: number; courseName: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [date, setDate] = React.useState(todayIsoDate())
  const [marks, setMarks] = React.useState<Map<number, AttendanceStatus>>(new Map())

  const sheetQuery = useQuery({
    queryKey: ['attendance', courseId, date],
    queryFn: () => api.get<AttendanceSheetResponse>(`/api/attendance${buildQueryString({ courseId, date })}`),
  })

  // Sync local marking state whenever the sheet loads/changes.
  React.useEffect(() => {
    if (!sheetQuery.data) return
    const next = new Map<number, AttendanceStatus>()
    for (const row of sheetQuery.data.rows) {
      if (row.status !== null) next.set(row.enrollmentId, row.status)
    }
    setMarks(next)
  }, [sheetQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = Array.from(marks.entries()).map(([enrollmentId, status]) => ({ enrollmentId, status }))
      return api.post<{ saved: number }>('/api/attendance', { courseId, date, records })
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['attendance', courseId, date] })
      void queryClient.invalidateQueries({ queryKey: ['my-attendance'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Attendance saved', description: `${result.saved} ${result.saved === 1 ? 'record' : 'records'} saved for ${formatDate(date)}.` })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save attendance',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  function setStatus(enrollmentId: number, status: AttendanceStatus) {
    setMarks((prev) => {
      const next = new Map(prev)
      next.set(enrollmentId, status)
      return next
    })
  }

  function markAllPresent() {
    if (!sheetQuery.data) return
    const next = new Map<number, AttendanceStatus>()
    for (const row of sheetQuery.data.rows) next.set(row.enrollmentId, 'PRESENT')
    setMarks(next)
  }

  const rows = sheetQuery.data?.rows ?? []
  const markedCount = marks.size
  const unmarked = rows.length - markedCount

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Attendance register
        </CardTitle>
        <CardDescription>
          Pick a date and mark each student as present, late or absent. Saving the same date again updates the records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="attendance-date" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Date
            </Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button variant="outline" size="sm" onClick={markAllPresent} disabled={rows.length === 0}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all present
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="tabular-nums">
              {markedCount}/{rows.length} marked
            </Badge>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saveMutation.isPending || markedCount === 0}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save attendance'}
            </Button>
          </div>
        </div>

        {sheetQuery.isLoading ? (
          <TableSkeleton rows={6} cols={3} />
        ) : sheetQuery.isError ? (
          <ErrorAlert
            message={sheetQuery.error instanceof ApiClientError ? sheetQuery.error.message : 'Failed to load the attendance sheet.'}
            onRetry={() => void sheetQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students to mark"
            description={`${courseName} has no enrolled students yet. Enroll students first to take attendance.`}
          />
        ) : (
          <div className="max-h-[26rem] overflow-y-auto custom-scrollbar rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Grade</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = marks.get(row.enrollmentId) ?? null
                  return (
                    <TableRow key={row.enrollmentId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={row.name} className="h-8 w-8" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.name}</p>
                            {unmarked > 0 && status === null ? (
                              <p className="text-[11px] text-muted-foreground">Not marked yet</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{row.gradeLevel}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5" role="group" aria-label={`Attendance status for ${row.name}`}>
                          {ATTENDANCE_STATUSES.map((option) => {
                            const isActive = status === option
                            return (
                              <button
                                key={option}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setStatus(row.enrollmentId, option)}
                                className={cn(
                                  'min-w-16 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                  isActive ? STATUS_STYLES[option].active : STATUS_STYLES[option].idle,
                                )}
                              >
                                {option === 'PRESENT' ? 'Present' : option === 'LATE' ? 'Late' : 'Absent'}
                              </button>
                            )
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Grades tab (grade book: add / list / delete assessments)
// ---------------------------------------------------------------------------

function GradesTab({
  courseId,
  courseName,
  roster,
}: {
  courseId: number
  courseName: string
  roster: CourseDetailResponse['roster']
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<GradeRow | null>(null)

  const gradesQuery = useQuery({
    queryKey: ['grades', courseId],
    queryFn: () => api.get<GradeRow[]>(`/api/grades${buildQueryString({ courseId })}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (gradeId: number) => api.delete(`/api/grades/${gradeId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grades', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['my-grades'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleting(null)
      toast({ title: 'Grade deleted' })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete grade',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const grades = gradesQuery.data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Grade book</CardTitle>
          <CardDescription>Assessment scores recorded for {courseName}.</CardDescription>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={roster.length === 0} onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add grade
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {roster.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="No students enrolled" description="Enroll students before recording grades." />
          </div>
        ) : gradesQuery.isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : gradesQuery.isError ? (
          <div className="p-4">
            <ErrorAlert
              message={gradesQuery.error instanceof ApiClientError ? gradesQuery.error.message : 'Failed to load grades.'}
              onRetry={() => void gradesQuery.refetch()}
            />
          </div>
        ) : grades.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ClipboardCheck}
              title="No grades recorded yet"
              description="Add the first assessment — e.g. CAT 1, homework or an exam score."
              action={
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add grade
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Percent</TableHead>
                  <TableHead className="hidden md:table-cell">Recorded</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="text-sm font-medium">{grade.studentName}</TableCell>
                    <TableCell className="text-sm">{grade.assessmentName}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {grade.score} / {grade.maxScore}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          grade.percent >= 75 ? 'text-emerald-600 dark:text-emerald-400' : grade.percent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {formatPercent(grade.percent)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(grade.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                        aria-label={`Delete ${grade.assessmentName} for ${grade.studentName}`}
                        onClick={() => setDeleting(grade)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddGradeDialog open={addOpen} courseId={courseId} roster={roster} onOpenChange={setAddOpen} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this grade?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.assessmentName} — ${deleting.studentName} (${deleting.score}/${deleting.maxScore})` : ''} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
              Delete grade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function AddGradeDialog({
  open,
  courseId,
  roster,
  onOpenChange,
}: {
  open: boolean
  courseId: number
  roster: CourseDetailResponse['roster']
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [enrollmentId, setEnrollmentId] = React.useState('')
  const [assessmentName, setAssessmentName] = React.useState('')
  const [score, setScore] = React.useState('')
  const [maxScore, setMaxScore] = React.useState('100')
  const [fieldErrors, setFieldErrors] = React.useState<{ assessmentName?: string; score?: string; maxScore?: string; enrollmentId?: string }>({})

  React.useEffect(() => {
    if (open) {
      setEnrollmentId('')
      setAssessmentName('')
      setScore('')
      setMaxScore('100')
      setFieldErrors({})
    }
  }, [open])

  const addMutation = useMutation({
    mutationFn: (payload: { enrollmentId: number; assessmentName: string; score: number; maxScore: number }) =>
      api.post<GradeRow>('/api/grades', payload),
    onSuccess: (grade) => {
      void queryClient.invalidateQueries({ queryKey: ['grades', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['my-grades'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
      toast({
        title: 'Grade recorded',
        description: `${grade.assessmentName}: ${grade.score}/${grade.maxScore} for ${grade.studentName}.`,
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not record grade',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: typeof fieldErrors = {}
    if (!enrollmentId) errors.enrollmentId = 'Choose a student.'
    if (assessmentName.trim().length === 0) errors.assessmentName = 'Assessment name is required.'
    const scoreNumber = Number(score)
    const maxNumber = Number(maxScore)
    if (score === '' || !Number.isFinite(scoreNumber) || scoreNumber < 0) errors.score = 'Enter a valid score (0 or more).'
    if (maxScore === '' || !Number.isFinite(maxNumber) || maxNumber <= 0) errors.maxScore = 'Max score must be greater than 0.'
    if (Number.isFinite(scoreNumber) && Number.isFinite(maxNumber) && scoreNumber > maxNumber) errors.score = 'Score cannot exceed the max score.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    addMutation.mutate({
      enrollmentId: Number(enrollmentId),
      assessmentName: assessmentName.trim(),
      score: scoreNumber,
      maxScore: maxNumber,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a grade</DialogTitle>
          <DialogDescription>Add an assessment score for a student in this course.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="grade-student">Student</Label>
            <Select value={enrollmentId} onValueChange={setEnrollmentId}>
              <SelectTrigger id="grade-student">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((student) => (
                  <SelectItem key={student.enrollmentId} value={String(student.enrollmentId)}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.enrollmentId ? <p className="text-xs text-destructive">{fieldErrors.enrollmentId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade-name">Assessment name</Label>
            <Input
              id="grade-name"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder="e.g. CAT 1, Midterm Exam"
            />
            {fieldErrors.assessmentName ? <p className="text-xs text-destructive">{fieldErrors.assessmentName}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade-score">Score</Label>
              <Input
                id="grade-score"
                type="number"
                min={0}
                step="0.5"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 18"
              />
              {fieldErrors.score ? <p className="text-xs text-destructive">{fieldErrors.score}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-max">Max score</Label>
              <Input
                id="grade-max"
                type="number"
                min={1}
                step="0.5"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
              {fieldErrors.maxScore ? <p className="text-xs text-destructive">{fieldErrors.maxScore}</p> : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={addMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Saving…' : 'Record grade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
