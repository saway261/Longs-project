import { prisma } from "@/src/lib/prisma"
import { generateImage, buildPrompt } from "@/src/lib/gemini"
import { getImageStorage, mimeToExt, generateFilename } from "@/src/lib/image-storage"
import type { GenerateDesignInput } from "@/src/lib/validation/design"

// ============================================================
// 型定義
// ============================================================

export type DesignAssetDTO = {
  id: string
  type: string
  title: string | null
  prompt: string | null
  style: string | null
  color: string | null
  ratio: string | null
  imageUrl: string | null
  createdAt: string
}

// ============================================================
// 画像生成
// ============================================================

export async function generateDesignImage(
  input: GenerateDesignInput,
  userId: string
): Promise<DesignAssetDTO> {
  console.log("[generateDesignImage] START - userId:", userId)

  // 1. Gemini API 呼び出し
  console.log("[generateDesignImage] Calling Gemini API...")
  const result = await generateImage(input)
  console.log("[generateDesignImage] Gemini API completed")

  // 2. 画像ファイル保存
  console.log("[generateDesignImage] Saving image file...")
  const storage = getImageStorage()
  const ext = mimeToExt(result.mimeType)
  const filename = generateFilename(ext)
  const imageBuffer = Buffer.from(result.imageBase64, "base64")
  const imageUrl = await storage.save(imageBuffer, filename)
  console.log("[generateDesignImage] Image saved:", imageUrl)

  // 3. DB保存（DesignAsset + AiGenerationLog）
  const builtPrompt = buildPrompt(input)

  console.log("[generateDesignImage] Saving to DB...")
  console.log("[generateDesignImage] Data:", {
    type: input.selectedType,
    title: input.popTitle,
    createdBy: userId,
    imageUrl,
  })

  const asset = await prisma.designAsset.create({
    data: {
      type: input.selectedType,
      title: input.popTitle || null,
      prompt: builtPrompt,
      style: input.selectedStyle,
      color: input.selectedColor || null,
      ratio: input.selectedRatio,
      imageUrl,
      createdBy: userId,
      aiLogs: {
        create: {
          model: "gemini-3-pro-image-preview",
          promptTokens: result.promptTokens,
          candidatesTokens: result.candidatesTokens,
          totalTokens: result.totalTokens,
          responseTimeMs: result.responseTimeMs,
        },
      },
    },
  })

  console.log("[generateDesignImage] DB save completed - asset.id:", asset.id)
  return toDTO(asset)
}

// ============================================================
// 一覧取得
// ============================================================

export async function getDesignAssets(userId: string): Promise<DesignAssetDTO[]> {
  const assets = await prisma.designAsset.findMany({
    where: { createdBy: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
  return assets.map(toDTO)
}

// ============================================================
// 単件取得
// ============================================================

export async function getDesignAsset(
  id: string,
  userId: string
): Promise<DesignAssetDTO | null> {
  const asset = await prisma.designAsset.findFirst({
    where: { id, createdBy: userId, deletedAt: null },
  })
  return asset ? toDTO(asset) : null
}

// ============================================================
// 削除
// ============================================================

export async function deleteDesignAsset(
  id: string,
  userId: string
): Promise<boolean> {
  const asset = await prisma.designAsset.findFirst({
    where: { id, createdBy: userId, deletedAt: null },
  })
  if (!asset) return false

  // ソフトデリート: deletedAt を記録するのみ
  // 物理削除（ファイル + DBレコード）は cleanup スクリプトで 180日後に実行
  await prisma.designAsset.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
  return true
}

// ============================================================
// DTO 変換
// ============================================================

function toDTO(asset: {
  id: string
  type: string
  title: string | null
  prompt: string | null
  style: string | null
  color: string | null
  ratio: string | null
  imageUrl: string | null
  createdAt: Date
}): DesignAssetDTO {
  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    prompt: asset.prompt,
    style: asset.style,
    color: asset.color,
    ratio: asset.ratio,
    imageUrl: asset.imageUrl,
    createdAt: asset.createdAt.toISOString(),
  }
}
