"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const TagBadge = (props: React.ComponentProps<typeof Badge>) => (
  <Badge variant="secondary" {...props} />
)
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { NewsQueryDTO, QueryInput } from "@/src/actions/news-actions"
import {
  NEWSDATA_CATEGORIES,
  NEWSDATA_CATEGORY_LABELS,
  type NewsdataCategory,
} from "@/src/lib/news-providers/newsdata-categories"

interface NewsQueryEditDialogProps {
  open: boolean
  onClose: () => void
  /** 編集モード: 既存クエリ。nullの場合は新規作成モード */
  query: NewsQueryDTO | null
  onSave: (input: QueryInput) => Promise<void>
  onDelete?: () => Promise<void>
}

export function NewsQueryEditDialog({
  open,
  onClose,
  query,
  onSave,
  onDelete,
}: NewsQueryEditDialogProps) {
  const isEdit = query !== null

  const [name, setName] = useState(query?.name ?? "")
  const [keywordMode, setKeywordMode] = useState<"AND" | "OR">(query?.keywordMode ?? "AND")
  const [keywordInput, setKeywordInput] = useState("")
  const [keywords, setKeywords] = useState<string[]>(
    query?.keywords ? query.keywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
  )
  const [notKeywordInput, setNotKeywordInput] = useState("")
  const [notKeywords, setNotKeywords] = useState<string[]>(
    query?.notKeywords ? query.notKeywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
  )
  const [sourceInput, setSourceInput] = useState("")
  const [sources, setSources] = useState<string[]>(
    query?.sources ? query.sources.split(",").map((s) => s.trim()).filter(Boolean) : [],
  )
  const [sourceMode, setSourceMode] = useState<"include" | "exclude" | "none">(
    query?.sourceMode ?? "none",
  )
  const [language, setLanguage] = useState(query?.language ?? "ja")
  const [categoryMode, setCategoryMode] = useState<"include" | "exclude" | "none">(
    query?.categoryMode ?? "none",
  )
  const [selectedCategories, setSelectedCategories] = useState<NewsdataCategory[]>(
    query?.categories
      ? (query.categories.split(",").filter((c) => NEWSDATA_CATEGORIES.includes(c as NewsdataCategory)) as NewsdataCategory[])
      : [],
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  // ダイアログが開くたびに query の内容でリセット
  useEffect(() => {
    if (!open) return
    setName(query?.name ?? "")
    setKeywordMode(query?.keywordMode ?? "AND")
    setKeywordInput("")
    setKeywords(query?.keywords ? query.keywords.split(",").map((s) => s.trim()).filter(Boolean) : [])
    setNotKeywordInput("")
    setNotKeywords(query?.notKeywords ? query.notKeywords.split(",").map((s) => s.trim()).filter(Boolean) : [])
    setSourceInput("")
    setSources(query?.sources ? query.sources.split(",").map((s) => s.trim()).filter(Boolean) : [])
    setSourceMode(query?.sourceMode ?? "none")
    setLanguage(query?.language ?? "ja")
    setCategoryMode(query?.categoryMode ?? "none")
    setSelectedCategories(
      query?.categories
        ? (query.categories.split(",").filter((c) => NEWSDATA_CATEGORIES.includes(c as NewsdataCategory)) as NewsdataCategory[])
        : [],
    )
    setError("")
  }, [open])

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  function addKeyword() {
    const kw = keywordInput.trim()
    if (!kw || keywords.includes(kw)) return
    setKeywords((prev) => [...prev, kw])
    setKeywordInput("")
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function addNotKeyword() {
    const kw = notKeywordInput.trim()
    if (!kw || notKeywords.includes(kw)) return
    setNotKeywords((prev) => [...prev, kw])
    setNotKeywordInput("")
  }

  function removeNotKeyword(kw: string) {
    setNotKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function addSource() {
    const src = sourceInput.trim()
    if (!src || sources.includes(src)) return
    if (sources.length >= 5) return
    setSources((prev) => [...prev, src])
    setSourceInput("")
  }

  function removeSource(src: string) {
    setSources((prev) => prev.filter((s) => s !== src))
  }

  async function handleSave() {
    setError("")
    if (!name.trim()) {
      setError("フィルター名を入力してください")
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        keywords: keywords.join(",") || null,
        keywordMode,
        notKeywords: notKeywords.join(",") || null,
        language,
        sources: sources.join(",") || null,
        sourceMode: sourceMode === "none" ? null : sourceMode,
        categoryMode: categoryMode === "none" ? null : categoryMode,
        categories: categoryMode !== "none" && selectedCategories.length > 0
          ? selectedCategories.join(",")
          : null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "検索フィルターを編集" : "検索フィルターを追加"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* フィルター名 */}
          <div className="space-y-1.5">
            <Label htmlFor="filter-name">フィルター名</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 為替、原材料"
            />
          </div>

          {/* キーワード */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>キーワード</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="例: 円安、レオナルド ディカプリオ"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                  追加
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {keywords.map((kw) => (
                    <TagBadge key={kw} className="gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </TagBadge>
                  ))}
                </div>
              )}
            </div>

            {/* AND/OR モード */}
            {keywords.length >= 2 && (
              <div className="space-y-1.5">
                <Label>キーワードの結合方法</Label>
                <div className="flex gap-1">
                  {(["AND", "OR"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setKeywordMode(mode)}
                      className={cn(
                        "w-16 py-1 rounded-md text-sm font-medium transition-all",
                        keywordMode === mode
                          ? "bg-foreground text-background"
                          : "text-muted-foreground opacity-40 hover:opacity-70",
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {keywordMode === "AND"
                    ? "すべてのキーワードを含む記事を取得します"
                    : "いずれかのキーワードを含む記事を取得します"}
                </p>
              </div>
            )}

            {/* 除外キーワード（NOT） */}
            <div className="space-y-1.5">
              <Label>除外キーワード</Label>
              <div className="flex gap-2">
                <Input
                  value={notKeywordInput}
                  onChange={(e) => setNotKeywordInput(e.target.value)}
                  placeholder="例: 不正"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNotKeyword())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addNotKeyword}>
                  追加
                </Button>
              </div>
              {notKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {notKeywords.map((kw) => (
                    <TagBadge key={kw} className="gap-1 opacity-80">
                      NOT {kw}
                      <button onClick={() => removeNotKeyword(kw)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </TagBadge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ソース */}
          <div className="space-y-2">
            <Label>ソース（ドメインURL）</Label>
            <Select value={sourceMode} onValueChange={(v: string) => {
              setSourceMode(v as "include" | "exclude" | "none")
              setSources([])
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">指定なし</SelectItem>
                <SelectItem value="include">含むソースを指定</SelectItem>
                <SelectItem value="exclude">除外するソースを指定</SelectItem>
              </SelectContent>
            </Select>
            {sourceMode !== "none" && (
              <>
                <p className="text-xs text-muted-foreground">最大5つまで指定できます（{sources.length}/5）</p>
                <div className="flex gap-2">
                  <Input
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder="例: nhk.or.jp, reuters.com"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSource())}
                    disabled={sources.length >= 5}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addSource} disabled={sources.length >= 5}>
                    追加
                  </Button>
                </div>
                {sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {sources.map((src) => (
                      <TagBadge key={src} className="gap-1">
                        {src}
                        <button onClick={() => removeSource(src)} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </TagBadge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* カテゴリ */}
          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <Select value={categoryMode} onValueChange={(v: string) => {
              setCategoryMode(v as "include" | "exclude" | "none")
              setSelectedCategories([])
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">指定なし</SelectItem>
                <SelectItem value="include">含むカテゴリを指定</SelectItem>
                <SelectItem value="exclude">除外するカテゴリを指定</SelectItem>
              </SelectContent>
            </Select>
            {categoryMode !== "none" && (
              <>
                <p className="text-xs text-muted-foreground">
                  最大5つまで選択できます（{selectedCategories.length}/5）
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 max-h-48 overflow-y-auto border rounded-md p-3">
                  {NEWSDATA_CATEGORIES.map((cat) => {
                    const checked = selectedCategories.includes(cat)
                    const disabled = !checked && selectedCategories.length >= 5
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(c: boolean) => {
                            setSelectedCategories((prev) =>
                              c ? [...prev, cat] : prev.filter((x) => x !== cat),
                            )
                          }}
                        />
                        <label
                          htmlFor={`cat-${cat}`}
                          className={`text-sm ${disabled ? "text-muted-foreground" : "cursor-pointer"}`}
                        >
                          {NEWSDATA_CATEGORY_LABELS[cat]}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* APIドメイン（読み取り専用） */}
          <div className="space-y-1.5">
            <Label>ニュースAPI</Label>
            <Input value="newsdata.io" readOnly className="bg-muted text-muted-foreground cursor-default" />
          </div>

          {/* 言語 */}
          <div className="space-y-1.5">
            <Label>言語</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語 (ja)</SelectItem>
                <SelectItem value="en">英語 (en)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 shrink-0">
          {isEdit && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="mr-auto"
            >
              {isDeleting ? "削除中..." : "削除"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isDeleting}>
            {isSaving ? "保存中..." : isEdit ? "保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
