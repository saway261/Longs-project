import { GoogleGenAI } from "@google/genai"

// ============================================================
// 型定義
// ============================================================

export type GenerateDesignInput = {
  selectedStyle: string | null
  selectedColor: string
  popTitle: string
  catchphrase: string
  mainText: string
  prompt: string
  selectedRatio: string | null
  customRatioWidth: string
  customRatioHeight: string
  uploadedImages: Array<{ base64: string; mimeType: string }>
  selectedType: "pop" | "poster"
}

export type GeminiGenerateResult = {
  imageBase64: string
  mimeType: string
  promptTokens: number
  candidatesTokens: number
  totalTokens: number
  responseTimeMs: number
}

// ============================================================
// スタイルマッピング（日本語キー → 英語プロンプト記述）
// ============================================================

const styleMap: Record<string, string> = {
  modern: "modern minimalist design, clean lines, geometric shapes",
  retro: "retro vintage design, nostalgic colors, classic typography",
  street: "street urban design, graffiti style, bold graphics",
  elegant: "elegant luxury design, sophisticated, refined aesthetics",
  casual: "casual friendly design, warm, approachable",
  sporty: "sporty dynamic design, energetic, athletic vibe",
}

// ============================================================
// アスペクト比マッピング
// ============================================================

const aspectRatioMap: Record<string, string> = {
  "1:1": "1:1",
  "9:16": "9:16",
  "4:5": "4:5",
  "16:9": "16:9",
  a4: "7:10",
}

function getAspectRatio(input: GenerateDesignInput): string {
  if (input.selectedRatio === "custom" && input.customRatioWidth && input.customRatioHeight) {
    return `${input.customRatioWidth}:${input.customRatioHeight}`
  }
  if (input.selectedRatio && aspectRatioMap[input.selectedRatio]) {
    return aspectRatioMap[input.selectedRatio]
  }
  return "1:1"
}

// ============================================================
// プロンプト構築
// ※ popTitle はDB保存用のみ。プロンプトには含めない。
// ※ catchphrase・mainText は画像内出力テキストなので原文のまま。
// ※ prompt（ユーザー自由入力）も原文のまま。
// ============================================================

export function buildPrompt(input: GenerateDesignInput): string {
  const parts: string[] = []

  parts.push("Create a promotional POP design for retail display.")

  if (input.selectedStyle && styleMap[input.selectedStyle]) {
    parts.push(`Style: ${styleMap[input.selectedStyle]}.`)
  }

  if (input.selectedColor) {
    parts.push(`Use ${input.selectedColor} as the primary color scheme.`)
  }

  if (input.catchphrase) {
    parts.push(`Catchphrase text to display: "${input.catchphrase}"`)
  }
  if (input.mainText) {
    parts.push(`Main text to display: "${input.mainText}"`)
  }

  if (input.prompt) {
    parts.push(`Additional requirements: ${input.prompt}`)
  }

  parts.push("Make the design eye-catching, professional, and suitable for apparel retail business.")

  return parts.join("\n")
}

// ============================================================
// contents 配列の構築（画像+ラベルのインターリーブ構造）
// ============================================================

function buildContents(
  promptText: string,
  uploadedImages: Array<{ base64: string; mimeType: string }>
) {
  const contents: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = []

  // 画像をインデックスラベル付きでインターリーブ配置
  for (let i = 0; i < uploadedImages.slice(0, 14).length; i++) {
    const img = uploadedImages[i]
    contents.push({ text: `[image ${i + 1}]` })
    contents.push({
      inlineData: { data: img.base64, mimeType: img.mimeType },
    })
  }

  // テキストプロンプト（ユーザーの "[image N]" 参照を含む）
  contents.push({ text: promptText })

  return contents
}

// ============================================================
// Gemini API 画像生成
// ============================================================

const MODEL = "gemini-3-pro-image-preview"

export async function generateImage(
  input: GenerateDesignInput
): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません")
  }

  const ai = new GoogleGenAI({ apiKey })
  const promptText = buildPrompt(input)
  const contents = buildContents(promptText, input.uploadedImages)
  const aspectRatio = getAspectRatio(input)

  // リクエストログ
  console.log(
    "[Gemini API] Request:",
    JSON.stringify(
      {
        model: MODEL,
        prompt: promptText,
        imageCount: input.uploadedImages.length,
        config: { aspectRatio, imageSize: "1K" },
      },
      null,
      2
    )
  )

  const startTime = Date.now()

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio,
        imageSize: "1K",
      },
    },
  })

  const responseTimeMs = Date.now() - startTime

  // レスポンスログ
  console.log(
    "[Gemini API] Response:",
    JSON.stringify(
      {
        responseTimeMs,
        usageMetadata: response.usageMetadata,
        candidateCount: response.candidates?.length ?? 0,
      },
      null,
      2
    )
  )

  // 画像を抽出
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error("Gemini APIからレスポンスが返りませんでした")
  }

  let imageBase64 = ""
  let mimeType = "image/png"

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data ?? ""
      mimeType = part.inlineData.mimeType ?? "image/png"
      break
    }
  }

  if (!imageBase64) {
    throw new Error("Gemini APIから画像が返りませんでした")
  }

  // トークン情報
  const usage = response.usageMetadata
  return {
    imageBase64,
    mimeType,
    promptTokens: usage?.promptTokenCount ?? 0,
    candidatesTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
    responseTimeMs,
  }
}
