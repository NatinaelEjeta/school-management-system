'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, MoreHorizontal, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { api, ApiClientError, buildQueryString } from '@/lib/api-client'
import type { TeacherDto } from '@/types/school'
import { AvatarInitials, EmptyState, ErrorAlert, formatDate, TableSkeleton } from './shared'

interface TeacherFormValues {
  name: string
  email: string
  password: string
}

export function TeachersView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TeacherDto | null>(null)
  const [deleting, setDeleting] = React.useState<TeacherDto | null>(null)

  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const teachersQuery = useQuery({
    queryKey: ['teachers', search],
    queryFn: () => api.get<TeacherDto[]>(`/api/teachers${buildQueryString({ search })}`),
  })

  const saveMutation = useMutation({
    mutationFn: (values: TeacherFormValues) => {
      const payload = {
        name: values.name,
        email: values.email,
        ...(values.password !== '' ? { password: values.password } : {}),
      }
      if (editing) return api.put<TeacherDto>(`/api/teachers/${editing.id}`, payload)
      return api.post<TeacherDto>('/api/teachers', { ...payload, password: values.password })
    },
    onSuccess: (teacher) => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFormOpen(false)
      setEditing(null)
      toast({ title: editing ? 'Teacher updated' : 'Teacher created', description: `${teacher.name} was saved successfully.` })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save teacher',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (teacher: TeacherDto) => api.delete(`/api/teachers/${teacher.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleting(null)
      toast({
        title: 'Teacher removed',
        description: 'Their courses are kept and will show as unassigned.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete teacher',
        description: error instanceof ApiClientError ? error.message : 'Unexpected error. Please try again.',
      })
    },
  })

  const teachers = teachersQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teachers…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search teachers"
          />
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Add teacher
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {teachersQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : teachersQuery.isError ? (
            <div className="p-4">
              <ErrorAlert
                message={teachersQuery.error instanceof ApiClientError ? teachersQuery.error.message : 'Failed to load teachers.'}
                onRetry={() => void teachersQuery.refetch()}
              />
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={GraduationCap}
                title={search ? 'No teachers match your search' : 'No teachers yet'}
                description={search ? `Nothing found for "${search}".` : 'Add your first teacher to start assigning courses.'}
                action={
                  search ? (
                    <Button variant="outline" onClick={() => setSearchInput('')}>
                      Clear search
                    </Button>
                  ) : (
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add teacher
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="hidden sm:table-cell">Courses</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={teacher.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{teacher.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm tabular-nums">{teacher.courseCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(teacher.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Actions for ${teacher.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Teacher actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(teacher)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(teacher)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeacherFormDialog
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
              This removes the teacher account. Courses they taught remain, but will show as unassigned until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => deleting && deleteMutation.mutate(deleting)}>
              Delete teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TeacherFormDialog({
  open,
  editing,
  submitting,
  onOpenChange,
  onSubmit,
  serverError,
}: {
  open: boolean
  editing: TeacherDto | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TeacherFormValues) => void
  serverError: ApiClientError | null
}) {
  const [values, setValues] = React.useState<TeacherFormValues>({ name: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof TeacherFormValues, string>>>({})

  React.useEffect(() => {
    if (open) {
      setValues({ name: editing?.name ?? '', email: editing?.email ?? '', password: '' })
      setFieldErrors({})
    }
  }, [open, editing])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Partial<Record<keyof TeacherFormValues, string>> = {}
    if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.'
    if (!editing && values.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (editing && values.password !== '' && values.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a new teacher'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the teacher profile. Leave the password blank to keep the current one.' : 'A teacher account will be created with the role TEACHER.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="teacher-name">Full name</Label>
            <Input
              id="teacher-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Grace Mwangi"
            />
            {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-email">Email</Label>
            <Input
              id="teacher-email"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              placeholder="teacher@school.edu"
            />
            {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-password">{editing ? 'New password (optional)' : 'Password'}</Label>
            <Input
              id="teacher-password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'}
            />
            {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
          </div>

          {serverError ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{serverError.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create teacher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
