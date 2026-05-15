'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    router.push('/')
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
    >
      {label}
    </button>
  )
}
