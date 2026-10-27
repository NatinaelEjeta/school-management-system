'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { api, ApiClientError } from '@/lib/api-client'
import type { AuthUser, CourseDto, TeacherDto } from '@/types/school'
import { EmptyState, ErrorAlert, TableSkeleton } from './shared'

interface CourseFormValues {
  name: string
  teacherId: string
}

export function CoursesView({ user, onOpenCourse }: { user: AuthUser; onOpenCourse: (courseId: number) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = user.role === 'ADMIN'

  const coursesQuery = useQuery({
    queryKey: ['courses', user.id],
    queryFn: () => api.get<CourseDto[]>('/api/courses'),
  })

  const teachersQuery = useQuery({
    queryKey: ['teachers', ''],
    queryFn: () => api.get<TeacherDto[]>('/api/teachers'),
    enabled: isAdmin,
  })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CourseDto | null>(null)
  const [deleting, setDeleting] = React.useState<CourseDto | null>(null)

  const saveMutation = useMutation({
    mutationFn: (values: CourseFormValues) => {
      const payload = {
        name: values.name,
        teacherId: values.teacherId === '' ? null : Number(values.teacherId),
      }
      if (editing) return api.put<CourseDto>(`/api/courses/${editing.id}`, payload)
      return api.post<CourseDto>('/api/courses', payload)
    },
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFormOpen(false)
      setEditing(null)
      toast({ title: editing ? 'Course updated' : 'Course created', description: `${course.name} was saved successfully.` })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save course',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (course: CourseDto) => api.delete(`/api/courses/${course.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleting(null)
      toast({
        title: 'Course deleted',
        description: 'All enrollments, attendance and grades for this course were removed.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete course',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const courses = coursesQuery.data ?? []
  const teachers = teachersQuery.data ?? []

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New course
          </Button>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {coursesQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} cols={4} />
            </div>
          ) : coursesQuery.isError ? (
            <div className="p-4">
              <ErrorAlert
                message={coursesQuery.error instanceof ApiClientError ? coursesQuery.error.message : 'Failed to load courses.'}
                onRetry={() => void coursesQuery.refetch()}
              />
            </div>
          ) : courses.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description={
                  user.role === 'TEACHER'
                    ? 'No courses have been assigned to you yet. Contact the administrator.'
                    : user.role === 'STUDENT'
                      ? 'You are not enrolled in any courses yet.'
                      : 'Create your first course to start enrolling students.'
                }
                action={
                  isAdmin ? (
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New course
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="hidden sm:table-cell">Teacher</TableHead>
                  <TableHead className="hidden md:table-cell">Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer"
                    onClick={() => onOpenCourse(course.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                          <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <span className="text-sm font-medium">{course.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {course.teacherName ? (
                        <span className="text-sm">{course.teacherName}</span>
                      ) : (
                        <span className="text-sm italic text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm tabular-nums">{course.studentCount}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="mr-2 hidden sm:inline-flex" onClick={() => onOpenCourse(course.id)}>
                        Open
                      </Button>
                      {isAdmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Actions for ${course.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Course actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(course)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(course)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CourseFormDialog
        open={formOpen}
        editing={editing}
        teachers={teachers}
        submitting={saveMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
        serverError={saveMutation.error instanceof ApiClientError ? saveMutation.error : null}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the course together with its enrollments, attendance history and grades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => deleting && deleteMutation.mutate(deleting)}>
              Delete course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CourseFormDialog({
  open,
  editing,
  teachers,
  submitting,
  onOpenChange,
  onSubmit,
  serverError,
}: {
  open: boolean
  editing: CourseDto | null
  teachers: TeacherDto[]
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CourseFormValues) => void
  serverError: ApiClientError | null
}) {
  const [values, setValues] = React.useState<CourseFormValues>({ name: '', teacherId: '' })
  const [fieldError, setFieldError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setValues({
        name: editing?.name ?? '',
        teacherId: editing?.teacherId !== null && editing?.teacherId !== undefined ? String(editing.teacherId) : '',
      })
      setFieldError(null)
    }
  }, [open, editing])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.name.trim().length < 2) {
      setFieldError('Course name must be at least 2 characters.')
      return
    }
    setFieldError(null)
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Create a new course'}</DialogTitle>
          <DialogDescription>Name the course and optionally assign a teacher. You can reassign later.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="course-name">Course name</Label>
            <Input
              id="course-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Mathematics"
            />
            {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-teacher">Teacher (optional)</Label>
            <Select value={values.teacherId} onValueChange={(teacherId) => setValues((v) => ({ ...v, teacherId }))}>
              <SelectTrigger id="course-teacher">
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={String(teacher.id)}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {serverError ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{serverError.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
