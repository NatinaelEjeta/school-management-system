import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { nextFamilyCode, withCodeRetry } from '@/server/services/codes'
import type { FamilyCreateInput, FamilyUpdateInput } from '@/server/validation'
import type { FamilyDto } from '@/types/school'

const familyInclude = {
  students: { include: { user: true }, orderBy: { user: { name: 'asc' } } },
} satisfies Prisma.FamilyInclude

type FamilyWithStudents = Prisma.FamilyGetPayload<{ include: typeof familyInclude }>

function toFamilyDto(family: FamilyWithStudents): FamilyDto {
  return {
    id: family.id,
    familyCode: family.familyCode,
    familyName: family.familyName,
    guardianName: family.guardianName,
    guardianPhone: family.guardianPhone,
    guardianEmail: family.guardianEmail,
    address: family.address,
    studentCount: family.students.length,
    students: family.students.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.user.name,
      gradeLevel: s.gradeLevel,
    })),
    createdAt: family.createdAt.toISOString(),
  }
}

export async function listFamilies(search: string): Promise<FamilyDto[]> {
  const where: Prisma.FamilyWhereInput = search
    ? {
        OR: [
          { familyCode: { contains: search, mode: 'insensitive' } },
          { familyName: { contains: search, mode: 'insensitive' } },
          { guardianName: { contains: search, mode: 'insensitive' } },
          { guardianPhone: { contains: search } },
        ],
      }
    : {}
  const families = await db.family.findMany({ where, include: familyInclude, orderBy: { familyName: 'asc' } })
  return families.map(toFamilyDto)
}

export async function getFamily(id: number): Promise<FamilyDto> {
  const family = await db.family.findUnique({ where: { id }, include: familyInclude })
  if (!family) throw new ApiError(404, 'Family not found.')
  return toFamilyDto(family)
}

export async function createFamily(input: FamilyCreateInput): Promise<FamilyDto> {
  const family = await withCodeRetry(async () =>
    db.family.create({
      data: {
        familyCode: await nextFamilyCode(),
        familyName: input.familyName,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail ?? null,
        address: input.address ?? null,
      },
      include: familyInclude,
    }),
  )
  return toFamilyDto(family)
}

export async function updateFamily(id: number, input: FamilyUpdateInput): Promise<FamilyDto> {
  const existing = await db.family.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Family not found.')
  const family = await db.family.update({
    where: { id },
    data: {
      ...(input.familyName !== undefined ? { familyName: input.familyName } : {}),
      ...(input.guardianName !== undefined ? { guardianName: input.guardianName } : {}),
      ...(input.guardianPhone !== undefined ? { guardianPhone: input.guardianPhone } : {}),
      ...(input.guardianEmail !== undefined ? { guardianEmail: input.guardianEmail ?? null } : {}),
      ...(input.address !== undefined ? { address: input.address ?? null } : {}),
    },
    include: familyInclude,
  })
  return toFamilyDto(family)
}

/** Deleting a family keeps its students; their familyId is set to null. */
export async function deleteFamily(id: number): Promise<void> {
  const existing = await db.family.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Family not found.')
  await db.family.delete({ where: { id } })
}