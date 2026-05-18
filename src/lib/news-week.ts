/**
 * 週境界ユーティリティ（Asia/Tokyo基準、日曜日始まり）
 */

/** Asia/Tokyo の日曜日 00:00 を返す */
export function getWeekStart(date: Date): Date {
  // Asia/Tokyo の現在日時を取得
  const tokyoStr = date.toLocaleString("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  // "YYYY-MM-DD" 形式
  const [year, month, day] = tokyoStr.split("-").map(Number)
  const tokyoDate = new Date(year, month - 1, day)
  const dayOfWeek = tokyoDate.getDay() // 0=日, 1=月, ...6=土
  tokyoDate.setDate(tokyoDate.getDate() - dayOfWeek)
  // UTC として返す（weekStart はDateカラムとして保存するため）
  return new Date(Date.UTC(tokyoDate.getFullYear(), tokyoDate.getMonth(), tokyoDate.getDate()))
}

/** 同週の土曜 23:59:59 を返す */
export function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

/** 「3/22〜3/28」または「今週 (3/22〜3/28)」 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart)
  const startStr = `${weekStart.getUTCMonth() + 1}/${weekStart.getUTCDate()}`
  const endStr = `${weekEnd.getUTCMonth() + 1}/${weekEnd.getUTCDate()}`
  const range = `${startStr}〜${endStr}`
  if (isCurrentWeek(weekStart)) {
    return `今週 (${range})`
  }
  return range
}

/** 指定の weekStart が今週かどうか */
export function isCurrentWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart(new Date())
  return weekStart.getTime() === currentWeekStart.getTime()
}
