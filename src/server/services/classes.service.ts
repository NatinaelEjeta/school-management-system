import { db } from '@/lib/db'
import type { ClassDto } from '@/types/school'

export async function listClasses(): Promise<ClassDto[]> {
  const classes = await db.schoolClass.findMany({
    include: { homeroomTeacher: { include: { user: true } }, _count: { select: { students: true } } },
    orderBy: { name: 'asc' },
  })
  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    gradeLevel: c.gradeLevel,
    homeroomTeacherId: c.homeroomTeacherId,
    homeroomTeacherName: c.homeroomTeacher?.user.name ?? null,
    studentCount: c._count.students,
  }))
}