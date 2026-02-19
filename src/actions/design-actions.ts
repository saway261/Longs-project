"use server"

import { ActionResult } from "@/src/lib/result"
import { getSession } from "@/src/lib/auth"
import { generateDesignSchema } from "@/src/lib/validation/design"
import * as designService from "@/src/services/design-service"
import type { DesignAssetDTO } from "@/src/services/design-service"

// ============================================================
// 画像生成
// ============================================================

export async function generateDesignImageAction(
  input: unknown
): Promise<ActionResult<DesignAssetDTO>> {
  console.log("[generateDesignImageAction] START")
  try {
    const session = await getSession()
    if (!session) {
      console.log("[generateDesignImageAction] No session")
      return { success: false, error: "ログインが必要です" }
    }

    console.log("[generateDesignImageAction] Session userId:", session.userId)

    const parsed = generateDesignSchema.safeParse(input)
    if (!parsed.success) {
      console.log("[generateDesignImageAction] Validation failed:", parsed.error)
      return { success: false, error: parsed.error.errors[0].message }
    }

    console.log("[generateDesignImageAction] Calling service...")
    const result = await designService.generateDesignImage(
      parsed.data,
      session.userId
    )
    console.log("[generateDesignImageAction] Service returned:", result)
    return { success: true, data: result }
  } catch (error) {
    console.error("[generateDesignImageAction] CAUGHT ERROR:", error)
    console.error("[generateDesignImageAction] Error stack:", error instanceof Error ? error.stack : "no stack")
    const message =
      error instanceof Error ? error.message : "画像生成中にエラーが発生しました"
    return { success: false, error: message }
  }
}

// ============================================================
// 一覧取得
// ============================================================

export async function getDesignAssetsAction(): Promise<
  ActionResult<DesignAssetDTO[]>
> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: "ログインが必要です" }
    }

    const data = await designService.getDesignAssets(session.userId)
    return { success: true, data }
  } catch (error) {
    console.error("[getDesignAssetsAction]", error)
    return { success: false, error: "デザイン一覧の取得に失敗しました" }
  }
}

// ============================================================
// 単件取得
// ============================================================

export async function getDesignAssetAction(
  id: string
): Promise<ActionResult<DesignAssetDTO | null>> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: "ログインが必要です" }
    }

    const data = await designService.getDesignAsset(id, session.userId)
    return { success: true, data }
  } catch (error) {
    console.error("[getDesignAssetAction]", error)
    return { success: false, error: "デザインの取得に失敗しました" }
  }
}

// ============================================================
// 削除
// ============================================================

export async function deleteDesignAssetAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: "ログインが必要です" }
    }

    const deleted = await designService.deleteDesignAsset(id, session.userId)
    if (!deleted) {
      return { success: false, error: "デザインが見つかりません" }
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error("[deleteDesignAssetAction]", error)
    return { success: false, error: "削除に失敗しました" }
  }
}
