'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MoreHorizontal, Pencil, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react'
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
import { api, ApiClientError, buildQueryString } from '@/lib/api-client'
import { GRADE_LEVELS, type StudentDto, type StudentListResponse } from '@/types/school'
import { AvatarInitials, EmptyState, ErrorAlert, formatDate, TableSkeleton } from './shared'
import { downloadReportCardPdf } from './report-card-pdf'

interface StudentFormValues {
  name: string
  email: string
  password: string
  gradeLevel: string
  dateOfBirth: string
}

const PAGE_SIZE = 8

export function StudentsView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)

  // Debounce the search box.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const studentsQuery = useQuery({
    queryKey: ['students', search, page],
    queryFn: () =>
      api.get<StudentListResponse>(
        `/api/students${buildQueryString({ search, page, pageSize: PAGE_SIZE })}`,
      ),
  })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StudentDto | null>(null)
  const [deleting, setDeleting] = React.useState<StudentDto | null>(null)
  const [reportStudent, setReportStudent] = React.useState<StudentDto | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      const payload = {
        name: values.name,
        email: values.email,
        gradeLevel: values.gradeLevel,
        dateOfBirth: values.dateOfBirth === '' ? null : values.dateOfBirth,
        ...(values.password !== '' ? { password: values.password } : {}),
      }
      if (editing) return api.put<StudentDto>(`/api/students/${editing.id}`, payload)
      return api.post<StudentDto>('/api/students', payload)
    },
    onSuccess: (student) => {
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFormOpen(false)
      toast({
        title: editing ? 'Student updated' : 'Student created',
        description: `${student.name} was saved successfully.`,
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save student',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (student: StudentDto) => api.delete(`/api/students/${student.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleting(null)
      toast({ title: 'Student removed', description: 'The student and related records were deleted.' })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete student',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  React.useEffect(() => {
    if (!reportStudent) return
    let cancelled = false
    ;(async () => {
      try {
        const report = await api.get<import('@/types/school').ReportCard>(`/api/reports/${reportStudent.id}`)
        await downloadReportCardPdf(report)
        if (!cancelled) toast({ title: 'Report card downloaded', description: `PDF for ${reportStudent.name} has been generated.` })
      } catch (error) {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Could not generate report card',
            description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
          })
        }
      } finally {
        if (!cancelled) setReportStudent(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reportStudent, toast])

  const data = studentsQuery.data
  const total = data?.total ?? 0
  const currentPage = data?.page ?? 1
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(total, (currentPage - 1) * PAGE_SIZE + (data?.students.length ?? 0))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or grade…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search students"
          />
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Add student
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {studentsQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={PAGE_SIZE} cols={5} />
            </div>
          ) : studentsQuery.isError ? (
            <div className="p-4">
              <ErrorAlert
                message={studentsQuery.error instanceof ApiClientError ? studentsQuery.error.message : 'Failed to load students.'}
                onRetry={() => void studentsQuery.refetch()}
              />
            </div>
          ) : data && data.students.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title={search ? 'No students match your search' : 'No students yet'}
                description={search ? `Nothing found for "${search}". Try a different search term.` : 'Create your first student to get started.'}
                action={
                  search ? (
                    <Button variant="outline" onClick={() => setSearchInput('')}>
                      Clear search
                    </Button>
                  ) : (
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add student
                    </Button>
                  )
                }
              />
            </div>
          ) : data ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Grade level</TableHead>
                    <TableHead className="hidden lg:table-cell">Date of birth</TableHead>
                    <TableHead className="hidden sm:table-cell">Courses</TableHead>
                    <TableHead className="hidden xl:table-cell">Joined</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={student.name} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{student.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{student.gradeLevel}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(student.dateOfBirth)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm tabular-nums">{student.enrollmentCount}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{formatDate(student.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Actions for ${student.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Student actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setReportStudent(student)}>
                              <FileText className="mr-2 h-4 w-4" /> Report card (PDF)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(student)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(student)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Showing {from}–{to} of {total} {total === 1 ? 'student' : 'students'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || studentsQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages || studentsQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <StudentFormDialog
        open={formOpen}
        editing={editing}
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
              This permanently removes the student account, their enrollments, attendance history and grades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleting && deleteMutation.mutate(deleting)}
            >
              Delete student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StudentFormDialog({
  open,
  editing,
  submitting,
  onOpenChange,
  onSubmit,
  serverError,
}: {
  open: boolean
  editing: StudentDto | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: StudentFormValues) => void
  serverError: ApiClientError | null
}) {
  const [values, setValues] = React.useState<StudentFormValues>({
    name: '',
    email: '',
    password: '',
    gradeLevel: 'Grade 9',
    dateOfBirth: '',
  })
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof StudentFormValues, string>>>({})

  React.useEffect(() => {
    if (open) {
      setValues({
        name: editing?.name ?? '',
        email: editing?.email ?? '',
        password: '',
        gradeLevel: editing?.gradeLevel ?? 'Grade 9',
        dateOfBirth: editing?.dateOfBirth ?? '',
      })
      setFieldErrors({})
    }
  }, [open, editing])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Partial<Record<keyof StudentFormValues, string>> = {}
    if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.'
    if (!editing && values.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (editing && values.password !== '' && values.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (!values.gradeLevel) errors.gradeLevel = 'Choose a grade level.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a new student'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the student profile. Leave the password blank to keep the current one.'
              : 'A student account will be created with the role STUDENT.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-name">Full name</Label>
              <Input
                id="student-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Brian Otieno"
              />
              {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-email">Email</Label>
              <Input
                id="student-email"
                type="email"
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                placeholder="student@school.edu"
              />
              {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-grade">Grade level</Label>
              <Select value={values.gradeLevel} onValueChange={(grade) => setValues((v) => ({ ...v, gradeLevel: grade }))}>
                <SelectTrigger id="student-grade">
                  <SelectValue placeholder="Choose grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.gradeLevel ? <p className="text-xs text-destructive">{fieldErrors.gradeLevel}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-dob">Date of birth</Label>
              <Input
                id="student-dob"
                type="date"
                value={values.dateOfBirth}
                onChange={(e) => setValues((v) => ({ ...v, dateOfBirth: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-password">{editing ? 'New password (optional)' : 'Password'}</Label>
              <Input
                id="student-password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'}
              />
              {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
            </div>
          </div>

          {serverError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{serverError.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
