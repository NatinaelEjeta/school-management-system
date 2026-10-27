import type { ReportCard } from '@/types/school'
import { formatDate } from './shared'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatGenerated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function scoreText(score: number): string {
  return Number.isInteger(score) ? `${score}` : score.toFixed(2)
}

/**
 * Builds and downloads a student's report card as an A4 PDF.
 * jsPDF + jspdf-autotable are loaded dynamically to keep the initial bundle small.
 */
export async function downloadReportCardPdf(report: ReportCard): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ---- Header band ----
  doc.setFillColor(5, 122, 85) // emerald-700
  doc.rect(0, 0, pageWidth, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('Greenfield Academy', 14, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Student Report Card', 14, 21)
  doc.setFontSize(9)
  doc.text(`Generated ${formatGenerated(report.generatedAt)}`, pageWidth - 14, 21, { align: 'right' })

  // ---- Student summary ----
  const student = report.student
  const overall = report.overallAveragePercent === null ? '—' : `${report.overallAveragePercent.toFixed(1)}%`
  const attendanceRate = `${report.attendance.rate.toFixed(1)}%`

  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(student.name, 14, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`Email: ${student.email}`, 14, 48)
  doc.text(`Grade level: ${student.gradeLevel}`, 14, 53)
  doc.text(`Date of birth: ${formatDate(student.dateOfBirth)}`, 14, 58)

  doc.setTextColor(90, 90, 90)
  doc.text('Overall average:', pageWidth - 90, 48, { align: 'right' })
  doc.text('Attendance rate:', pageWidth - 90, 53, { align: 'right' })
  doc.text('Courses enrolled:', pageWidth - 90, 58, { align: 'right' })
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.text(overall, pageWidth - 14, 48, { align: 'right' })
  doc.text(attendanceRate, pageWidth - 14, 53, { align: 'right' })
  doc.text(`${report.courses.length}`, pageWidth - 14, 58, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  // ---- Course summary table ----
  const summaryRows = report.courses.map((course) => [
    course.courseName,
    course.teacherName ?? 'Unassigned',
    `${course.grades.length}`,
    `${course.attendance.present + course.attendance.late}/${course.attendance.present + course.attendance.late + course.attendance.absent}`,
    course.averagePercent === null ? '—' : `${course.averagePercent.toFixed(1)}%`,
  ])

  autoTable(doc, {
    startY: 66,
    head: [['Course', 'Teacher', 'Assessments', 'Days attended', 'Average']],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.4 },
    headStyles: { fillColor: [5, 122, 85], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 246] },
    margin: { left: 14, right: 14 },
  })

  // ---- Assessment details table ----
  let cursorY = getLastAutoTableFinalY(doc) + 10
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  if (cursorY > 240) {
    doc.addPage()
    cursorY = 20
  }
  doc.text('Assessment details', 14, cursorY)
  doc.setFont('helvetica', 'normal')

  const detailRows: string[][] = []
  for (const course of report.courses) {
    for (const grade of course.grades) {
      detailRows.push([
        course.courseName,
        grade.assessmentName,
        scoreText(grade.score),
        scoreText(grade.maxScore),
        `${grade.percent.toFixed(1)}%`,
      ])
    }
    if (course.grades.length === 0) {
      detailRows.push([course.courseName, 'No assessments recorded yet', '—', '—', '—'])
    }
  }

  autoTable(doc, {
    startY: cursorY + 4,
    head: [['Course', 'Assessment', 'Score', 'Max', 'Percent']],
    body: detailRows.length > 0 ? detailRows : [['—', 'No grades recorded', '—', '—', '—']],
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  })

  // ---- Attendance summary + signature lines ----
  cursorY = getLastAutoTableFinalY(doc) + 12
  if (cursorY > 245) {
    doc.addPage()
    cursorY = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Attendance summary', 14, cursorY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Present: ${report.attendance.present}   ·   Late: ${report.attendance.late}   ·   Absent: ${report.attendance.absent}   ·   Attendance rate: ${attendanceRate}`,
    14,
    cursorY + 6,
  )

  const signY = Math.min(cursorY + 26, 275)
  doc.setDrawColor(160, 160, 160)
  doc.line(20, signY, 80, signY)
  doc.line(pageWidth - 80, signY, pageWidth - 20, signY)
  doc.setTextColor(90, 90, 90)
  doc.text('Class teacher', 20, signY + 5)
  doc.text('Principal', pageWidth - 80, signY + 5)

  doc.save(`report-card-${student.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}

/** jspdf-autotable tracks the final Y position on the doc instance. */
function getLastAutoTableFinalY(doc: jsPDFDoc): number {
  const withTable = doc as unknown as { lastAutoTable?: { finalY: number } }
  return withTable.lastAutoTable?.finalY ?? 60
}

type jsPDFDoc = import('jspdf').jsPDF
