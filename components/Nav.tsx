'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
}

type NavProps = {
  role: 'admin' | 'annotator' | 'qa'
  email: string
}

function AdminIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function QueueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: <AdminIcon /> },
    { href: '/admin/tasks/new', label: 'New Task', icon: <TasksIcon /> },
    { href: '/admin/export', label: 'Export Data', icon: <ExportIcon /> },
  ],
  annotator: [
    { href: '/annotator', label: 'Task Queue', icon: <QueueIcon /> },
  ],
  qa: [
    { href: '/qa', label: 'Review Queue', icon: <ReviewIcon /> },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  annotator: 'Annotator',
  qa: 'QA Reviewer',
}

export default function Nav({ role, email }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const items = NAV_ITEMS[role] || []

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="w-60 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">DataForge</div>
            <div className="text-gray-500 text-xs">RLHF Platform</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-gray-800">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          role === 'admin' ? 'bg-purple-900/50 text-purple-300' :
          role === 'annotator' ? 'bg-blue-900/50 text-blue-300' :
          'bg-green-900/50 text-green-300'
        }`}>
          {ROLE_LABELS[role]}
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/annotator' && item.href !== '/qa' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-gray-300 text-xs font-medium">
              {email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-300 text-xs truncate">{email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </nav>
  )
}
