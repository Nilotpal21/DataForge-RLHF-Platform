import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const result = await db.execute({
    sql: 'SELECT id, email, role, quality_score, created_at FROM users WHERE id = ?',
    args: [authUser.userId],
  })

  const user = result.rows[0]
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('token')
  return response
}
