import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/server/errors'
import { readJsonBody } from '@/server/http'
import { requireRole } from '@/server/middleware/auth'
import { createFamily, deleteFamily, getFamily, listFamilies, updateFamily } from '@/server/services/families.service'
import { familyCreateSchema, familyUpdateSchema } from '@/server/validation'

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid family id.')
  return id
}

export async function handleListFamilies(req: NextRequest): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  return NextResponse.json(await listFamilies(search))
}

export async function handleCreateFamily(req: NextRequest): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const input = familyCreateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await createFamily(input), { status: 201 })
}

export async function handleGetFamily(req: NextRequest, id: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  return NextResponse.json(await getFamily(parseId(id)))
}

export async function handleUpdateFamily(req: NextRequest, id: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const input = familyUpdateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await updateFamily(parseId(id), input))
}

export async function handleDeleteFamily(req: NextRequest, id: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  await deleteFamily(parseId(id))
  return NextResponse.json({ message: 'Family deleted. Its students were kept.' })
}