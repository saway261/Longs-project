"use client"

import { Sidebar, Header } from "@/components/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        <Header />
        <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">{children}</main>
      </div>
    </div>
  )
}
