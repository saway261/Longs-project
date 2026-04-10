"use client"

import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { getRoleLabel } from "@/src/lib/role-labels"

type UserInfo = { name: string; role: string }

type Notification = {
  id: number
  text: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, text: "今月のデータが未アップロードです", read: false },
  { id: 2, text: "仕入れ先への支払い期限が3日後に迫っています", read: false },
  { id: 3, text: "在庫アラート：SKU-0042 の在庫が残り5点です", read: false },
]

export function Header({ user }: { user: UserInfo }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasUnread = notifications.some((n) => !n.read)

  const markRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-end">
      <div className="flex items-center gap-4">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="通知"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-80 bg-white border border-border rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">通知</p>
              </div>
              <ul className="divide-y divide-border max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={n.read}
                      onChange={() => markRead(n.id)}
                      className="mt-0.5 h-4 w-4 accent-primary cursor-pointer shrink-0"
                    />
                    <span
                      className={`text-sm leading-snug ${
                        n.read ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {n.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{user.name || "（名前未設定）"}</span>
          <span className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</span>
        </div>
      </div>
    </header>
  )
}
