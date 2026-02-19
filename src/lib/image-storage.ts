import { createClient } from "@supabase/supabase-js"

// ============================================================
// 画像ストレージ インターフェース
// ストレージバックエンド: Supabase Storage
// ============================================================

export interface ImageStorage {
  save(imageData: Buffer, filename: string): Promise<string>
  delete(imageUrl: string): Promise<void>
}

// ============================================================
// Supabase Storageストレージ
// ============================================================

class SupabaseImageStorage implements ImageStorage {
  private supabase
  private bucket: string

  constructor() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.bucket = process.env.SUPABASE_BUCKET_NAME ?? "design-assets"

    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY の環境変数が必要です"
      )
    }

    this.supabase = createClient(url, key)
  }

  async save(imageData: Buffer, filename: string): Promise<string> {
    // YYYY/MM/filename 階層構造でパスを生成
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const filePath = `${yyyy}/${mm}/${filename}`

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, imageData, {
        contentType: "image/png",
        cacheControl: "31536000", // 1年
        upsert: false,
      })

    if (error) {
      throw new Error(`Supabase アップロード失敗: ${error.message}`)
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async delete(imageUrl: string): Promise<void> {
    // 公開URL から バケット以降のパスを抽出
    // 例: https://xxx.supabase.co/storage/v1/object/public/design-assets/2026/02/file.png
    //  → 2026/02/file.png
    const marker = `/object/public/${this.bucket}/`
    const idx = imageUrl.indexOf(marker)
    if (idx === -1) return // 対象外URLはスキップ

    const filePath = imageUrl.slice(idx + marker.length)

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filePath])

    if (error) {
      // 削除失敗はログのみ（呼び出し元をブロックしない）
      console.error(`Supabase 削除失敗: ${error.message}`)
    }
  }
}

// ============================================================
// S3ストレージ（本番環境用 — 将来実装）
// ============================================================
// class S3ImageStorage implements ImageStorage {
//   async save(imageData: Buffer, filename: string): Promise<string> { ... }
//   async delete(imageUrl: string): Promise<void> { ... }
// }

// ============================================================
// ファクトリ
// ============================================================

export function getImageStorage(): ImageStorage {
  const storageType = process.env.IMAGE_STORAGE_TYPE ?? "supabase"

  switch (storageType) {
    case "supabase":
      return new SupabaseImageStorage()
    default:
      throw new Error(`未対応のストレージタイプ: ${storageType}`)
  }
}

// ============================================================
// ユーティリティ
// ============================================================

/** mimeType → 拡張子 */
export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  }
  return map[mimeType] ?? "png"
}

/** ユニークなファイル名を生成 */
export function generateFilename(ext: string): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 10)
  return `${ts}-${rand}.${ext}`
}
