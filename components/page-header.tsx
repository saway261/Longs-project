"use client"

import { type LucideIcon } from "lucide-react"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  icon?: LucideIcon
}

export function PageHeader({ eyebrow, title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        {Icon && <Icon className="w-6 h-6 text-[#345fe1]" />}
        {title}
      </h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
