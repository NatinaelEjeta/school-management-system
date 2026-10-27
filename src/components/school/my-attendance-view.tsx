'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, ApiClientError } from '@/lib/api-client'
import type { MyAttendanceResponse } from '@/types/school'
import { EmptyState, ErrorAlert, formatDate, formatPercent, PercentBar, StatCard, StatusBadge, TableSkeleton } from './shared'

export function MyAttendanceView() {
  const attendanceQuery = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => api.get<MyAttendanceResponse>('/api/attendance/me'),
  })

  if (attendanceQuery.isLoading) {
    return <TableSkeleton rows={8} cols={5} />
  }

  if (attendanceQuery.isError || !attendanceQuery.data) {
    return (
      <ErrorAlert
        message={attendanceQuery.error instanceof ApiClientError ? attendanceQuery.error.message : 'Failed to load your attendance.'}
        onRetry={() => void attendanceQuery.refetch()}
      />
    )
  }

  const data = attendanceQuery.data
  if (data.overall.total === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No attendance recorded yet"
        description="Your attendance summary will appear here once teachers start taking attendance in your courses."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance rate" value={formatPercent(data.overall.rate)} icon={CalendarDays} tone="emerald" hint="Present or late counts as attended" />
        <StatCard label="Days present" value={data.overall.present} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Days late" value={data.overall.late} icon={Clock} tone="amber" />
        <StatCard label="Days absent" value={data.overall.absent} icon={XCircle} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance by course</CardTitle>
            <CardDescription>Your attendance record in each enrolled course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.byCourse.map((course) => (
              <div key={course.courseId} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem_8rem]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{course.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.present} present · {course.late} late · {course.absent} absent
                  </p>
                </div>
                <p className="hidden text-xs text-muted-foreground sm:block sm:text-right">{course.total} sessions</p>
                <PercentBar value={course.rate} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent records</CardTitle>
            <CardDescription>Your latest attendance entries, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm tabular-nums">{formatDate(record.date)}</TableCell>
                        <TableCell className="text-sm">{record.courseName}</TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={record.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
