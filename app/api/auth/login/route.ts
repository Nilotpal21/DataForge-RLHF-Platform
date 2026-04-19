import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const db = await getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    })

    const user = result.rows[0] as unknown as {
      id: number
      email: string
      password_hash: string
      role: 'admin' | 'annotator' | 'qa'
      quality_score: number
    } | undefined

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      userId: Number(user.id),
      email: String(user.email),
      role: String(user.role) as 'admin' | 'annotator' | 'qa',
    })

    const response = NextResponse.json({
      user: {
        id: Number(user.id),
        email: user.email,
        role: user.role,
        quality_score: user.quality_score,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
