'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, ClipboardCheck, GraduationCap, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, ApiClientError } from '@/lib/api-client'
import type { DashboardStats } from '@/types/school'
import { EmptyState, ErrorAlert, PercentBar, StatCard, formatPercent, TableSkeleton } from './shared'

const ATTENDANCE_COLORS = {
  PRESENT: '#059669',
  LATE: '#f59e0b',
  ABSENT: '#e11d48',
}

export function DashboardView() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard'),
  })

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TableSkeleton key={i} rows={1} cols={1} />
          ))}
        </div>
        <TableSkeleton rows={8} cols={6} />
      </div>
    )
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <ErrorAlert
        message={dashboardQuery.error instanceof ApiClientError ? dashboardQuery.error.message : 'Failed to load dashboard statistics.'}
        onRetry={() => void dashboardQuery.refetch()}
      />
    )
  }

  const stats = dashboardQuery.data
  const chartData = stats.avgGradePerCourse.map((course) => ({
    name: course.courseName.length > 14 ? `${course.courseName.slice(0, 13)}…` : course.courseName,
    fullName: course.courseName,
    average: course.averagePercent ?? 0,
    hasGrades: course.averagePercent !== null,
  }))
  const hasAnyGrades = stats.avgGradePerCourse.some((course) => course.averagePercent !== null)
  const hasAnyAttendance = stats.attendance.total > 0

  const attendancePieData = [
    { name: 'Present', value: stats.attendance.present, key: 'PRESENT' as const },
    { name: 'Late', value: stats.attendance.late, key: 'LATE' as const },
    { name: 'Absent', value: stats.attendance.absent, key: 'ABSENT' as const },
  ].filter((slice) => slice.value > 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={stats.totalStudents} icon={Users} tone="emerald" hint={`${stats.totalEnrollments} course enrollments`} />
        <StatCard label="Total teachers" value={stats.totalTeachers} icon={GraduationCap} tone="amber" />
        <StatCard label="Total courses" value={stats.totalCourses} icon={BookOpen} tone="rose" />
        <StatCard
          label="Attendance rate"
          value={formatPercent(stats.attendance.rate)}
          icon={ClipboardCheck}
          tone="violet"
          hint={`${stats.attendance.present + stats.attendance.late} attended of ${stats.attendance.total} records`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average grade per course</CardTitle>
            <CardDescription>Weighted average (total score ÷ total max score) across all assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasAnyGrades ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.25} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.7 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      stroke="currentColor"
                      strokeOpacity={0.4}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.7 }} stroke="currentColor" strokeOpacity={0.4} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Average']}
                      labelFormatter={(label) => {
                        const match = chartData.find((c) => c.name === label)
                        return match?.fullName ?? `${label}`
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                      }}
                    />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {chartData.map((entry) => (
                        <Cell key={entry.fullName} fill={entry.hasGrades ? (entry.average >= 75 ? '#059669' : entry.average >= 50 ? '#f59e0b' : '#e11d48') : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="No grades recorded yet" description="Average grades per course will appear here once teachers start recording assessments." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance breakdown</CardTitle>
            <CardDescription>All attendance records across the school.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasAnyAttendance ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attendancePieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                      {attendancePieData.map((slice) => (
                        <Cell key={slice.key} fill={ATTENDANCE_COLORS[slice.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} records`, '']}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={ClipboardCheck} title="No attendance yet" description="The breakdown will appear once attendance is recorded." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Courses overview</CardTitle>
          <CardDescription>Enrollment size and average grade per course.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.avgGradePerCourse.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Create courses to see them listed here." />
          ) : (
            stats.avgGradePerCourse.map((course) => (
              <div key={course.courseId} className="grid items-center gap-2 sm:grid-cols-[1fr_7rem_10rem]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{course.courseName}</p>
                  <p className="text-xs text-muted-foreground">{course.studentCount} students</p>
                </div>
                <p className="text-sm tabular-nums text-muted-foreground sm:text-right">
                  {course.studentCount} enrolled
                </p>
                <PercentBar value={course.averagePercent} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
