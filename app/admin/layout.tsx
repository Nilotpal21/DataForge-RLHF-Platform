import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import Nav from '@/components/Nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <Nav role="admin" email={user.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
