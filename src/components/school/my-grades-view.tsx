'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, BookOpen, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, ApiClientError } from '@/lib/api-client'
import type { MyGradesResponse } from '@/types/school'
import { EmptyState, ErrorAlert, formatDate, formatPercent, PercentBar, StatCard, TableSkeleton } from './shared'
import { cn } from '@/lib/utils'

export function MyGradesView() {
  const gradesQuery = useQuery({
    queryKey: ['my-grades'],
    queryFn: () => api.get<MyGradesResponse>('/api/grades/me'),
  })

  if (gradesQuery.isLoading) {
    return <TableSkeleton rows={8} cols={5} />
  }

  if (gradesQuery.isError || !gradesQuery.data) {
    return (
      <ErrorAlert
        message={gradesQuery.error instanceof ApiClientError ? gradesQuery.error.message : 'Failed to load your grades.'}
        onRetry={() => void gradesQuery.refetch()}
      />
    )
  }

  const data = gradesQuery.data
  const gradedCourses = data.courses.filter((course) => course.grades.length > 0)

  if (data.courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No courses yet"
        description="You are not enrolled in any courses. Your grades will appear here once you are enrolled and teachers record assessments."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Overall average"
          value={formatPercent(data.overallAveragePercent)}
          icon={BarChart3}
          tone="emerald"
          hint="Weighted across all courses"
        />
        <StatCard label="Courses enrolled" value={data.courses.length} icon={BookOpen} tone="rose" />
        <StatCard label="Assessments taken" value={data.totalAssessments} icon={ClipboardList} tone="amber" hint={`${gradedCourses.length} courses with grades`} />
      </div>

      {gradedCourses.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No grades recorded yet" description="Teachers have not recorded any assessments for your courses so far." />
      ) : (
        data.courses.map((course) => (
          <Card key={course.courseId}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{course.courseName}</CardTitle>
                  <CardDescription>
                    {course.teacherName ? `Teacher: ${course.teacherName}` : 'No teacher assigned'} · {course.grades.length}{' '}
                    {course.grades.length === 1 ? 'assessment' : 'assessments'}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    'text-lg font-semibold tabular-nums',
                    course.averagePercent === null
                      ? 'text-muted-foreground'
                      : course.averagePercent >= 75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : course.averagePercent >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {formatPercent(course.averagePercent)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              {course.grades.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No assessments recorded for this course yet.</p>
              ) : (
                <>
                  <div className="px-6">
                    <PercentBar value={course.averagePercent} />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Percent</TableHead>
                        <TableHead className="hidden md:table-cell">Recorded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {course.grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="text-sm font-medium">{grade.assessmentName}</TableCell>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
