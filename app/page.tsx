import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role === 'admin') redirect('/admin')
  if (user.role === 'annotator') redirect('/annotator')
  if (user.role === 'qa') redirect('/qa')

  redirect('/login')
}
