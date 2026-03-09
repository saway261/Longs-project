"use client"

import type React from "react"

import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import {
  Upload,
  Sparkles,
  ImageIcon,
  Download,
  Check,
  Clock,
  Trash2,
  Palette,
  Type,
  Crop,
  ImagePlus,
  Code,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  generateDesignImageAction,
  getDesignAssetsAction,
  deleteDesignAssetAction,
} from "@/src/actions/design-actions"
import { toast } from "sonner"

interface DesignStudioProps {
  initialType?: "pop" | "poster"
  showHistory?: boolean
}
 
const colorPalette = [
  { name: "ホワイト", hex: "#ffffff" },
  { name: "ネイビー", hex: "#1e3a5f" },
  { name: "ロイヤルブルー", hex: "#345fe1" },
  { name: "ペールブルー", hex: "#bfdbfe" },
  { name: "スカイブルー", hex: "#4a90a4" },
  { name: "ティール", hex: "#2dd4bf" },
  { name: "ミント", hex: "#a7f3d0" },
  { name: "エメラルド", hex: "#10b981" },
  { name: "フォレスト", hex: "#22c55e" },
  { name: "ライム", hex: "#84cc16" },
  { name: "イエロー", hex: "#fbbf24" },
  { name: "オレンジ", hex: "#f97316" },
  { name: "コーラル", hex: "#fb7185" },
  { name: "レッド", hex: "#ef4444" },
  { name: "ピンク", hex: "#ec4899" },
  { name: "ライトピンク", hex: "#fbcfe8" },
  { name: "パープル", hex: "#a855f7" },
  { name: "バイオレット", hex: "#8b5cf6" },
  { name: "インディゴ", hex: "#6366f1" },
  { name: "アイボリー", hex: "#fff7e6" },
  { name: "ベージュ", hex: "#f5e6d3" },
  { name: "ブラウン", hex: "#92400e" },
  { name: "ライトグレー", hex: "#e5e7eb" },
  { name: "グレー", hex: "#6b7280" },
  { name: "スレート", hex: "#475569" },
  { name: "ブラック", hex: "#171717" },
]

const isLightColor = (hex: string) => {
  const normalized = hex.replace("#", "")
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized
  if (full.length !== 6) return false
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

const styleMapEN: Record<string, string> = {
  modern: "modern minimalist design, clean lines, geometric shapes",
  retro: "retro vintage design, nostalgic colors, classic typography",
  street: "street urban design, graffiti style, bold graphics",
  elegant: "elegant luxury design, sophisticated, refined aesthetics",
  casual: "casual friendly design, warm, approachable",
  sporty: "sporty dynamic design, energetic, athletic vibe",
}

const styles = [
  { id: "modern", name: "モダン", image: "/generate-styles/modern.jpg" },
  { id: "retro", name: "レトロ", image: "/generate-styles/retro.jpg" },
  { id: "street", name: "ストリート", image: "/generate-styles/street.jpg" },
  { id: "elegant", name: "エレガント", image: "/generate-styles/elegant.jpg" },
  { id: "casual", name: "カジュアル", image: "/generate-styles/casual.jpg" },
  { id: "sporty", name: "スポーティー", image: "/generate-styles/sporty.jpg" },
]

const aspectRatios = [
  { id: "1:1", label: "1:1", desc: "正方形" },
  { id: "9:16", label: "9:16", desc: "縦長" },
  { id: "4:5", label: "4:5", desc: "SNS向け" },
  { id: "16:9", label: "16:9", desc: "横長" },
  { id: "A4", label: "A4", desc: "印刷用" },
  { id: "custom", label: "カスタム", desc: "手動入力" },
]

const outputTypes: { id: "pop" | "poster"; name: string; desc: string }[] = [
  { id: "pop", name: "POP", desc: "店頭POP向け" },
  { id: "poster", name: "ポスター", desc: "大型印刷向け" },
]

type PopPanelId = "style" | "color" | "text" | "image" | "ratio"

type HistoryDateRange = "all" | "today" | "yesterday" | "last7" | "last30" | "year"
type HistorySortKey = "createdAt" | "title"
type HistorySortDir = "asc" | "desc"
// "all" = すべて, "mine" = 自分のみ, 将来的にはユーザーIDを文字列で指定可能
type HistoryCreatorFilter = "all" | "mine" | string

const popPanels = [
  { id: "style", label: "スタイル", hint: "雰囲気を選択", icon: Sparkles },
  { id: "color", label: "カラー", hint: "配色を決める", icon: Palette },
  { id: "text", label: "テキスト", hint: "キャッチとメイン", icon: Type },
  { id: "image", label: "参照画像", hint: "雰囲気の参考", icon: ImagePlus },
  { id: "ratio", label: "比率", hint: "サイズを選択", icon: Crop },
] as const

const historyDateRanges: { id: HistoryDateRange; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "today", label: "今日" },
  { id: "yesterday", label: "昨日" },
  { id: "last7", label: "過去7日間" },
  { id: "last30", label: "過去30日" },
  { id: "year", label: "年" },
]

const HISTORY_PAGE_SIZE = 10

const parseHistoryDate = (value: string) => new Date(value)

const formatHistoryDate = (value: string) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}



export function DesignStudio({ initialType, showHistory = false }: DesignStudioProps) {
  const [selectedColor, setSelectedColor] = useState("")
  const [popTitle, setPopTitle] = useState("")
  const [catchphrase, setCatchphrase] = useState("")
  const [mainText, setMainText] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null)
  const [customRatioWidth, setCustomRatioWidth] = useState("")
  const [customRatioHeight, setCustomRatioHeight] = useState("")
  const [selectedType, setSelectedType] = useState<"pop" | "poster">(initialType || "pop")
  const [activePopPanel, setActivePopPanel] = useState<PopPanelId>("style")
  const [isPopModalOpen, setIsPopModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ base64: string; mimeType: string; preview: string }>
  >([])
  const [historyItems, setHistoryItems] = useState<
    Array<{ id: string; type: string; title: string; createdAt: string; image: string; style: string; createdBy: string | null; createdByName: string }>
  >([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [historyStyleFilter, setHistoryStyleFilter] = useState<string>("all")
  const [historyDateRange, setHistoryDateRange] = useState<HistoryDateRange>("all")
  const [historyCreatorFilter, setHistoryCreatorFilter] = useState<HistoryCreatorFilter>("all")
  const [historyYear, setHistoryYear] = useState<number | null>(null)
  const [historyTitleQuery, setHistoryTitleQuery] = useState("")
  const [historySortKey, setHistorySortKey] = useState<HistorySortKey>("createdAt")
  const [historySortDir, setHistorySortDir] = useState<HistorySortDir>("desc")
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1)
  const [titleTouched, setTitleTouched] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // 履歴データ取得
  const fetchHistory = useCallback(async () => {
    const result = await getDesignAssetsAction()
    if (result.success) {
      setCurrentUserId(result.data.currentUserId)
      setHistoryItems(
        result.data.assets.map((asset) => ({
          id: asset.id,
          type: asset.type,
          title: asset.title || "無題",
          createdAt: asset.createdAt,
          image: asset.imageUrl || "",
          style: asset.style || "未設定",
          createdBy: asset.createdBy,
          createdByName: asset.createdByName,
        }))
      )
    } else {
      toast.error(`履歴の取得に失敗しました: ${result.error}`)
    }
  }, [])

  useEffect(() => {
    if (showHistory) {
      fetchHistory()
    }
  }, [showHistory, fetchHistory])

  useEffect(() => {
    setHistoryCurrentPage(1)
  }, [historyStyleFilter, historyDateRange, historyYear, historyTitleQuery, historySortKey, historySortDir, historyCreatorFilter])

  // プロンプトプレビュー
  const promptPreview = useMemo(() => {
    const parts: string[] = []
    parts.push("Create a promotional POP design for retail display.")

    if (selectedStyle && styleMapEN[selectedStyle]) {
      parts.push(`Style: ${styleMapEN[selectedStyle]}.`)
    }
    if (selectedColor) {
      parts.push(`Use ${selectedColor} as the primary color scheme.`)
    }
    if (catchphrase) {
      parts.push(`Catchphrase text to display: "${catchphrase}"`)
    }
    if (mainText) {
      parts.push(`Main text to display: "${mainText}"`)
    }
    if (prompt) {
      parts.push(`Additional requirements: ${prompt}`)
    }
    if (uploadedImages.length > 0) {
      parts.push(
        `Reference images: ${uploadedImages.length} image(s) attached as [image 1]${uploadedImages.length > 1 ? ` ~ [image ${uploadedImages.length}]` : ""}`
      )
    }
    parts.push("Make the design eye-catching, professional, and suitable for apparel retail business.")
    return parts.join("\n")
  }, [selectedStyle, selectedColor, catchphrase, mainText, prompt, uploadedImages.length])

  const handleGenerate = async () => {
    if (!popTitle.trim()) {
      setTitleTouched(true)
      toast.error("タイトルを入力してください")
      return
    }
    setIsGenerating(true)
    try {
      const result = await generateDesignImageAction({
        selectedStyle,
        selectedColor,
        popTitle,
        catchphrase,
        mainText,
        prompt,
        selectedRatio,
        customRatioWidth,
        customRatioHeight,
        uploadedImages: uploadedImages.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
        })),
        selectedType,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setGeneratedImage(result.data.imageUrl || null)
      toast.success("画像が生成されました")
    } catch {
      toast.error("画像生成中にエラーが発生しました")
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // フォールバック: 別タブで開く
      window.open(imageUrl, "_blank")
    }
  }

  const handleDownload = () => {
    if (generatedImage) {
      const filename = popTitle.trim()
        ? `${popTitle.trim()}.png`
        : `design-${selectedType}-${Date.now()}.png`
      downloadImage(generatedImage, filename)
    }
  }

  const handleHistoryDownload = (imageUrl: string, title: string, type: string) => {
    downloadImage(imageUrl, `${title || `design-${type}`}.png`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("このデザインを削除しますか?")) return
    const result = await deleteDesignAssetAction(id)
    if (result.success) {
      toast.success("削除しました")
      fetchHistory()
    } else {
      toast.error(result.error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (uploadedImages.length + files.length > 14) {
      toast.error("画像は最大14枚までアップロードできます")
      return
    }
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(",")[1]
        setUploadedImages((prev) => [
          ...prev,
          { base64, mimeType: file.type, preview: dataUrl },
        ])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
    if (uploadedImages.length + files.length > 14) {
      toast.error("画像は最大14枚までアップロードできます")
      return
    }
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(",")[1]
        setUploadedImages((prev) => [
          ...prev,
          { base64, mimeType: file.type, preview: dataUrl },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const insertImageRef = (index: number) => {
    const tag = `[image ${index + 1}] `
    const textarea = promptRef.current
    if (!textarea) {
      setPrompt((prev) => prev + tag)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = prompt.slice(0, start)
    const after = prompt.slice(end)
    setPrompt(before + tag + after)
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + tag.length
      textarea.focus()
    })
  }

  const isPopMode = initialType === "pop"
  const historyYears = Array.from(
    new Set(historyItems.map((item) => parseHistoryDate(item.createdAt).getFullYear())),
  ).sort((a, b) => b - a)

  const handleDateRangeChange = (range: HistoryDateRange) => {
    setHistoryDateRange(range)
    if (range !== "year") {
      setHistoryYear(null)
      return
    }
    setHistoryYear((current) => current ?? historyYears[0] ?? null)
  }

  const selectedStyleLabel = styles.find((style) => style.id === selectedStyle)?.name
  const normalizedSelectedColor = selectedColor.trim().toLowerCase()
  const selectedColorName = colorPalette.find((color) => color.hex.toLowerCase() === normalizedSelectedColor)?.name
  const colorLabel = selectedColorName ?? (selectedColor.trim() ? selectedColor.trim() : undefined)
  const ratioLabel =
    selectedRatio === "custom"
      ? customRatioWidth && customRatioHeight
        ? `${customRatioWidth}:${customRatioHeight}`
        : "カスタム"
      : selectedRatio ?? undefined
  const hasStyle = Boolean(selectedStyleLabel)
  const hasColor = Boolean(colorLabel)
  const hasRatio = Boolean(selectedRatio)
  const hasText = Boolean(catchphrase.trim() || mainText.trim())
  const hasImage = uploadedImages.length > 0
  const showSelectionBadges = hasStyle || hasColor || hasRatio || hasText || hasImage

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfLast7 = new Date(startOfToday)
  startOfLast7.setDate(startOfToday.getDate() - 6)
  const startOfLast30 = new Date(startOfToday)
  startOfLast30.setDate(startOfToday.getDate() - 29)

  const filteredHistory = historyItems.filter((item) => {
    if (historyTitleQuery.trim()) {
      const keyword = historyTitleQuery.trim().toLowerCase()
      if (!item.title.toLowerCase().includes(keyword)) return false
    }

    if (historyStyleFilter !== "all" && item.style !== historyStyleFilter) return false

    if (historyCreatorFilter === "mine") {
      if (item.createdBy !== currentUserId) return false
    } else if (historyCreatorFilter !== "all") {
      // 将来的なユーザーID指定フィルター
      if (item.createdBy !== historyCreatorFilter) return false
    }

    const createdAt = parseHistoryDate(item.createdAt)

    if (historyDateRange === "today") {
      return createdAt >= startOfToday
    }
    if (historyDateRange === "yesterday") {
      return createdAt >= startOfYesterday && createdAt < startOfToday
    }
    if (historyDateRange === "last7") {
      return createdAt >= startOfLast7
    }
    if (historyDateRange === "last30") {
      return createdAt >= startOfLast30
    }
    if (historyDateRange === "year") {
      return historyYear ? createdAt.getFullYear() === historyYear : true
    }

    return true
  })

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (historySortKey === "createdAt") {
      const da = parseHistoryDate(a.createdAt).getTime()
      const db = parseHistoryDate(b.createdAt).getTime()
      return historySortDir === "asc" ? da - db : db - da
    }
    const cmp = a.title.localeCompare(b.title, "ja")
    return historySortDir === "asc" ? cmp : -cmp
  })

  const historyTotalPages = Math.ceil(sortedHistory.length / HISTORY_PAGE_SIZE)
  const pagedHistory =
    historyTotalPages > 1
      ? sortedHistory.slice(
          (historyCurrentPage - 1) * HISTORY_PAGE_SIZE,
          historyCurrentPage * HISTORY_PAGE_SIZE,
        )
      : sortedHistory

  const styleOptions = [{ id: "all", name: "すべて" }, ...styles]

  const activePanel = popPanels.find((panel) => panel.id === activePopPanel) ?? popPanels[0]
  const ActivePanelIcon = activePanel.icon
  const isPanelFilled = (panelId: PopPanelId) => {
    switch (panelId) {
      case "style":
        return Boolean(selectedStyle)
      case "color":
        return Boolean(selectedColor.trim())
      case "text":
        return Boolean(catchphrase.trim() || mainText.trim())
      case "image":
        return uploadedImages.length > 0
      case "ratio":
        if (!selectedRatio) return false
        if (selectedRatio === "custom") {
          return Boolean(customRatioWidth && customRatioHeight)
        }
        return true
      default:
        return false
    }
  }

  const openPopPanel = (panelId: PopPanelId) => {
    setActivePopPanel(panelId)
    setIsPopModalOpen(true)
  }

  const renderPopPanelContent = () => {
    switch (activePopPanel) {
      case "style":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle((prev) => (prev === style.id ? null : style.id))}
                className={cn(
                  "p-2 rounded-xl border-2 transition-all",
                  selectedStyle === style.id
                    ? "border-[#345fe1] bg-[#345fe1]/5"
                    : "border-border hover:border-[#345fe1]/50",
                )}
              >
                <img
                  src={style.image || "/placeholder.svg"}
                  alt={style.name}
                  className="w-full aspect-square object-cover rounded-lg mb-2"
                />
                <p className="text-xs font-medium text-center">{style.name}</p>
              </button>
            ))}
          </div>
        )
      case "color":
        return (
          <>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {colorPalette.map((color) => {
                const labelClass = isLightColor(color.hex) ? "text-slate-900" : "text-white"
                return (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor((prev) => (prev === color.hex ? "" : color.hex))}
                    className={cn(
                      "w-full aspect-square rounded-lg transition-all hover:scale-105 relative group",
                      selectedColor === color.hex && "ring-2 ring-[#345fe1] ring-offset-2",
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {selectedColor === color.hex && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                    )}
                    <span
                      className={cn(
                        "absolute inset-x-1 bottom-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity",
                        labelClass,
                      )}
                    >
                      {color.name}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 mt-8">
              <div
                className="w-10 h-10 rounded-lg border shadow-sm"
                style={{ backgroundColor: selectedColor || "transparent" }}
              />
              <Input
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder="カラーコードを入力"
                className="font-mono text-sm flex-1"
              />
            </div>
          </>
        )
      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="catchphrase">キャッチフレーズ</Label>
              <Input
                id="catchphrase"
                placeholder="例: 今だけの特別価格！"
                value={catchphrase}
                onChange={(e) => setCatchphrase(e.target.value)}
                className="focus-visible:ring-0 focus-visible:border-[#345fe1]"
              />
            </div>
            <div>
              <Label htmlFor="mainText">メインテキスト</Label>
              <Input
                id="mainText"
                placeholder="例: 春の新作コレクション"
                value={mainText}
                onChange={(e) => setMainText(e.target.value)}
                className="focus-visible:ring-0 focus-visible:border-[#345fe1]"
              />
            </div>
          </div>
        )
      case "image":
        return (
          <div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
            {uploadedImages.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">
                  {uploadedImages.length}/14枚 アップロード済み — 画像をクリックで参照タグを挿入
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <span className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white">
                        image {index + 1}
                      </span>
                      <img
                        src={img.preview}
                        alt={`参照画像 ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer ring-0 hover:ring-2 hover:ring-[#345fe1] transition-all"
                        onClick={() => insertImageRef(index)}
                        title={`クリックで [image ${index + 1}] を入力欄に挿入`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {uploadedImages.length < 14 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-[#345fe1] transition-colors cursor-pointer"
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">ドラッグ＆ドロップ または クリック</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG (最大 10MB・14枚まで)</p>
              </div>
            )}
          </div>
        )
      case "ratio":
        return (
          <>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((ratio) => {
                const isCustom = ratio.id === "custom"
                const isSelected = selectedRatio === ratio.id
                const customLabel =
                  isCustom && customRatioWidth && customRatioHeight
                    ? `カスタム (${customRatioWidth}:${customRatioHeight})`
                    : ratio.label
                return (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatio((prev) => (prev === ratio.id ? null : ratio.id))}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      isSelected
                        ? "border-[#345fe1] bg-[#345fe1] text-white"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:border-[#345fe1]/50 hover:bg-muted/60",
                    )}
                  >
                    <span>{customLabel}</span>
                    <span className="text-xs opacity-70 ml-1">({ratio.desc})</span>
                  </button>
                )
              })}
            </div>
            {selectedRatio === "custom" && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 max-w-xs">
                  <Input
                    type="number"
                    min="1"
                    placeholder="幅"
                    value={customRatioWidth}
                    onChange={(e) => setCustomRatioWidth(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="高さ"
                    value={customRatioHeight}
                    onChange={(e) => setCustomRatioHeight(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">例: 4 : 5</p>
              </div>
            )}
          </>
        )
      default:
        return null
    }
  }

  const previewPanel = (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">プレビュー</CardTitle>
          {generatedImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-[#345fe1] border-[#345fe1] hover:bg-[#345fe1]/10 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 bg-muted rounded-xl flex items-center justify-center min-h-100 relative overflow-hidden">
          {isGenerating ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#345fe1] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">生成中...</p>
            </div>
          ) : generatedImage ? (
            <img
              src={generatedImage || "/placeholder.svg"}
              alt="生成された画像"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-16 h-16 mx-auto mb-3" />
              <p>生成された画像がここに表示されます</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (showHistory) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Design Studio</p>
          <h2 className="text-2xl font-bold text-foreground">作成履歴</h2>
          <p className="text-muted-foreground">過去に作成したデザインの一覧</p>
        </div>

        <div className="mb-6">
          <div className="rounded-2xl border bg-card/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground w-12">スタイル</span>
              {styleOptions.map((style) => {
                const isActive = historyStyleFilter === style.id
                return (
                  <button
                    key={style.id}
                    onClick={() => setHistoryStyleFilter(style.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                      isActive
                        ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1] font-medium"
                        : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                    )}
                  >
                    {style.name}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground w-12">タイトル</span>
              <Input
                value={historyTitleQuery}
                onChange={(e) => setHistoryTitleQuery(e.target.value)}
                placeholder="POPタイトルで検索"
                className="h-8 w-full max-w-xs text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground w-12">日付</span>
              {historyDateRanges.map((range) => {
                const isActive = historyDateRange === range.id
                return (
                  <button
                    key={range.id}
                    onClick={() => handleDateRangeChange(range.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                      isActive
                        ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1] font-medium"
                        : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                    )}
                  >
                    {range.label}
                  </button>
                )
              })}
            </div>
            {historyDateRange === "year" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground w-12">年</span>
                {historyYears.length === 0 ? (
                  <span className="text-xs text-muted-foreground">年のデータがありません</span>
                ) : (
                  historyYears.map((year) => {
                    const isActive = historyYear === year
                    return (
                      <button
                        key={year}
                        onClick={() => setHistoryYear(year)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                          isActive
                            ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1] font-medium"
                            : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                        )}
                      >
                        {year}年
                      </button>
                    )
                  })
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground w-12">作成者</span>
              {(
                [
                  { id: "all", label: "すべて" },
                  { id: "mine", label: "自分のみ" },
                ] as const
              ).map(({ id, label }) => {
                const isActive = historyCreatorFilter === id
                return (
                  <button
                    key={id}
                    onClick={() => setHistoryCreatorFilter(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                      isActive
                        ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1] font-medium"
                        : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 並べ替え */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">並べ替え</span>
          {(
            [
              { key: "createdAt" as HistorySortKey, label: "作成日" },
              { key: "title" as HistorySortKey, label: "タイトル (50音)" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (historySortKey === key) {
                  setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"))
                } else {
                  setHistorySortKey(key)
                  setHistorySortDir(key === "createdAt" ? "desc" : "asc")
                }
              }}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors",
                historySortKey === key
                  ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1] font-medium"
                  : "border-border text-muted-foreground hover:border-[#345fe1]/50",
              )}
            >
              {label}
              {historySortKey === key ? (
                historySortDir === "asc" ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filteredHistory.length}件</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHistory.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/40 py-16 text-center">
              <p className="text-sm text-muted-foreground">条件に一致する作成履歴がありません</p>
            </div>
          ) : (
            pagedHistory.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="relative">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full aspect-square object-cover rounded-lg mb-3"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="bg-white text-foreground hover:bg-white/90" onClick={() => handleHistoryDownload(item.image, item.title, item.type)}>
                        <Download className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-white text-red-600 hover:bg-white/90" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        item.type === "pop" ? "bg-[#345fe1]/10 text-[#345fe1]" : "bg-green-100 text-green-700",
                      )}
                    >
                      {item.type === "pop" ? "POP" : "ポスター"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatHistoryDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">スタイル: {styles.find((s) => s.id === item.style)?.name ?? item.style}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ページネーション */}
        {historyTotalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={historyCurrentPage === 1}
              onClick={() => setHistoryCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {(() => {
              const pages: (number | "...")[] = []
              for (let i = 1; i <= historyTotalPages; i++) {
                if (
                  i === 1 ||
                  i === historyTotalPages ||
                  Math.abs(i - historyCurrentPage) <= 2
                ) {
                  pages.push(i)
                } else if (pages[pages.length - 1] !== "...") {
                  pages.push("...")
                }
              }
              return pages.map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground text-xs"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={historyCurrentPage === page ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-8 h-8 p-0 text-xs",
                      historyCurrentPage === page &&
                        "bg-[#345fe1] hover:bg-[#345fe1]/90 border-[#345fe1]",
                    )}
                    onClick={() => setHistoryCurrentPage(page as number)}
                  >
                    {page}
                  </Button>
                ),
              )
            })()}
            <Button
              variant="outline"
              size="sm"
              disabled={historyCurrentPage === historyTotalPages}
              onClick={() => setHistoryCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Design Studio</p>
        <h2 className="text-2xl font-bold text-foreground">
          {initialType === "pop" ? "POP作成" : initialType === "poster" ? "ポスター作成" : "デザインスタジオ"}
        </h2>
        <p className="text-muted-foreground">
          {initialType === "pop"
            ? "店頭POP向けのデザインを作成"
            : initialType === "poster"
              ? "大型印刷向けポスターを作成"
              : "POPやポスターを簡単に作成"}
        </p>
      </div>

      {isPopMode ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6">
          <div className="space-y-4">
            <Card className="border-none bg-transparent shadow-none">
              <CardContent className="p-0">
                <div className="rounded-[28px] border border-border bg-card px-5 py-4 shadow-sm">
                {showSelectionBadges ? (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {hasStyle && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          スタイル: {selectedStyleLabel}
                        </span>
                      )}
                      {hasColor && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full border border-border"
                            style={{ backgroundColor: selectedColor || "transparent" }}
                          />
                          カラー: {colorLabel}
                        </span>
                      )}
                      {hasRatio && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          比率: {ratioLabel}
                        </span>
                      )}
                      {hasText ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          テキスト: 入力済み
                        </span>
                      ) : null}
                      {hasImage ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          参照画像: {uploadedImages.length}枚
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mb-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      POPタイトル <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={popTitle}
                      onChange={(e) => setPopTitle(e.target.value)}
                      onBlur={() => setTitleTouched(true)}
                      placeholder="例: 春の新作フェア"
                      className={cn(
                        "h-9",
                        titleTouched && !popTitle.trim() && "border-red-500 focus-visible:ring-red-500",
                      )}
                    />
                    {titleTouched && !popTitle.trim() && (
                      <p className="text-xs text-red-500">タイトルを入力してください</p>
                    )}
                  </div>
                  <Textarea
                    ref={promptRef}
                    placeholder="指示文を入力してください。例: [image 1]を中央に配置し、春らしい明るい雰囲気で、セール情報を目立たせてください。"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-27.5 resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                  />

                  {/* カラー・スタイルプレビュー */}
                  {(selectedColor || selectedStyle) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">選択中の設定</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedColor && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/70 bg-muted/20">
                            <div
                              className="w-6 h-6 rounded border border-border/50 shadow-sm"
                              style={{ backgroundColor: selectedColor }}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {colorPalette.find((c) => c.hex.toLowerCase() === selectedColor.toLowerCase())?.name || selectedColor}
                            </span>
                          </div>
                        )}
                        {selectedStyle && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/70 bg-muted/20">
                            <Sparkles className="w-4 h-4 text-[#345fe1]" />
                            <span className="text-sm font-medium text-foreground">
                              {styles.find((s) => s.id === selectedStyle)?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 選択済み参照画像の表示 */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">
                        参照画像 {uploadedImages.length}/14枚 — クリックで [image N] タグを挿入
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <span className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white">
                              image {index + 1}
                            </span>
                            <img
                              src={img.preview}
                              alt={`参照画像 ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg cursor-pointer ring-0 hover:ring-2 hover:ring-[#345fe1] transition-all"
                              onClick={() => insertImageRef(index)}
                              title={`クリックで [image ${index + 1}] を入力欄に挿入`}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                              }}
                              className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {popPanels.map((panel) => {
                        const Icon = panel.icon
                        const isActive = activePopPanel === panel.id
                        const isFilled = isPanelFilled(panel.id)
                        return (
                          <button
                            key={panel.id}
                            onClick={() => openPopPanel(panel.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                              isFilled
                                ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1]"
                                : isActive
                                  ? "border-border bg-muted/70 text-foreground"
                                  : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                            )}
                            title={panel.hint}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{panel.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground">選択中: {activePanel.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* プロンプトプレビュー */}
            <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  生成プロンプト プレビュー
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground/80 font-mono leading-relaxed">
                {promptPreview}
              </pre>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              画像を生成
            </Button>

            <Dialog open={isPopModalOpen} onOpenChange={setIsPopModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <ActivePanelIcon className="w-4 h-4 text-[#345fe1]" />
                    </span>
                    {activePanel.label}
                  </DialogTitle>
                  <DialogDescription>{activePanel.hint}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-auto pr-1">{renderPopPanelContent()}</div>
              </DialogContent>
            </Dialog>
          </div>

          <div>{previewPanel}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-4">
            {!initialType && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">出力タイプ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {outputTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          selectedType === type.id
                            ? "border-[#345fe1] bg-[#345fe1]/5"
                            : "border-border hover:border-[#345fe1]/50",
                        )}
                      >
                        <p className="font-semibold text-foreground">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Color Picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">カラーパレット</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {colorPalette.map((color) => {
                    const labelClass = isLightColor(color.hex) ? "text-slate-900" : "text-white"
                    return (
                      <button
                        key={color.hex}
                        onClick={() => setSelectedColor((prev) => (prev === color.hex ? "" : color.hex))}
                        className={cn(
                          "w-full aspect-square rounded-lg transition-all hover:scale-105 relative group",
                          selectedColor === color.hex && "ring-2 ring-[#345fe1] ring-offset-2",
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selectedColor === color.hex && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                        )}
                        <span
                          className={cn(
                            "absolute inset-x-1 bottom-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity",
                            labelClass,
                          )}
                        >
                          {color.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2 mt-8">
                  <div
                    className="w-10 h-10 rounded-lg border shadow-sm"
                    style={{ backgroundColor: selectedColor || "transparent" }}
                  />
                  <Input
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    placeholder="カラーコードを入力"
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">テキスト入力</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="catchphrase">キャッチフレーズ</Label>
                  <Input
                    id="catchphrase"
                    placeholder="例: 今だけの特別価格！"
                    value={catchphrase}
                    onChange={(e) => setCatchphrase(e.target.value)}
                    className="focus-visible:ring-0 focus-visible:border-[#345fe1]"
                  />
                </div>
                <div>
                  <Label htmlFor="mainText">メインテキスト</Label>
                  <Input
                    id="mainText"
                    placeholder="例: 春の新作コレクション"
                    value={mainText}
                    onChange={(e) => setMainText(e.target.value)}
                    className="focus-visible:ring-0 focus-visible:border-[#345fe1]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reference Image */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">参照画像</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                {uploadedImages.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      {uploadedImages.length}/14枚 — クリックで参照タグ挿入
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <span className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white">
                            image {index + 1}
                          </span>
                          <img
                            src={img.preview}
                            alt={`参照画像 ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer ring-0 hover:ring-2 hover:ring-[#345fe1] transition-all"
                            onClick={() => insertImageRef(index)}
                            title={`クリックで [image ${index + 1}] を入力欄に挿入`}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uploadedImages.length < 14 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-[#345fe1] transition-colors cursor-pointer"
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">ドラッグ＆ドロップ または クリック</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG (最大 10MB・14枚まで)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Style & Prompt */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">スタイル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle((prev) => (prev === style.id ? null : style.id))}
                      className={cn(
                        "p-2 rounded-xl border-2 transition-all",
                        selectedStyle === style.id
                          ? "border-[#345fe1] bg-[#345fe1]/5"
                          : "border-border hover:border-[#345fe1]/50",
                      )}
                    >
                      <img
                        src={style.image || "/placeholder.svg"}
                        alt={style.name}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                      <p className="text-xs font-medium text-center">{style.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aspect Ratio */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">アスペクト比</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setSelectedRatio((prev) => (prev === ratio.id ? null : ratio.id))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        selectedRatio === ratio.id
                          ? "bg-[#345fe1] text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      <span>{ratio.label}</span>
                      <span className="text-xs opacity-70 ml-1">({ratio.desc})</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">プロンプト</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  ref={promptRef}
                  placeholder="指示文を入力してください。例: [image 1]を中央に配置し、春らしい明るい雰囲気で、セール情報を目立たせてください。"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-30 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  詳細な指示を入力することで、より希望に近いデザインが生成されます。
                </p>
              </CardContent>
            </Card>

            {/* カラー・スタイルプレビュー */}
            {(selectedColor || selectedStyle) && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-3">選択中の設定</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedColor && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/70 bg-card shadow-sm">
                        <div
                          className="w-6 h-6 rounded border border-border/50 shadow-sm"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {colorPalette.find((c) => c.hex.toLowerCase() === selectedColor.toLowerCase())?.name || selectedColor}
                        </span>
                      </div>
                    )}
                    {selectedStyle && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/70 bg-card shadow-sm">
                        <Sparkles className="w-4 h-4 text-[#345fe1]" />
                        <span className="text-sm font-medium text-foreground">
                          {styles.find((s) => s.id === selectedStyle)?.name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              画像を生成
            </Button>
          </div>

          <div>{previewPanel}</div>
        </div>
      )}
    </div>
  )
}
