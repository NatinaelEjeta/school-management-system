'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { api, ApiClientError } from '@/lib/api-client'
import type { ReportCard } from '@/types/school'
import { EmptyState, ErrorAlert, formatDate, formatPercent, PercentBar, TableSkeleton } from './shared'
import { downloadReportCardPdf } from './report-card-pdf'

export function ReportCardView({ studentId }: { studentId: number | null }) {
  const { toast } = useToast()
  const [downloading, setDownloading] = React.useState(false)

  const reportQuery = useQuery({
    queryKey: ['report-card', studentId],
    queryFn: () => api.get<ReportCard>(`/api/reports/${studentId}`),
    enabled: studentId !== null,
  })

  if (studentId === null) {
    return <EmptyState icon={FileText} title="No student profile" description="This account is not linked to a student record." />
  }

  if (reportQuery.isLoading) {
    return <TableSkeleton rows={8} cols={5} />
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <ErrorAlert
        message={reportQuery.error instanceof ApiClientError ? reportQuery.error.message : 'Failed to load your report card.'}
        onRetry={() => void reportQuery.refetch()}
      />
    )
  }

  const report = reportQuery.data

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadReportCardPdf(report)
      toast({ title: 'Report card downloaded', description: 'Your PDF report card has been generated.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not generate PDF',
        description: 'Something went wrong while creating your report card. Please try again.',
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Report card — {report.student.name}</CardTitle>
            <CardDescription>
              {report.student.gradeLevel} · {report.courses.length} courses · generated {formatDate(report.generatedAt)}
            </CardDescription>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" /> {downloading ? 'Generating PDF…' : 'Download PDF'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Overall average</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPercent(report.overallAveragePercent)}</p>
              <PercentBar className="mt-2" value={report.overallAveragePercent} />
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Attendance rate</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPercent(report.attendance.rate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.attendance.present} present · {report.attendance.late} late · {report.attendance.absent} absent
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="mt-1 truncate text-sm font-medium">{report.student.name}</p>
              <p className="truncate text-xs text-muted-foreground">{report.student.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">DOB: {formatDate(report.student.dateOfBirth)}</p>
            </div>
          </div>

          {report.courses.length === 0 ? (
            <EmptyState icon={FileText} title="No courses enrolled" description="Enroll in courses to build your report card." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="hidden sm:table-cell">Teacher</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Assessments</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Attendance</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.courses.map((course) => (
                  <TableRow key={course.courseId}>
                    <TableCell className="text-sm font-medium">{course.courseName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{course.teacherName ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm tabular-nums">{course.grades.length}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                      {course.attendance.present + course.attendance.late}/{course.attendance.present + course.attendance.late + course.attendance.absent}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold tabular-nums">{formatPercent(course.averagePercent)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
