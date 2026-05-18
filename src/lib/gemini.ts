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
// 環境要因分析（テキスト生成）
// ============================================================

export type FactorAnalysisResult = {
  content: string
  impact: "high" | "medium" | "low"
}

const FACTOR_TEXT_MODEL = "gemini-2.5-flash"

const factorSystemPrompts: Record<"weather" | "global" | "trend", string> = {
  weather:
    "あなたはアパレル企業の経営アドバイザーです。以下のニュース記事を読み、「気象・天候」の観点からアパレル企業の今週の経営判断（在庫・販売戦略など）に役立つアドバイスを100文字程度の日本語で作成してください。また、ビジネスへの影響度を high/medium/low で評価してください。必ず次のJSON形式のみで回答してください: {\"content\": \"アドバイス\", \"impact\": \"high|medium|low\"}",
  global:
    "あなたはアパレル企業の経営アドバイザーです。以下のニュース記事を読み、「国際情勢・物流・為替・原材料」の観点からアパレル企業の今週の経営判断に役立つアドバイスを100文字程度の日本語で作成してください。また、ビジネスへの影響度を high/medium/low で評価してください。必ず次のJSON形式のみで回答してください: {\"content\": \"アドバイス\", \"impact\": \"high|medium|low\"}",
  trend:
    "あなたはアパレル企業の経営アドバイザーです。以下のニュース記事を読み、「消費者トレンド・SNS・ファッション動向」の観点からアパレル企業の今週の経営判断に役立つアドバイスを100文字程度の日本語で作成してください。また、ビジネスへの影響度を high/medium/low で評価してください。必ず次のJSON形式のみで回答してください: {\"content\": \"アドバイス\", \"impact\": \"high|medium|low\"}",
}

export async function generateFactorAnalysis(
  factorType: "weather" | "global" | "trend",
  articles: { title: string; summary: string | null; publishedAt: Date }[],
  weekLabel: string,
): Promise<FactorAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  if (articles.length === 0) {
    return { content: "対象週のニュースデータがありません。", impact: "low" }
  }

  const ai = new GoogleGenAI({ apiKey })

  const articlesList = articles
    .slice(0, 30)
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? `\n   ${a.summary}` : ""}`)
    .join("\n")

  const prompt = `${factorSystemPrompts[factorType]}\n\n対象週: ${weekLabel}\n\nニュース記事一覧:\n${articlesList}`

  console.log("[generateFactorAnalysis] Request:", JSON.stringify({
    model: FACTOR_TEXT_MODEL,
    factorType,
    weekLabel,
    articleCount: articles.length,
    promptLength: prompt.length,
    prompt,
  }, null, 2))

  const response = await ai.models.generateContent({
    model: FACTOR_TEXT_MODEL,
    contents: [{ text: prompt }],
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

  console.log("[generateFactorAnalysis] Response:", JSON.stringify({
    factorType,
    rawText: text,
    usageMetadata: response.usageMetadata,
    finishReason: response.candidates?.[0]?.finishReason,
  }, null, 2))

  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) {
    console.error("[generateFactorAnalysis] JSON parse failed:", text)
    return { content: "分析結果の解析に失敗しました。", impact: "low" }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const impact = (["high", "medium", "low"] as const).includes(parsed.impact)
      ? (parsed.impact as "high" | "medium" | "low")
      : "low"
    return { content: String(parsed.content ?? "").slice(0, 150), impact }
  } catch {
    return { content: "分析結果の解析に失敗しました。", impact: "low" }
  }
}

// ============================================================
// カテゴリ別動向アドバイス（Google Search グラウンディング）
// ============================================================

export interface CategoryTrendAdviceResult {
  content: string
  trend: "up" | "down" | "stable"
}

export async function generateCategoryTrendAdvice(
  categoryName: string,
  weekLabel: string,
  prevWeekLabel: string,
): Promise<CategoryTrendAdviceResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  const ai = new GoogleGenAI({ apiKey })

  const prompt =
    `あなたはアパレル企業の経営アドバイザーです。` +
    `Google検索を使って、日本市場における「${categoryName}」カテゴリーの動向を調べてください。\n` +
    `【重要】参照する情報の期間を以下の2週間以内に厳密に限定してください:\n` +
    `・今週（${weekLabel}）\n` +
    `・前週（${prevWeekLabel}）\n` +
    `それ以前の情報は使用しないでください。\n\n` +
    `アパレル企業の経営判断（仕入れ・販売戦略など）に役立つアドバイスを作成してください。` +
    `提言や具体的な判断を含めて構いません。` +
    `また、この2週間の動向をもとにカテゴリーの需要トレンドを "up"（上昇）/ "down"（下降）/ "stable"（安定）で評価してください。\n` +
    `対象週: ${weekLabel}\n\n` +
    `必ず次のJSON形式のみで回答してください:\n` +
    `{"content": "アドバイス本文（200〜400文字）", "trend": "up|down|stable"}`

  console.log("[generateCategoryTrendAdvice] Request:", JSON.stringify({
    model: FACTOR_TEXT_MODEL,
    categoryName,
    weekLabel,
    grounding: true,
  }, null, 2))

  const response = await ai.models.generateContent({
    model: FACTOR_TEXT_MODEL,
    contents: [{ text: prompt }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const text = (parts.find((p) => p.text)?.text ?? "").trim()

  console.log("[generateCategoryTrendAdvice] Response:", JSON.stringify({
    categoryName,
    textLength: text.length,
    usageMetadata: response.usageMetadata,
    finishReason: response.candidates?.[0]?.finishReason,
  }, null, 2))

  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) {
    console.error("[generateCategoryTrendAdvice] JSON parse failed:", text)
    return { content: "動向の取得に失敗しました。", trend: "stable" }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const trend = (["up", "down", "stable"] as const).includes(parsed.trend)
      ? (parsed.trend as "up" | "down" | "stable")
      : "stable"
    return { content: String(parsed.content ?? "").slice(0, 400), trend }
  } catch {
    return { content: "動向の取得に失敗しました。", trend: "stable" }
  }
}

// ============================================================
// 週次ニュース要約（検索フィルター単位）
// ============================================================

export async function generateNewsSummary(
  queryName: string,
  articles: { title: string; summary: string | null; publishedAt: Date }[],
  weekLabel: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  if (articles.length === 0) {
    return "対象週のニュースデータがありません。"
  }

  const ai = new GoogleGenAI({ apiKey })

  const articlesList = articles
    .slice(0, 30)
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? `\n   ${a.summary}` : ""}`)
    .join("\n")

  const systemPrompt =
    "あなたは中立的な事実報告者です。以下のニュース記事に書かれた事実のみを日本語で要約してください。" +
    "【必須ルール】\n" +
    "・提言・推奨・示唆・アドバイスは一切含めないこと（「〜が重要です」「〜を検討すべき」「〜に注目が必要」等は禁止）\n" +
    "・記者・アナリストの意見や予測も、それが記事に明記されている場合のみ「〇〇は〜と述べた」「〜との見方が出ている」など出典を明示した形で引用すること\n" +
    "・スポーツ、芸能ゴシップ、個人の犯罪など、アパレル事業経営と無関係なニュースは要約から除外すること\n" +
    "【ボリューム配分】\n" +
    "・アパレル業界・ファッション・繊維・小売・消費動向・物流・為替・原材料に関するニュースを優先し、文字数を多く割り当てること\n" +
    "・言及記事数が少ないトピックは簡潔に触れる程度にとどめること\n" +
    "・記事全体が多く多様な場合は800文字程度、記事が少ないまたは内容が偏っている場合は内容量に応じて200文字程度まで縮小すること\n" +
    "箇条書きではなく自然な文章形式で記述してください。要約テキストのみ出力してください（JSONや前置き不要）。"

  const prompt = `${systemPrompt}\n\n対象週: ${weekLabel}\nフィルター名: ${queryName}\n\nニュース記事一覧:\n${articlesList}`

  console.log("[generateNewsSummary] Request:", JSON.stringify({
    model: FACTOR_TEXT_MODEL,
    queryName,
    weekLabel,
    articleCount: articles.length,
    promptLength: prompt.length,
  }, null, 2))

  const response = await ai.models.generateContent({
    model: FACTOR_TEXT_MODEL,
    contents: [{ text: prompt }],
  })

  const text = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim()

  console.log("[generateNewsSummary] Response:", JSON.stringify({
    queryName,
    textLength: text.length,
    usageMetadata: response.usageMetadata,
    finishReason: response.candidates?.[0]?.finishReason,
  }, null, 2))

  if (!text) {
    return "要約の生成に失敗しました。"
  }

  return text
}

// ============================================================
// 在庫データ分析アクション生成
// ============================================================

export interface InventoryActionResult {
  actionType: "procurement" | "sales_promotion" | "inventory" | "finance" | "category"
  title: string
  description: string
  priority: "high" | "medium" | "low"
}

export async function generateInventoryActionRecommendations(
  weekLabel: string,
  newsSummaries: { queryName: string; content: string }[],
  inventoryCsv: string,
  salesCsv: string,
): Promise<InventoryActionResult[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  const ai = new GoogleGenAI({ apiKey })

  const summaryText = newsSummaries.length > 0
    ? newsSummaries.map((s) => `【${s.queryName}】\n${s.content}`).join("\n\n")
    : "（ニュース要約なし）"

  const systemPrompt =
    `あなたはアパレル企業の経営コンサルタントです。以下の情報をもとに、経営者が即座に実行できる具体的なアクション候補を3件提案してください。\n\n` +
    `【提案の視点（優先順）】\n` +
    `1. 発注・仕入れの増減（数量調整、タイミング変更、取引先への交渉）\n` +
    `2. 在庫処分・活用（値引き販促、在庫移動、廃棄判断）\n` +
    `3. 販売戦略の調整（価格帯変更、販売チャネル）\n\n` +
    `【制約】\n` +
    `・在庫データ・売上データの実数値を根拠として含めること\n` +
    `・抽象的な提言ではなく具体的な商品名・ブランド名・金額を含めること（データに存在する場合）\n` +
    `・actionType は procurement / sales_promotion / inventory / finance / category のいずれか\n\n` +
    `必ず次のJSON配列のみで回答してください（3件）:\n` +
    `[{"actionType":"...", "title":"タイトル（30文字以内）", "description":"詳細説明（150文字以内）", "priority":"high|medium|low"}, ...]`

  const prompt =
    `${systemPrompt}\n\n` +
    `対象週: ${weekLabel}\n\n` +
    `## 今週のニュース要約\n${summaryText}\n\n` +
    `## 在庫スナップショットデータ（CSV）\n${inventoryCsv || "（データなし）"}\n\n` +
    `## 売上データ（CSV）\n${salesCsv || "（データなし）"}`

  console.log("[generateInventoryActionRecommendations] Request:", JSON.stringify({
    model: FACTOR_TEXT_MODEL,
    weekLabel,
    summaryCount: newsSummaries.length,
    inventoryRows: inventoryCsv.split("\n").length - 1,
    salesRows: salesCsv.split("\n").length - 1,
    promptLength: prompt.length,
  }, null, 2))

  const response = await ai.models.generateContent({
    model: FACTOR_TEXT_MODEL,
    contents: [{ text: prompt }],
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

  console.log("[generateInventoryActionRecommendations] Response:", JSON.stringify({
    rawText: text,
    usageMetadata: response.usageMetadata,
  }, null, 2))

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error("アクション候補の生成に失敗しました（JSON未検出）")
  }

  const parsed = JSON.parse(jsonMatch[0]) as InventoryActionResult[]
  return parsed.slice(0, 3).map((item) => ({
    actionType: (["procurement", "sales_promotion", "inventory", "finance", "category"] as const).includes(
      item.actionType as "procurement"
    )
      ? item.actionType
      : "inventory",
    title: String(item.title ?? "").slice(0, 30),
    description: String(item.description ?? "").slice(0, 150),
    priority: (["high", "medium", "low"] as const).includes(item.priority as "high")
      ? item.priority
      : "medium",
  }))
}

// ============================================================
// 経営判断レポート生成（Files API使用）
// ============================================================

export type ManagementReportInput = {
  lens: { id: string; label: string; description: string }
  customInstruction: string
  sections: Array<{
    label: string
    content: string
  }>
}

export type ManagementReportResult = {
  executiveSummary: string
  decisions: Array<{ title: string; body: string; source: string }>
  actions: Array<{ priority: number; body: string; timing: string }>
  riskNotes: string[]
  promptTokens: number
  totalTokens: number
}

const REPORT_MODEL = "gemini-2.5-flash"

export async function generateManagementReport(
  input: ManagementReportInput,
): Promise<ManagementReportResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  const ai = new GoogleGenAI({ apiKey })

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  const customInstructionNote = input.customInstruction
    ? `・customInstruction が指定されている場合は「追加条件: ${input.customInstruction}」を必ず1件含める`
    : ""

  const systemPrompt =
    `あなたはアパレル企業の経営コンサルタントです。\n` +
    `以下に提供するデータをもとに、${input.lens.label}（${input.lens.description}）の視点で経営判断レポートを作成してください。\n\n` +
    `レポート生成日時: ${now}\n` +
    `追加指示: ${input.customInstruction || "なし"}\n\n` +
    `## 出力形式\n\n` +
    `必ず次のJSON形式のみで回答してください。JSON以外のテキストは一切含めないでください。\n\n` +
    `{\n` +
    `  "executiveSummary": "string",\n` +
    `  "decisions": [\n` +
    `    { "title": "string", "body": "string", "source": "string" }\n` +
    `  ],\n` +
    `  "actions": [\n` +
    `    { "priority": number, "body": "string", "timing": "string" }\n` +
    `  ],\n` +
    `  "riskNotes": ["string"]\n` +
    `}\n\n` +
    `## 各フィールドの仕様\n\n` +
    `### executiveSummary\n` +
    `- 選択されたすべてのデータソースを横断した経営状況の総括を200〜400字で記述する\n` +
    `- 数値が含まれる場合は具体的な数値を引用して根拠を示す\n` +
    `- 「〜が必要です」「〜を優先すべきです」など判断として締める\n\n` +
    `### decisions（経営判断）\n` +
    `- 3〜5件を返す\n` +
    `- title: 領域を端的に示す10字以内の見出し（例: 「資金繰りの判断」）\n` +
    `- body: 60〜120字。具体的な数値や傾向を引用し「〜すべき」など意思決定として締める\n` +
    `- source: 根拠データソース名（例: 「ファイナンスフロー / 入出金シミュレーション」）\n\n` +
    `### actions（優先アクション）\n` +
    `- 3〜5件を返す\n` +
    `- priority: 1始まりの優先順位（1が最優先）\n` +
    `- body: 50〜100字。担当者が即日着手できる粒度にする\n` +
    `- timing: 「今週中」「今月中」「来月以降」のいずれか\n\n` +
    `### riskNotes（レポート作成時の前提）\n` +
    `- 1〜3件を返す\n` +
    `- レポートの判断精度に影響する前提条件・データ欠損・速報値の扱いなどを記載する\n` +
    customInstructionNote

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: systemPrompt }]

  for (const section of input.sections) {
    if (!section.content || section.content.trim().length === 0) continue
    parts.push({ text: `## ${section.label}\n${section.content}` })
  }

  console.log(`[generateManagementReport] Calling generateContent with ${parts.length} parts`)
  const response = await ai.models.generateContent({
    model: REPORT_MODEL,
    contents: [{ role: "user", parts }],
  })

  const text = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim()

  console.log("[generateManagementReport] Response:", JSON.stringify({
    model: REPORT_MODEL,
    lens: input.lens.id,
    sectionCount: input.sections.length,
    textLength: text.length,
    usageMetadata: response.usageMetadata,
  }, null, 2))

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("レポートの生成に失敗しました（JSON未検出）")

  const parsed = JSON.parse(jsonMatch[0])
  const usage = response.usageMetadata

  return {
    executiveSummary: String(parsed.executiveSummary ?? ""),
    decisions: Array.isArray(parsed.decisions)
      ? parsed.decisions.map((d: Record<string, unknown>) => ({
          title: String(d.title ?? ""),
          body: String(d.body ?? ""),
          source: String(d.source ?? ""),
        }))
      : [],
    actions: Array.isArray(parsed.actions)
      ? parsed.actions
          .map((a: Record<string, unknown>, i: number) => ({
            priority: typeof a.priority === "number" ? a.priority : i + 1,
            body: String(a.body ?? ""),
            timing: String(a.timing ?? "今月中"),
          }))
          .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
      : [],
    riskNotes: Array.isArray(parsed.riskNotes) ? parsed.riskNotes.map((n: unknown) => String(n)) : [],
    promptTokens: usage?.promptTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  }
}

// ============================================================
// Gemini Embedding
// ============================================================

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  const ai = new GoogleGenAI({ apiKey })
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
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
