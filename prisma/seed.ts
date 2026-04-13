import { PrismaClient, UserRole, ImportDataset, ImportStatus, IssueLevel } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ──────────────────────────────────────────────────────────────────────────────
// 季節別月次乗数 (インデックス 0=1月 … 11=12月)
// ──────────────────────────────────────────────────────────────────────────────
const SEASONAL: Record<string, number[]> = {
  SS_tops: [0.6, 0.8, 1.5, 1.8, 2.0, 1.8, 1.5, 1.2, 0.8, 0.6, 0.5, 0.4],
  AW:      [1.5, 0.8, 0.4, 0.3, 0.2, 0.2, 0.3, 0.5, 1.2, 1.8, 2.0, 1.8],
  bottoms: [0.8, 0.9, 1.2, 1.3, 1.2, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 0.8],
  misc:    [0.8, 0.8, 1.0, 1.0, 1.0, 0.9, 0.9, 1.0, 1.0, 1.1, 1.3, 1.5],
}
// 補充月 (その月の月初在庫に baseMo/variant×8 分を追加)
const REPLENISH_MONTHS: Record<string, number[]> = {
  SS_tops: [2],       // 2月に春夏補充
  AW:      [8],       // 8月に秋冬補充
  bottoms: [2, 9],    // 2月・9月
  misc:    [3, 9],    // 3月・9月
}

const mul = (pattern: string, month: number) => SEASONAL[pattern]?.[month - 1] ?? 1.0

// カテゴリ別目標在庫日数 (ProductCategory.sellThroughDays と同値)
const CATEGORY_TARGET_DAYS: Record<string, number> = {
  "トップス": 60,
  "アウター": 90,
  "ボトムス": 75,
  "小物":     60,
  "BAG":      90,
  "財布":     90,
  "首":       60,
  "ソックス": 45,
  "アンダー": 45,
}

// ──────────────────────────────────────────────────────────────────────────────
// 商品マスタ定義 (10商品 × 3バリアント = 30バリアント)
// ──────────────────────────────────────────────────────────────────────────────
// season: ユーザーが個別入力したと想定した仮値（SS=春夏/AW=秋冬/null=通年）
const PRODUCTS_DEF = [
  { code: "SKU001", name: "リネンシャツ",         brand: "UrbanLine",  bCode: "BR01", category: "トップス", iCode: "IT01", season: "SS",   price: 8900,  gpRate: 0.38, baseMo: 80,  pattern: "SS_tops", cs1: "春夏定番",
    variants: [{ color: "ベージュ",   size: "S",  jan: "4901000000001" }, { color: "ベージュ", size: "M",  jan: "4901000000002" }, { color: "ブルー",    size: "M",  jan: "4901000000003" }] },
  { code: "SKU002", name: "コットンポロシャツ",   brand: "RelaxWear",  bCode: "BR04", category: "トップス", iCode: "IT01", season: "SS",   price: 5800,  gpRate: 0.40, baseMo: 60,  pattern: "SS_tops", cs1: "春夏定番",
    variants: [{ color: "ホワイト",   size: "S",  jan: "4901000000004" }, { color: "ホワイト", size: "M",  jan: "4901000000005" }, { color: "ネイビー",  size: "M",  jan: "4901000000006" }] },
  { code: "SKU003", name: "デニムパンツ",         brand: "ActiveGear", bCode: "BR03", category: "ボトムス", iCode: "IT03", season: null,   price: 9800,  gpRate: 0.35, baseMo: 45,  pattern: "bottoms", cs1: "定番",
    variants: [{ color: "インディゴ", size: "28", jan: "4901000000007" }, { color: "インディゴ",size: "30", jan: "4901000000008" }, { color: "ブラック",  size: "30", jan: "4901000000009" }] },
  { code: "SKU005", name: "ウールコート",         brand: "LuxeCoat",   bCode: "BR02", category: "アウター", iCode: "IT02", season: "AW",   price: 28000, gpRate: 0.32, baseMo: 30,  pattern: "AW",      cs1: "秋冬定番",
    variants: [{ color: "グレー",     size: "S",  jan: "4901000000010" }, { color: "グレー",   size: "M",  jan: "4901000000011" }, { color: "ブラック",  size: "M",  jan: "4901000000012" }] },
  { code: "SKU010", name: "デニムパンツ",         brand: "RelaxWear",  bCode: "BR04", category: "ボトムス", iCode: "IT03", season: null,   price: 9800,  gpRate: 0.35, baseMo: 50,  pattern: "bottoms", cs1: "定番",
    variants: [{ color: "インディゴ", size: "28", jan: "4901000000013" }, { color: "インディゴ",size: "30", jan: "4901000000014" }, { color: "ブラック",  size: "30", jan: "4901000000015" }] },
  { code: "SKU011", name: "ワイドスラックス",     brand: "UrbanLine",  bCode: "BR01", category: "ボトムス", iCode: "IT03", season: null,   price: 12800, gpRate: 0.36, baseMo: 40,  pattern: "bottoms", cs1: "定番",
    variants: [{ color: "ベージュ",   size: "S",  jan: "4901000000016" }, { color: "ベージュ", size: "M",  jan: "4901000000017" }, { color: "ネイビー",  size: "M",  jan: "4901000000018" }] },
  { code: "SKU020", name: "ロゴTシャツ",         brand: "UrbanLine",  bCode: "BR01", category: "トップス", iCode: "IT01", season: "SS",   price: 4500,  gpRate: 0.42, baseMo: 100, pattern: "SS_tops", cs1: "春夏定番",
    variants: [{ color: "ホワイト",   size: "S",  jan: "4901000000019" }, { color: "ホワイト", size: "M",  jan: "4901000000020" }, { color: "ブラック",  size: "M",  jan: "4901000000021" }] },
  { code: "SKU030", name: "キャップ",             brand: "ActiveGear", bCode: "BR03", category: "小物",    iCode: "IT04", season: null,   price: 3800,  gpRate: 0.45, baseMo: 70,  pattern: "misc",    cs1: "定番",
    variants: [{ color: "ブラック",   size: "F",  jan: "4901000000022" }, { color: "ネイビー", size: "F",  jan: "4901000000023" }, { color: "ベージュ",  size: "F",  jan: "4901000000024" }] },
  { code: "SKU040", name: "ナイロンパーカ",       brand: "ActiveGear", bCode: "BR03", category: "トップス", iCode: "IT01", season: "AW",   price: 15000, gpRate: 0.37, baseMo: 55,  pattern: "AW",      cs1: "秋冬定番",
    variants: [{ color: "ブラック",   size: "S",  jan: "4901000000025" }, { color: "ブラック", size: "M",  jan: "4901000000026" }, { color: "オリーブ",  size: "M",  jan: "4901000000027" }] },
  { code: "PR0001", name: "多機能リュックサック", brand: "UrbanLine",  bCode: "BR01", category: "BAG",     iCode: "IT05", season: null,   price: 18000, gpRate: 0.40, baseMo: 25,  pattern: "misc",    cs1: "定番",
    variants: [{ color: "ブラック",   size: "F",  jan: "4901000000028" }, { color: "ネイビー", size: "F",  jan: "4901000000029" }, { color: "グレー",    size: "F",  jan: "4901000000030" }] },
] as const

// ── DataImport ID 定数 ────────────────────────────────────────────────────────
const SALES_2025_ID      = "dd000001-0000-0000-0000-000000000001"
const SALES_2026_ID      = "dd000001-0000-0000-0000-000000000002"
const SNAP_2025_ID       = "dd000002-0000-0000-0000-000000000001"
const SNAP_2026_ID       = "dd000002-0000-0000-0000-000000000002"
const ALERT_SNAP_ID      = "dd000003-0000-0000-0000-000000000001"
const ALERT_SALES_ID     = "dd000003-0000-0000-0000-000000000002"

// ── 対象月リスト ──────────────────────────────────────────────────────────────
const SALES_MONTHS: [number, number][] = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [2025, m] as [number, number]),
  ...[1,2,3].map(m => [2026, m] as [number, number]),
]
const SNAP_MONTHS: [number, number][] = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [2025, m] as [number, number]),
  ...[1,2].map(m => [2026, m] as [number, number]),
]

// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding database...")

  // ── ユーザー ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demopass", 10)
  const user = await prisma.userAccount.upsert({
    where: { email: "owner@apparel.jp" },
    update: { passwordHash },
    create: { email: "owner@apparel.jp", name: "オーナー", passwordHash, role: UserRole.admin },
  })
  await prisma.userAccount.upsert({
    where: { email: "testuser@apparel.jp" },
    update: {},
    create: { email: "testuser@apparel.jp", name: "テストユーザー", passwordHash: await bcrypt.hash("testpass", 10), role: UserRole.general },
  })
  console.log(`✓ Users`)

  // ── デザインアセット ─────────────────────────────────────────────────────────
  const designAssets = [
    { id: "c72611a3-5447-42da-8fea-298a6c5a9415", type: "pop" as const, title: "大売出し",
      prompt: "Create a promotional POP design for retail display.\nStyle: modern minimalist design, clean lines, geometric shapes.\nCatchphrase text to display: \"いちおし商品、大集合！\"\nMain text to display: \"○○メッセ西館１F 9:00~18:00\"\nAdditional requirements: 参照画像のカバンたちを全体にちりばめた歳末売り尽くしセールのためのPOPをつくってください。特に[image 9] を前面に押し出して、モダンな雰囲気を意識してください。\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: "modern", color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771550472097-mk5i1k57.jpg" },
    { id: "7a321604-24bb-406a-95e7-7efe41f93143", type: "pop" as const, title: "巾着ショルダー",
      prompt: "Create a promotional POP design for retail display.\nStyle: elegant luxury design, sophisticated, refined aesthetics.\nUse #a7f3d0 as the primary color scheme.\nCatchphrase text to display: \"「ちょっとコンビニへ」　...そんなひとときもスタイリッシュに。\"\nMain text to display: \"Healthknit Product 2way巾着ショルダー\"\nAdditional requirements: [image 2] は新発売の商品「巾着ショルダー」の正面画像です。その他の画像は細部を移したものです。若い女性にアプローチしたいので、アクティブでありながら洗練されたおしゃれ感を演出するPOPを考えてください。\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: "elegant", color: "#a7f3d0", ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771551130048-a72wkvwa.jpg" },
    { id: "164d1043-85b2-416f-983f-0057b3b37334", type: "pop" as const, title: "新作発売！",
      prompt: "Create a promotional POP design for retail display.\nStyle: casual friendly design, warm, approachable.\nUse #fbbf24 as the primary color scheme.\nCatchphrase text to display: \"大容量！\"\nAdditional requirements: [image 1] が今回売り出す新作リュックです。元気な感じの雰囲気でPOPを作成してください。\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: "casual", color: "#fbbf24", ratio: "A4",
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771569119365-eifcdm4m.jpg" },
    { id: "f69f0f3f-0679-4d18-955a-af4552d5b100", type: "pop" as const, title: "ラクガキバッグ",
      prompt: "Create a promotional POP design for retail display.\nAdditional requirements: 中央に置かれたバッグをストリートスタイルの青年が抱えているような画像にして\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: null, color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1772005088250-mok57kog.jpg" },
    { id: "426619c2-c6d5-4046-81dc-a0ab2dc81c5d", type: "pop" as const, title: "紅葉ピクニック",
      prompt: "Create a promotional POP design for retail display.\nAdditional requirements: 秋らしい紅葉バージョンにして\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: null, color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1772010927678-adzoi5sl.jpg" },
    { id: "f088b3f0-bc77-4b07-998f-d9685ca0fc93", type: "pop" as const, title: "new arrival",
      prompt: "Create a promotional POP design for retail display.\nAdditional requirements: シックな雰囲気に変えてほしい\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: null, color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1772011062667-8kkm0joo.jpg" },
    { id: "9071df2c-1c06-434f-af08-33a765ca46e4", type: "pop" as const, title: "カメラバッグのPOP",
      prompt: "Create a promotional POP design for retail display.\nStyle: retro vintage design, nostalgic colors, classic typography.\nCatchphrase text to display: \"持ち運びたいのは、思い出\"\nMain text to display: \"Healthknit Product カメラバッグ HKB-1084\"\nAdditional requirements: 商品着用モデルとしてセミロングヘアの女性を中央に配置してください。女性は肩から[image 1] を提げてがカメラを構えて趣味に没入しています。穏やかで日常的な生活の自然風景の中にたたずんでいます\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: "retro", color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771230620418-vy8pj96a.png" },
    { id: "b2db981a-656d-4452-9c53-7a5c5adc04b4", type: "pop" as const, title: "スリングバッグ",
      prompt: "Create a promotional POP design for retail display.\nCatchphrase text to display: \"カッコよさも\\n機能性も、\\nどちらも譲れない。\"\nMain text to display: \"¥8,690 (税抜 ¥7,900)\"\nAdditional requirements: 晴れた日の明るい日本の街並みを背景に、20代から40代くらいの清潔感のある日本人男性が、クロスバイクなどの自転車に乗って颯爽と走っている。彼はネイビーのスリングバッグ[image 1] を体にフィットするように斜めがけにしている。服装はシックなカジュアルスタイルで、快活な印象。\n画像の上部または余白の読みやすい位置に、洗練された細身のゴシック体フォントでCatchphrase を配置。\n商品の近くまたは下部に、視認性の高い細めのフォントで Main textを配置。\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: null, color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771303409774-8lieqs0i.jpg" },
    { id: "8e86d072-20c3-4aea-933d-47db8c934e54", type: "pop" as const, title: "新色発売",
      prompt: "Create a promotional POP design for retail display.\nStyle: casual friendly design, warm, approachable.\nCatchphrase text to display: \"新色登場\"\nMain text to display: \"11ポケット撥水リュック\"\nAdditional requirements: あるリュックサックシリーズの新色登場を宣伝するPOPを作成します。3つの画像のリュックサックが寄り添いあって置かれている様子を中央に配置してください。新しい季節が到来したような心躍るイメージを持たせてください\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: "casual", color: null, ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771305513839-ff8z6zxf.jpg" },
    { id: "059f085a-d7eb-452b-a081-2d2e6d989286", type: "pop" as const, title: "新色取り扱い開始",
      prompt: "Create a promotional POP design for retail display.\nCatchphrase text to display: \"新色も登場\"\nMain text to display: \"Healthknit Product ライトデイパック HKB-1226\"\nAdditional requirements: [image 1] は、この商品の新色（ラベンダー）です。[image 2] [image 3] は、この商品の従来の定番色を違う角度から撮影したものです。若く活動的な女性向けのPOPを作成してください。よく晴れた街中を背景に、商品を着用した女性モデル（カジュアルで薄手の服装）が、颯爽と歩きだす様子を描写してください。\nMake the design eye-catching, professional, and suitable for apparel retail business.",
      style: null, color: null, ratio: "A4",
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/03/1773015913780-6857bgvf.jpg" },
  ]
  for (const asset of designAssets) {
    await prisma.designAsset.upsert({ where: { id: asset.id }, update: {}, create: { ...asset, createdBy: user.id } })
  }
  console.log(`✓ Design assets (${designAssets.length}件)`)

  // ── DataImport (既存8件 + 在庫分析用4件) ────────────────────────────────────
  const importSeed = [
    { id: "a1b2c3d4-0001-0001-0001-000000000001", dataset: ImportDataset.sales,             fileName: "sales_2024-12.csv",          status: ImportStatus.success,  summary: "全レコードが正常に取り込まれました。",             importedAt: new Date("2024-12-20T10:30:00+09:00"), rowsTotal: 12450, rowsSuccess: 12450, rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0001-000000000002", dataset: ImportDataset.sales,             fileName: "sales_2024-11.csv",          status: ImportStatus.success,  summary: "売上データを問題なく取り込みました。",               importedAt: new Date("2024-11-25T09:12:00+09:00"), rowsTotal: 11980, rowsSuccess: 11980, rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0002-000000000001", dataset: ImportDataset.payables,          fileName: "payables_2024-12.xlsx",      status: ImportStatus.success,  summary: "支払い予定データが正常に取り込まれました。",           importedAt: new Date("2024-12-18T14:02:00+09:00"), rowsTotal: 3580,  rowsSuccess: 3580,  rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0002-000000000002", dataset: ImportDataset.payables,          fileName: "payables_2024-11.xlsx",      status: ImportStatus.partial,  summary: "一部欠損行を除外して取り込みました。", note: "数行の欠損あり", importedAt: new Date("2024-11-20T13:50:00+09:00"), rowsTotal: 3400,  rowsSuccess: 3380,  rowsSkipped: 20, warningsCount: 2, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0003-000000000001", dataset: ImportDataset.receivables,       fileName: "receivables_2024-12.csv",    status: ImportStatus.success,  summary: "入金予定データを問題なく取り込みました。",             importedAt: new Date("2024-12-19T16:20:00+09:00"), rowsTotal: 6720,  rowsSuccess: 6720,  rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0003-000000000002", dataset: ImportDataset.receivables,       fileName: "receivables_2024-11.csv",    status: ImportStatus.success,  summary: "入金予定データを問題なく取り込みました。",             importedAt: new Date("2024-11-22T11:05:00+09:00"), rowsTotal: 6550,  rowsSuccess: 6550,  rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0004-000000000001", dataset: ImportDataset.gross_profit,      fileName: "profit_2024.csv",            status: ImportStatus.success,  summary: "年度粗利データが正常に取り込まれました。",             importedAt: new Date("2024-12-10T08:45:00+09:00"), rowsTotal: 980,   rowsSuccess: 980,   rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: "a1b2c3d4-0001-0001-0004-000000000002", dataset: ImportDataset.gross_profit,      fileName: "profit_2023.csv",            status: ImportStatus.failed,   summary: "フォーマット不一致のため取り込みに失敗しました。", note: "フォーマット不一致", importedAt: new Date("2024-11-01T08:45:00+09:00"), rowsTotal: 960, rowsSuccess: 0, rowsSkipped: 0, warningsCount: 0, errorsCount: 3 },
    { id: SALES_2025_ID,                          dataset: ImportDataset.sales,             fileName: "sales_2025_annual.csv",      status: ImportStatus.success,  summary: "2025年売上データ（年間）を取り込みました。",           importedAt: new Date("2025-12-31T09:00:00+09:00"), rowsTotal: 360,   rowsSuccess: 360,   rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: SALES_2026_ID,                          dataset: ImportDataset.sales,             fileName: "sales_2026_ytd.csv",         status: ImportStatus.success,  summary: "2026年売上データ（1-3月）を取り込みました。",          importedAt: new Date("2026-03-05T09:00:00+09:00"), rowsTotal: 90,    rowsSuccess: 90,    rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: SNAP_2025_ID,                           dataset: ImportDataset.inventory_snapshot, fileName: "inventory_snap_2025.csv",   status: ImportStatus.success,  summary: "2025年月次在庫スナップショットを取り込みました。",      importedAt: new Date("2025-12-31T09:00:00+09:00"), rowsTotal: 360,   rowsSuccess: 360,   rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    { id: SNAP_2026_ID,                           dataset: ImportDataset.inventory_snapshot, fileName: "inventory_snap_2026_jan_feb.csv", status: ImportStatus.success, summary: "2026年1-2月在庫スナップショットを取り込みました。", importedAt: new Date("2026-02-28T18:00:00+09:00"), rowsTotal: 60,    rowsSuccess: 60,    rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
  ] as const
  for (const imp of importSeed) {
    await prisma.dataImport.upsert({ where: { id: imp.id }, update: {}, create: { ...imp, importedBy: user.id } })
  }
  console.log(`✓ DataImport (${importSeed.length}件)`)

  // DataImportIssue
  const issueSeed = [
    { id: "b1000000-0000-0000-0000-000000000001", importId: "a1b2c3d4-0001-0001-0002-000000000002", level: IssueLevel.warning, message: "仕入先コードが未設定の行が20件ありスキップしました。", rowNumber: null, columnName: null },
    { id: "b1000000-0000-0000-0000-000000000002", importId: "a1b2c3d4-0001-0001-0002-000000000002", level: IssueLevel.warning, message: "日付形式の揺れが2件あり自動補正しました。",             rowNumber: null, columnName: null },
    { id: "b1000000-0000-0000-0000-000000000003", importId: "a1b2c3d4-0001-0001-0004-000000000002", level: IssueLevel.error,   message: "列数が想定と一致しません（期待: 12列 / 実際: 9列）。", rowNumber: null, columnName: null },
    { id: "b1000000-0000-0000-0000-000000000004", importId: "a1b2c3d4-0001-0001-0004-000000000002", level: IssueLevel.error,   message: "必須列「gross_margin」が見つかりません。",           rowNumber: null, columnName: null },
    { id: "b1000000-0000-0000-0000-000000000005", importId: "a1b2c3d4-0001-0001-0004-000000000002", level: IssueLevel.error,   message: "日付列「month」がYYYY-MM形式ではありません。",        rowNumber: null, columnName: null },
  ] as const
  for (const issue of issueSeed) {
    await prisma.dataImportIssue.upsert({ where: { id: issue.id }, update: {}, create: issue })
  }
  console.log(`✓ DataImportIssue`)

  // ── ProductBrand ─────────────────────────────────────────────────────────────
  const brands = [
    { brandCode: "BR01", name: "UrbanLine" },
    { brandCode: "BR02", name: "LuxeCoat" },
    { brandCode: "BR03", name: "ActiveGear" },
    { brandCode: "BR04", name: "RelaxWear" },
  ]
  for (const b of brands) {
    await prisma.productBrand.upsert({ where: { name: b.name }, update: { brandCode: b.brandCode }, create: b })
  }
  console.log(`✓ ProductBrand`)

  // ── ProductCategory (sellThroughDays を現実的な値に更新) ─────────────────────
  const categories = [
    { categoryCode: "IT01", name: "トップス", sellThroughDays: 60 },
    { categoryCode: "IT02", name: "アウター", sellThroughDays: 90 },
    { categoryCode: "IT03", name: "ボトムス", sellThroughDays: 75 },
    { categoryCode: "IT04", name: "小物",     sellThroughDays: 60 },
    { categoryCode: "IT05", name: "BAG",      sellThroughDays: 90 },
    { categoryCode: "IT06", name: "財布",     sellThroughDays: 90 },
    { categoryCode: "IT07", name: "首",       sellThroughDays: 60 },
    { categoryCode: "IT08", name: "ソックス", sellThroughDays: 45 },
    { categoryCode: "IT09", name: "アンダー", sellThroughDays: 45 },
  ]
  for (const cat of categories) {
    await prisma.productCategory.upsert({ where: { name: cat.name }, update: { categoryCode: cat.categoryCode, sellThroughDays: cat.sellThroughDays }, create: cat })
  }
  console.log(`✓ ProductCategory`)

  // ── RecurringEntry（固定費） ───────────────────────────────────────────────────
  const recurringEntrySeed = [
    { id: "fc000001-0000-0000-0000-000000000001", description: "家賃",            amountYen: BigInt(980000),  flow: "expense" as const, category: "固定費", dueDay: 25, sortOrder: 0 },
    { id: "fc000001-0000-0000-0000-000000000002", description: "人件費",          amountYen: BigInt(4200000), flow: "expense" as const, category: "固定費", dueDay: 25, sortOrder: 1 },
    { id: "fc000001-0000-0000-0000-000000000003", description: "物流費",          amountYen: BigInt(620000),  flow: "expense" as const, category: "固定費", dueDay: 20, sortOrder: 2 },
    { id: "fc000001-0000-0000-0000-000000000004", description: "SaaS / システム", amountYen: BigInt(180000),  flow: "expense" as const, category: "固定費", dueDay: 15, sortOrder: 3 },
  ]
  for (const re of recurringEntrySeed) {
    await prisma.recurringEntry.upsert({ where: { id: re.id }, update: {}, create: re })
  }
  console.log(`✓ RecurringEntry（固定費）`)

  // ── BusinessPartner / Supplier / Customer（固定UUID） ────────────────────────
  // ファクトテーブルから参照される authoritative レコード
  const BP_OSAKA_ID    = "c0000001-0000-0000-0001-000000000001"
  const BP_KYOTO_ID    = "c0000001-0000-0000-0001-000000000002"
  const BP_MINAOMI_ID  = "c0000001-0000-0000-0002-000000000001"
  const BP_HOKURIKU_ID = "c0000001-0000-0000-0002-000000000002"
  const BP_TOKYO_ID    = "c0000001-0000-0000-0002-000000000003"
  const BP_HANSHIN_ID  = "c0000001-0000-0000-0002-000000000004"

  const supplierPartners = [
    { id: BP_OSAKA_ID, name: "大阪繊維", closingDay: 31, paymentMonthOffset: 1, paymentDay: 15 },
    { id: BP_KYOTO_ID, name: "京都染工", closingDay: 31, paymentMonthOffset: 2, paymentDay: 30 },
  ]
  for (const s of supplierPartners) {
    await prisma.businessPartner.upsert({ where: { id: s.id }, update: {}, create: { id: s.id, name: s.name } })
    await prisma.supplier.upsert({
      where: { businessPartnerId: s.id },
      create: { businessPartnerId: s.id, closingDay: s.closingDay, paymentMonthOffset: s.paymentMonthOffset, paymentDay: s.paymentDay },
      update: { closingDay: s.closingDay, paymentMonthOffset: s.paymentMonthOffset, paymentDay: s.paymentDay },
    })
  }

  const customerPartners = [
    { id: BP_MINAOMI_ID,  name: "南青山セレクト",   closingDay: 30, collectionMonthOffset: 0, collectionDay: 28 },
    { id: BP_HOKURIKU_ID, name: "北陸百貨店",        closingDay: 31, collectionMonthOffset: 1, collectionDay: 30 },
    { id: BP_TOKYO_ID,    name: "東京ファッション",  closingDay: 31, collectionMonthOffset: 1, collectionDay: 25 },
    { id: BP_HANSHIN_ID,  name: "阪神商事",          closingDay: 31, collectionMonthOffset: 1, collectionDay: 25 },
  ]
  for (const c of customerPartners) {
    await prisma.businessPartner.upsert({ where: { id: c.id }, update: {}, create: { id: c.id, name: c.name } })
    await prisma.customer.upsert({
      where: { businessPartnerId: c.id },
      create: { businessPartnerId: c.id, closingDay: c.closingDay, collectionMonthOffset: c.collectionMonthOffset, collectionDay: c.collectionDay },
      update: { closingDay: c.closingDay, collectionMonthOffset: c.collectionMonthOffset, collectionDay: c.collectionDay },
    })
  }
  console.log(`✓ BusinessPartner + Supplier + Customer (${supplierPartners.length + customerPartners.length}件)`)

  // ── ブランド→取引先マッピング（SalesFact 生成用） ─────────────────────────────
  const BRAND_TO_CUSTOMER: Record<string, { code: string; name: string; partnerId: string }> = {
    "UrbanLine":  { code: "C01", name: "南青山セレクト",  partnerId: BP_MINAOMI_ID },
    "LuxeCoat":   { code: "C02", name: "北陸百貨店",      partnerId: BP_HOKURIKU_ID },
    "ActiveGear": { code: "C03", name: "東京ファッション", partnerId: BP_TOKYO_ID },
    "RelaxWear":  { code: "C04", name: "阪神商事",         partnerId: BP_HANSHIN_ID },
  }

  // ── ReservePolicy ─────────────────────────────────────────────────────────────
  const reservePolicySeed = [
    { id: "aa000001-0000-0000-0000-000000000001", name: "緊急準備金", description: "不測の事態への備え",       percent: "10", sortOrder: 0 },
    { id: "aa000001-0000-0000-0000-000000000002", name: "季節仕入れ", description: "シーズン商品の仕入れ資金", percent: "15", sortOrder: 1 },
    { id: "aa000001-0000-0000-0000-000000000003", name: "設備更新",   description: "店舗設備の更新・修繕",     percent:  "5", sortOrder: 2 },
    { id: "aa000001-0000-0000-0000-000000000004", name: "事業拡大",   description: "新店舗・新事業への投資",   percent: "10", sortOrder: 3 },
  ]
  for (const rp of reservePolicySeed) {
    await prisma.reservePolicy.upsert({ where: { id: rp.id }, update: {}, create: rp })
  }
  console.log(`✓ ReservePolicy`)

  // ── Warehouse ────────────────────────────────────────────────────────────────
  const warehouseId = "eeee0001-0000-0000-0000-000000000001"
  await prisma.warehouse.upsert({ where: { id: warehouseId }, update: {}, create: { id: warehouseId, name: "本社倉庫" } })
  console.log(`✓ Warehouse`)

  // ── ファクトテーブル全クリア ──────────────────────────────────────────────────
  // (SalesFact/InventorySnapshot は新規データで完全置換する)
  await prisma.procurementItem.deleteMany({})
  await prisma.procurementList.deleteMany({})
  await prisma.inventoryStock.deleteMany({})
  await prisma.salesFact.deleteMany({})
  await prisma.inventorySnapshotFact.deleteMany({})
  await prisma.productVariant.deleteMany({})
  console.log(`✓ Cleared fact tables & variants`)

  // ── Product (10件) ───────────────────────────────────────────────────────────
  const brandMap = new Map<string, string>()
  for (const b of brands) {
    const found = await prisma.productBrand.findUnique({ where: { name: b.name } })
    if (found) brandMap.set(b.name, found.id)
  }
  const catMap = new Map<string, string>()
  for (const c of categories) {
    const found = await prisma.productCategory.findUnique({ where: { name: c.name } })
    if (found) catMap.set(c.name, found.id)
  }

  for (const p of PRODUCTS_DEF) {
    await prisma.product.upsert({
      where: { productCode: p.code },
      update: { name: p.name, brandId: brandMap.get(p.brand) ?? null, categoryId: catMap.get(p.category) ?? null, season: p.season ?? null },
      create: { productCode: p.code, name: p.name, brandId: brandMap.get(p.brand) ?? null, categoryId: catMap.get(p.category) ?? null, season: p.season ?? null },
    })
  }
  console.log(`✓ Product (${PRODUCTS_DEF.length}件)`)

  // ── ProductVariant (30件) & InventoryStock ───────────────────────────────────
  const productMap = new Map<string, string>()
  for (const p of PRODUCTS_DEF) {
    const found = await prisma.product.findUnique({ where: { productCode: p.code } })
    if (found) productMap.set(p.code, found.id)
  }

  // 最新スナップショット(2026-02)から実在庫を InventoryStock に反映するため
  // スナップショット生成と同じロジックで2026-02 closing_qty を先計算
  const latestStockMap = new Map<string, number>() // jan_code → closing_qty at 2026-02

  for (const p of PRODUCTS_DEF) {
    const productId = productMap.get(p.code)!
    const nVariants = p.variants.length
    const basePerVariant = Math.round(p.baseMo / nVariants)
    const replenishQty = basePerVariant * 8
    const replenishMonths = REPLENISH_MONTHS[p.pattern] ?? []

    for (const v of p.variants) {
      await prisma.productVariant.create({
        data: { productId, color: v.color, size: v.size, janCode: v.jan, priceYen: BigInt(p.price) },
      })

      // 2026-02 closing_qty をシミュレーション
      let qty = basePerVariant * 8
      for (const [year, month] of SNAP_MONTHS) {
        const open = qty
        const replenish = replenishMonths.includes(month) ? replenishQty : 0
        const sold = Math.max(1, Math.round(basePerVariant * mul(p.pattern, month)))
        qty = Math.max(0, open + replenish - sold)
      }
      latestStockMap.set(v.jan, qty)
    }
  }
  console.log(`✓ ProductVariant (30件)`)

  // InventoryStock (最新スナップショット時点の在庫を反映)
  for (const p of PRODUCTS_DEF) {
    const productId = productMap.get(p.code)!
    for (const v of p.variants) {
      const pv = await prisma.productVariant.findFirst({ where: { productId, janCode: v.jan } })
      if (!pv) continue
      await prisma.inventoryStock.create({
        data: { variantId: pv.id, warehouseId, onHand: latestStockMap.get(v.jan) ?? 0 },
      })
    }
  }
  console.log(`✓ InventoryStock (30件)`)

  // ── PayablesFact (periodYm + businessPartnerId 付き) ─────────────────────────
  const PAYABLES_MONTHS = [
    new Date("2025-09-01"), new Date("2025-10-01"), new Date("2025-11-01"),
    new Date("2025-12-01"), new Date("2026-01-01"), new Date("2026-02-01"),
    new Date("2026-03-01"), new Date("2026-04-01"), new Date("2026-05-01"),
    new Date("2026-06-01"),
  ]
  const payablesBase = [
    { vendorName: "大阪繊維", vendorShort: "大阪繊維", businessPartnerId: BP_OSAKA_ID, prevBalanceYen: BigInt(820000), paymentYen: BigInt(1180000), carryoverYen: BigInt(0), netPurchaseYen: BigInt(1250000), purchaseYen: BigInt(1250000), returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0), taxYen: BigInt(125000), purchaseTaxInYen: BigInt(1375000), monthEndBalanceYen: BigInt(940000), cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(1180000), billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0) },
    { vendorName: "京都染工", vendorShort: "京都染工", businessPartnerId: BP_KYOTO_ID,  prevBalanceYen: BigInt(540000), paymentYen: BigInt(760000),  carryoverYen: BigInt(0), netPurchaseYen: BigInt(820000),  purchaseYen: BigInt(820000),  returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0), taxYen: BigInt(82000),  purchaseTaxInYen: BigInt(902000),  monthEndBalanceYen: BigInt(600000), cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(760000),  billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0) },
  ]
  const payImportId = "a1b2c3d4-0001-0001-0002-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < payablesBase.length; j++) {
      const base = payablesBase[j]
      await prisma.payablesFact.upsert({
        where: { id: `c2${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001` },
        update: { businessPartnerId: base.businessPartnerId, periodYm: PAYABLES_MONTHS[i] },
        create: { id: `c2${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001`, importId: payImportId, ...base, periodYm: PAYABLES_MONTHS[i], paymentYen: base.paymentYen + BigInt(i * 10000), monthEndBalanceYen: base.monthEndBalanceYen + BigInt(i * 5000) },
      })
    }
  }
  console.log(`✓ PayablesFact (20件)`)

  // ── ReceivablesFact (periodYm + businessPartnerId 付き) ──────────────────────
  const recBase = [
    { staffName: "佐藤", customerName: "南青山セレクト", customerShort: "南青山", businessPartnerId: BP_MINAOMI_ID,  prevBalanceYen: BigInt(420000), receivedYen: BigInt(980000),  carryoverYen: BigInt(0), netSalesYen: BigInt(1080000), salesYen: BigInt(1080000), returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0), taxYen: BigInt(108000), salesTaxInYen: BigInt(1188000), monthEndBalanceYen: BigInt(520000),  cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(980000),  billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0), npCreditYen: BigInt(1200000), npPaymentsYen: BigInt(300000), creditLimitBalanceYen: BigInt(900000), notes: "主要卸先" },
    { staffName: "田中", customerName: "北陸百貨店",     customerShort: "北陸",   businessPartnerId: BP_HOKURIKU_ID, prevBalanceYen: BigInt(680000), receivedYen: BigInt(620000),  carryoverYen: BigInt(0), netSalesYen: BigInt(940000),  salesYen: BigInt(940000),  returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0), taxYen: BigInt(94000),  salesTaxInYen: BigInt(1034000), monthEndBalanceYen: BigInt(1000000), cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(620000),  billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0), npCreditYen: BigInt(900000),  npPaymentsYen: BigInt(120000), creditLimitBalanceYen: BigInt(780000), notes: "新規拡大" },
  ]
  const recImportId = "a1b2c3d4-0001-0001-0003-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < recBase.length; j++) {
      const base = recBase[j]
      await prisma.receivablesFact.upsert({
        where: { id: `c3${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001` },
        update: { businessPartnerId: base.businessPartnerId, periodYm: PAYABLES_MONTHS[i] },
        create: { id: `c3${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001`, importId: recImportId, ...base, periodYm: PAYABLES_MONTHS[i], receivedYen: base.receivedYen + BigInt(i * 10000), monthEndBalanceYen: base.monthEndBalanceYen + BigInt(i * 8000) },
      })
    }
  }
  console.log(`✓ ReceivablesFact (20件)`)

  // ── GrossProfitFact ──────────────────────────────────────────────────────────
  const gpBase = [
    { staffName: "佐藤", fiscalYear: 2024, customerCategory1Code: "C01", customerCategory1Name: "セレクトA", netQty: 1320, listPriceYen: BigInt(8600),  netSalesYen: BigInt(10980000), returnYen: BigInt(0), grossProfitYen: BigInt(3920000), grossProfitRate: 35.7 },
    { staffName: "田中", fiscalYear: 2024, customerCategory1Code: "C02", customerCategory1Name: "百貨店B",   netQty:  760, listPriceYen: BigInt(21500), netSalesYen: BigInt(16340000), returnYen: BigInt(0), grossProfitYen: BigInt(4860000), grossProfitRate: 29.7 },
  ]
  const gpImportId = "a1b2c3d4-0001-0001-0004-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < gpBase.length; j++) {
      const base = gpBase[j]
      await prisma.grossProfitFact.upsert({
        where: { id: `c4${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001` },
        update: {},
        create: { id: `c4${String(i).padStart(6,"0")}-0000-0000-${String(j+1).padStart(4,"0")}-000000000001`, importId: gpImportId, ...base, fiscalYear: base.fiscalYear - (i % 3), netQty: base.netQty + i * 20, netSalesYen: base.netSalesYen + BigInt(i * 100000) },
      })
    }
  }
  console.log(`✓ GrossProfitFact (20件)`)

  // ──────────────────────────────────────────────────────────────────────────────
  // SalesFact (10商品 × 3バリアント × 15ヶ月 = 450行)
  // バリアント単位で作成し、product_code → product → category のJOINが機能する
  // 2026年は前年比 +5% 成長を反映
  // ──────────────────────────────────────────────────────────────────────────────

  // ブランド → 得意先マッピング（BP IDは上部で定義済み）

  const salesRows: NonNullable<Parameters<typeof prisma.salesFact.createMany>[0]>["data"] = []

  for (const p of PRODUCTS_DEF) {
    const nVariants = p.variants.length
    const basePerVariant = Math.round(p.baseMo / nVariants)
    const unitPrice = p.price
    const customer = BRAND_TO_CUSTOMER[p.brand] ?? { code: "C99", name: "その他", partnerId: null as string | null }

    for (const v of p.variants) {
      for (const [year, month] of SALES_MONTHS) {
        const growth = year === 2026 ? 1.05 : 1.0
        const netQty = Math.max(1, Math.round(basePerVariant * mul(p.pattern, month) * growth))
        const netSalesYen = BigInt(Math.round(netQty * unitPrice * 0.97)) // 3%値引き想定
        const grossProfitYen = BigInt(Math.round(netQty * unitPrice * p.gpRate))
        salesRows.push({
          importId: year === 2025 ? SALES_2025_ID : SALES_2026_ID,
          businessPartnerId: customer.partnerId,
          customerCategory1Code: customer.code,
          customerCategory1Name: customer.name,
          brandCode: p.bCode,
          brandName: p.brand,
          itemCode: p.iCode,
          itemName: p.category,
          productCode: p.code,
          productName1: p.name,
          productName2: v.color,
          cs1Name: p.cs1,
          janCode: v.jan,
          periodYm: new Date(`${year}-${String(month).padStart(2,"0")}-01`),
          salesDate: new Date(`${year}-${String(month).padStart(2,"0")}-15`),
          netQty,
          listPriceYen: BigInt(unitPrice),
          netSalesYen,
          returnYen: BigInt(0),
          grossProfitYen,
          grossProfitRate: p.gpRate * 100,
        })
      }
    }
  }

  await prisma.salesFact.createMany({ data: salesRows })
  console.log(`✓ SalesFact (${salesRows.length}行)`)

  // ──────────────────────────────────────────────────────────────────────────────
  // InventorySnapshotFact (10商品 × 3バリアント × 14ヶ月 = 420行)
  // 月次在庫量をカテゴリ目標在庫日数ベースで設定:
  //   - base_closing = round(targetDays/30 × basePerVariant)  ← 目標在庫量
  //   - seasonal_adj = round(basePerVariant × (1 - mul) × 0.5) ← オフシーズンに在庫積み増し
  //   - closing_qty  = max(5, base_closing + seasonal_adj)
  //   - closing_yen  = closing_qty × 売価 (retail price ベース)
  //     ※ net_sales_yen も売価ベースなので回転率計算のベースを統一
  // ──────────────────────────────────────────────────────────────────────────────
  const snapRows: NonNullable<Parameters<typeof prisma.inventorySnapshotFact.createMany>[0]>["data"] = []

  for (const p of PRODUCTS_DEF) {
    const nVariants = p.variants.length
    const basePerVariant = Math.round(p.baseMo / nVariants)
    const targetDays = CATEGORY_TARGET_DAYS[p.category] ?? 60
    const baseClosing = Math.round((targetDays / 30) * basePerVariant)

    for (const v of p.variants) {
      let prevClosingQty = baseClosing // 2024-12 closing = 2025-01 opening

      for (const [year, month] of SNAP_MONTHS) {
        const openingQty = prevClosingQty
        const seasonalAdj = Math.round(basePerVariant * (1 - mul(p.pattern, month)) * 0.5)
        const closingQty = Math.max(5, baseClosing + seasonalAdj)
        prevClosingQty = closingQty

        snapRows.push({
          importId: year === 2025 ? SNAP_2025_ID : SNAP_2026_ID,
          periodYm: new Date(`${year}-${String(month).padStart(2,"0")}-01`),
          janCode: v.jan,
          productCode: p.code,
          productName: p.name,
          brandName: p.brand,
          cs1Name: p.cs1,
          openingQty,
          openingYen: BigInt(openingQty * p.price),
          closingQty,
          closingYen: BigInt(closingQty * p.price),
        })
      }
    }
  }

  await prisma.inventorySnapshotFact.createMany({ data: snapRows })
  console.log(`✓ InventorySnapshotFact (${snapRows.length}行)`)

  // ──────────────────────────────────────────────────────────────────────────────
  // アラートデモ商品 (在庫不足・在庫過剰・廃品リスクのシナリオ再現用)
  // 在庫アラート分析カードに表示させるため、意図的に極端な在庫・販売数を設定する
  //
  // シナリオ:
  //   JAN 4902000000001 → 在庫不足 critical (closingQty=4,  90日売上=108 → ~3日分)
  //   JAN 4902000000002 → 在庫不足 warning  (closingQty=11, 90日売上=90  → ~11日分)
  //   JAN 4902000000003 → 在庫過剰 warning  (closingQty=280,90日売上=27  → ~933日分)
  //   JAN 4902000000004 → 廃品リスク        (closingQty=80, 90日売上=90  → ~80日分
  //                                           小物 sellThroughDays=60, 60×1.3=78 < 80)
  // ──────────────────────────────────────────────────────────────────────────────

  // DataImport 登録
  for (const imp of [
    { id: ALERT_SNAP_ID,  dataset: ImportDataset.inventory_snapshot, fileName: "alert_snap_demo.csv",  summary: "アラートデモ用在庫スナップショット" },
    { id: ALERT_SALES_ID, dataset: ImportDataset.sales,              fileName: "alert_sales_demo.csv", summary: "アラートデモ用売上データ" },
  ]) {
    await prisma.dataImport.upsert({
      where: { id: imp.id },
      update: {},
      create: { ...imp, status: ImportStatus.success, importedAt: new Date("2026-02-28T18:00:00+09:00"), importedBy: user.id, rowsTotal: 4, rowsSuccess: 4, rowsSkipped: 0, warningsCount: 0, errorsCount: 0 },
    })
  }

  // アラートシナリオ定義
  const ALERT_SCENARIOS = [
    { jan: "4902000000001", productCode: "SKU001", productName: "リネンシャツ（在庫残りわずか）", brandName: "UrbanLine", cs1: "春夏定番", price: 8900,  closingQty: 4,   monthlySales: [36, 36, 36],  color: "レッド",   size: "XS" },
    { jan: "4902000000002", productCode: "SKU002", productName: "コットンポロシャツ（在庫少）",   brandName: "RelaxWear", cs1: "春夏定番", price: 5800,  closingQty: 11,  monthlySales: [30, 30, 30],  color: "ライム",   size: "S"  },
    { jan: "4902000000003", productCode: "SKU005", productName: "ウールコート（過剰在庫）",       brandName: "LuxeCoat",  cs1: "秋冬定番", price: 28000, closingQty: 280, monthlySales: [9,  9,  9],   color: "ブラウン", size: "L"  },
    { jan: "4902000000004", productCode: "SKU030", productName: "キャップ（消化リスク）",         brandName: "ActiveGear",cs1: "定番",     price: 3800,  closingQty: 80,  monthlySales: [30, 30, 30],  color: "カーキ",   size: "F"  },
  ] as const

  // カテゴリマップ (productCode → categoryName) を PRODUCTS_DEF から構築
  const codeToCategory: Record<string, string> = {}
  for (const p of PRODUCTS_DEF) codeToCategory[p.code] = p.category

  for (const s of ALERT_SCENARIOS) {
    const productId = productMap.get(s.productCode)!
    const categoryName = codeToCategory[s.productCode] ?? "未設定"

    // ProductVariant
    const pv = await prisma.productVariant.create({
      data: { productId, color: s.color, size: s.size, janCode: s.jan, priceYen: BigInt(s.price) },
    })

    // InventoryStock (最新在庫)
    await prisma.inventoryStock.create({
      data: { variantId: pv.id, warehouseId, onHand: s.closingQty },
    })

    // InventorySnapshotFact (2026-02)
    await prisma.inventorySnapshotFact.create({
      data: {
        importId: ALERT_SNAP_ID,
        periodYm: new Date("2026-02-01"),
        janCode: s.jan,
        productCode: s.productCode,
        productName: s.productName,
        brandName: s.brandName,
        cs1Name: s.cs1,
        openingQty: s.closingQty + s.monthlySales[2],
        openingYen: BigInt((s.closingQty + s.monthlySales[2]) * s.price),
        closingQty: s.closingQty,
        closingYen: BigInt(s.closingQty * s.price),
      },
    })

    // SalesFact (2025-12, 2026-01, 2026-02 — velocity計算の対象期間)
    const alertCustomer = BRAND_TO_CUSTOMER[s.brandName] ?? { code: "C99", name: "その他", partnerId: null as string | null }
    const salesMonths = [[2025, 12], [2026, 1], [2026, 2]] as const
    for (let i = 0; i < salesMonths.length; i++) {
      const [year, month] = salesMonths[i]
      const netQty = s.monthlySales[i]
      await prisma.salesFact.create({
        data: {
          importId: ALERT_SALES_ID,
          businessPartnerId: alertCustomer.partnerId,
          customerCategory1Code: alertCustomer.code,
          customerCategory1Name: alertCustomer.name,
          brandCode: s.productCode.startsWith("SKU") ? s.productCode : "BR00",
          brandName: s.brandName,
          itemCode: s.productCode,
          itemName: categoryName,
          productCode: s.productCode,
          productName1: s.productName,
          productName2: s.color,
          cs1Name: s.cs1,
          janCode: s.jan,
          periodYm: new Date(`${year}-${String(month).padStart(2, "0")}-01`),
          salesDate: new Date(`${year}-${String(month).padStart(2, "0")}-15`),
          netQty,
          listPriceYen: BigInt(s.price),
          netSalesYen: BigInt(Math.round(netQty * s.price * 0.97)),
          returnYen: BigInt(0),
          grossProfitYen: BigInt(Math.round(netQty * s.price * 0.38)),
          grossProfitRate: 38,
        },
      })
    }
  }
  console.log(`✓ アラートデモ商品 (${ALERT_SCENARIOS.length}商品)`)

  // ── InventoryPlanYear & InventoryPlanMonth ───────────────────────────────────
  const FY2024_ID = "cccc0001-0000-0000-0000-000000000001"
  const FY2025_ID = "cccc0001-0000-0000-0000-000000000002"

  await prisma.inventoryPlanYear.upsert({ where: { fiscalYear: 2024 }, update: {}, create: { id: FY2024_ID, fiscalYear: 2024 } })
  await prisma.inventoryPlanYear.upsert({ where: { fiscalYear: 2025 }, update: {}, create: { id: FY2025_ID, fiscalYear: 2025 } })

  await prisma.inventoryPlanMonth.deleteMany({ where: { planYearId: { in: [FY2024_ID, FY2025_ID] } } })
  await prisma.inventoryPlanMonth.createMany({
    data: [
      // FY2024 (4月〜3月)
      { planYearId: FY2024_ID, monthDate: new Date("2024-04-01"), purchaseBudgetYen: 3500000n, shipmentAmountYen: 4200000n, shipmentGrossProfitRate: 32.5, shipmentCostYen: 2835000n, wasteYen: 85000n,  monthEndInventoryYen: 8500000n, inventoryPlanYen: 8200000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-05-01"), purchaseBudgetYen: 4200000n, shipmentAmountYen: 5100000n, shipmentGrossProfitRate: 34.2, shipmentCostYen: 3356000n, wasteYen: 92000n,  monthEndInventoryYen: 9100000n, inventoryPlanYen: 9000000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-06-01"), purchaseBudgetYen: 3800000n, shipmentAmountYen: 4800000n, shipmentGrossProfitRate: 33.8, shipmentCostYen: 3178000n, wasteYen: 78000n,  monthEndInventoryYen: 8700000n, inventoryPlanYen: 8500000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-07-01"), purchaseBudgetYen: 5500000n, shipmentAmountYen: 6200000n, shipmentGrossProfitRate: 35.0, shipmentCostYen: 4030000n, wasteYen: 105000n, monthEndInventoryYen: 9500000n, inventoryPlanYen: 9800000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-08-01"), purchaseBudgetYen: 5800000n, shipmentAmountYen: 6800000n, shipmentGrossProfitRate: 36.2, shipmentCostYen: 4338000n, wasteYen: 115000n, monthEndInventoryYen: 9200000n, inventoryPlanYen: 9500000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-09-01"), purchaseBudgetYen: 4500000n, shipmentAmountYen: 5500000n, shipmentGrossProfitRate: 34.5, shipmentCostYen: 3603000n, wasteYen: 88000n,  monthEndInventoryYen: 8800000n, inventoryPlanYen: 8600000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-10-01"), purchaseBudgetYen: 4800000n, shipmentAmountYen: 5800000n, shipmentGrossProfitRate: 33.2, shipmentCostYen: 3875000n, wasteYen: 95000n,  monthEndInventoryYen: 9200000n, inventoryPlanYen: 9000000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-11-01"), purchaseBudgetYen: 5200000n, shipmentAmountYen: 6500000n, shipmentGrossProfitRate: 35.5, shipmentCostYen: 4193000n, wasteYen: 102000n, monthEndInventoryYen: 9600000n, inventoryPlanYen: 9800000n },
      { planYearId: FY2024_ID, monthDate: new Date("2024-12-01"), purchaseBudgetYen: 6500000n, shipmentAmountYen: 8200000n, shipmentGrossProfitRate: 38.0, shipmentCostYen: 5084000n, wasteYen: 135000n, monthEndInventoryYen: 8500000n, inventoryPlanYen: 8200000n },
      { planYearId: FY2024_ID, monthDate: new Date("2025-01-01"), purchaseBudgetYen: 3200000n, shipmentAmountYen: 3800000n, shipmentGrossProfitRate: 31.5, shipmentCostYen: 2603000n, wasteYen: 72000n,  monthEndInventoryYen: 8200000n, inventoryPlanYen: 8000000n },
      { planYearId: FY2024_ID, monthDate: new Date("2025-02-01"), purchaseBudgetYen: 3000000n, shipmentAmountYen: 3500000n, shipmentGrossProfitRate: 30.8, shipmentCostYen: 2422000n, wasteYen: 68000n,  monthEndInventoryYen: 7900000n, inventoryPlanYen: 7800000n },
      { planYearId: FY2024_ID, monthDate: new Date("2025-03-01"), purchaseBudgetYen: 4000000n, shipmentAmountYen: 4500000n, shipmentGrossProfitRate: 32.0, shipmentCostYen: 3060000n, wasteYen: 82000n,  monthEndInventoryYen: 8400000n, inventoryPlanYen: 8200000n },
      // FY2025 (4月〜3月、+5%成長)
      { planYearId: FY2025_ID, monthDate: new Date("2025-04-01"), purchaseBudgetYen: 3700000n, shipmentAmountYen: 4400000n, shipmentGrossProfitRate: 33.0, shipmentCostYen: 2948000n, wasteYen: 89000n,  monthEndInventoryYen: 8900000n, inventoryPlanYen: 8600000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-05-01"), purchaseBudgetYen: 4400000n, shipmentAmountYen: 5400000n, shipmentGrossProfitRate: 34.5, shipmentCostYen: 3537000n, wasteYen: 96000n,  monthEndInventoryYen: 9600000n, inventoryPlanYen: 9400000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-06-01"), purchaseBudgetYen: 4000000n, shipmentAmountYen: 5000000n, shipmentGrossProfitRate: 34.0, shipmentCostYen: 3300000n, wasteYen: 82000n,  monthEndInventoryYen: 9100000n, inventoryPlanYen: 8900000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-07-01"), purchaseBudgetYen: 5800000n, shipmentAmountYen: 6500000n, shipmentGrossProfitRate: 35.5, shipmentCostYen: 4193000n, wasteYen: 110000n, monthEndInventoryYen: 9900000n, inventoryPlanYen: 10200000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-08-01"), purchaseBudgetYen: 6100000n, shipmentAmountYen: 7200000n, shipmentGrossProfitRate: 36.5, shipmentCostYen: 4572000n, wasteYen: 120000n, monthEndInventoryYen: 9700000n, inventoryPlanYen: 9900000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-09-01"), purchaseBudgetYen: 4800000n, shipmentAmountYen: 5800000n, shipmentGrossProfitRate: 35.0, shipmentCostYen: 3770000n, wasteYen: 92000n,  monthEndInventoryYen: 9200000n, inventoryPlanYen: 9000000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-10-01"), purchaseBudgetYen: 5000000n, shipmentAmountYen: 6100000n, shipmentGrossProfitRate: 33.5, shipmentCostYen: 4057000n, wasteYen: 99000n,  monthEndInventoryYen: 9700000n, inventoryPlanYen: 9500000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-11-01"), purchaseBudgetYen: 5500000n, shipmentAmountYen: 6800000n, shipmentGrossProfitRate: 36.0, shipmentCostYen: 4352000n, wasteYen: 107000n, monthEndInventoryYen: 10100000n, inventoryPlanYen: 10200000n },
      { planYearId: FY2025_ID, monthDate: new Date("2025-12-01"), purchaseBudgetYen: 6800000n, shipmentAmountYen: 8600000n, shipmentGrossProfitRate: 38.5, shipmentCostYen: 5291000n, wasteYen: 141000n, monthEndInventoryYen: 8900000n, inventoryPlanYen: 8600000n },
      { planYearId: FY2025_ID, monthDate: new Date("2026-01-01"), purchaseBudgetYen: 3400000n, shipmentAmountYen: 4000000n, shipmentGrossProfitRate: 32.0, shipmentCostYen: 2720000n, wasteYen: 76000n,  monthEndInventoryYen: 8600000n, inventoryPlanYen: 8400000n },
      { planYearId: FY2025_ID, monthDate: new Date("2026-02-01"), purchaseBudgetYen: 3100000n, shipmentAmountYen: 3700000n, shipmentGrossProfitRate: 31.2, shipmentCostYen: 2548000n, wasteYen: 71000n,  monthEndInventoryYen: 8300000n, inventoryPlanYen: 8200000n },
      { planYearId: FY2025_ID, monthDate: new Date("2026-03-01"), purchaseBudgetYen: 4200000n, shipmentAmountYen: 4700000n, shipmentGrossProfitRate: 32.5, shipmentCostYen: 3173000n, wasteYen: 86000n,  monthEndInventoryYen: 8800000n, inventoryPlanYen: 8600000n },
    ],
  })
  console.log(`✓ InventoryPlanYear & InventoryPlanMonth (2年度 × 12ヶ月)`)

  console.log("\n🎉 Seed complete!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
