"use client"

import { Sidebar, Header } from "@/components/sidebar"

type AppShellProps = {
  children: React.ReactNode
  user: { name: string; role: string }
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        <Header user={user} />
        <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">{children}</main>
      </div>
    </div>
  )
}
