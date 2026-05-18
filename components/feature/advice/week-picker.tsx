"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatWeekRange, getWeekStart, isCurrentWeek } from "@/src/lib/news-week"

interface WeekPickerProps {
  weekStart: Date
  onChange: (weekStart: Date) => void
}

export function WeekPicker({ weekStart, onChange }: WeekPickerProps) {
  const currentWeekStart = getWeekStart(new Date())
  const isThisWeek = isCurrentWeek(weekStart)

  function goPrev() {
    const prev = new Date(weekStart)
    prev.setUTCDate(prev.getUTCDate() - 7)
    onChange(prev)
  }

  function goNext() {
    if (isThisWeek) return
    const next = new Date(weekStart)
    next.setUTCDate(next.getUTCDate() + 7)
    // 未来週は無効化
    if (next.getTime() > currentWeekStart.getTime()) return
    onChange(next)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goPrev} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center">
        {formatWeekRange(weekStart)}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={isThisWeek}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
