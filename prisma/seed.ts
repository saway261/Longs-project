import { PrismaClient, UserRole, ImportDataset, ImportStatus, IssueLevel } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // デモユーザーのパスワードをハッシュ化
  const passwordHash = await bcrypt.hash("demopass", 10)

  // UserAccountを作成（冪等性確保のためupsert）
  const user = await prisma.userAccount.upsert({
    where: { email: "owner@apparel.jp" },
    update: {
      passwordHash, // パスワードのみ更新
    },
    create: {
      email: "owner@apparel.jp",
      name: "オーナー",
      passwordHash,
      role: UserRole.admin,
    },
  })

  console.log(`✓ Created demo user: ${user.email}`)

  // DesignAsset サンプルデータ（デモ用 POP 4件）
  // ※ imageUrl が null のものは元々ローカルファイル保存だったため画像なし
  const designAssets = [
    {
      id: "9071df2c-1c06-434f-af08-33a765ca46e4",
      type: "pop" as const,
      title: "カメラバッグのPOP",
      prompt:
        "Create a promotional POP design for retail display.\n" +
        "Style: retro vintage design, nostalgic colors, classic typography.\n" +
        'Catchphrase text to display: "持ち運びたいのは、思い出"\n' +
        'Main text to display: "Healthknit Product カメラバッグ HKB-1084"\n' +
        "Additional requirements: 商品着用モデルとしてセミロングヘアの女性を中央に配置してください。女性は肩から[image 1] を提げてがカメラを構えて趣味に没入しています。穏やかで日常的な生活の自然風景の中にたたずんでいます\n" +
        "Make the design eye-catching, professional, and suitable for apparel retail business.",
      style: "retro",
      color: null,
      ratio: null,
      imageUrl: "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771230620418-vy8pj96a.png",
    },
    {
      id: "b2db981a-656d-4452-9c53-7a5c5adc04b4",
      type: "pop" as const,
      title: "スリングバッグ",
      prompt:
        "Create a promotional POP design for retail display.\n" +
        'Catchphrase text to display: "カッコよさも\\n機能性も、\\nどちらも譲れない。"\n' +
        'Main text to display: "¥8,690 (税抜 ¥7,900)"\n' +
        "Additional requirements: 晴れた日の明るい日本の街並みを背景に、20代から40代くらいの清潔感のある日本人男性が、クロスバイクなどの自転車に乗って颯爽と走っている。彼はネイビーのスリングバッグ[image 1] を体にフィットするように斜めがけにしている。服装はシックなカジュアルスタイルで、快活な印象。\n" +
        "画像の上部または余白の読みやすい位置に、洗練された細身のゴシック体フォントでCatchphrase を配置。\n" +
        "商品の近くまたは下部に、視認性の高い細めのフォントで Main textを配置。\n" +
        "Make the design eye-catching, professional, and suitable for apparel retail business.",
      style: null,
      color: null,
      ratio: null,
      imageUrl:
        "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771303409774-8lieqs0i.jpg",
    },
    {
      id: "51283fbd-09c4-4b15-9ea1-0c9b46071cb9",
      type: "pop" as const,
      title: null,
      prompt:
        "Create a promotional POP design for retail display.\n" +
        'Catchphrase text to display: "リバーシブルだから１個で２味楽しめる"\n' +
        'Main text to display: "¥4,290 (税抜 ¥3,900)"\n' +
        "Additional requirements: 自然光がたっぷりと入る明るいカフェのテラス席、あるいは白い壁を背景にした清潔感のある空間で、30代の女性が[image 1] （白地に鮮やかなオレンジの持ち手・トリミングが特徴）を肩にかけ、リラックスした様子で立っている。バッグの生地の質感や、くしゃっとした自然なシワ感を描写し、パッカブルな機能性を暗示させる。画像内の余白（ネガティブスペース）を十分に確保し、そこに以下のテキストをバランスよく配置する。\n" +
        "Make the design eye-catching, professional, and suitable for apparel retail business.",
      style: null,
      color: null,
      ratio: null,
      imageUrl:
        "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771305042743-vnqbmhm8.jpg",
    },
    {
      id: "8e86d072-20c3-4aea-933d-47db8c934e54",
      type: "pop" as const,
      title: "新色発売",
      prompt:
        "Create a promotional POP design for retail display.\n" +
        "Style: casual friendly design, warm, approachable.\n" +
        'Catchphrase text to display: "新色登場"\n' +
        'Main text to display: "11ポケット撥水リュック"\n' +
        "Additional requirements: あるリュックサックシリーズの新色登場を宣伝するPOPを作成します。3つの画像のリュックサックが寄り添いあって置かれている様子を中央に配置してください。新しい季節が到来したような心躍るイメージを持たせてください\n" +
        "Make the design eye-catching, professional, and suitable for apparel retail business.",
      style: "casual",
      color: null,
      ratio: null,
      imageUrl:
        "https://kdrwnbqxhjlzvvmrwexp.supabase.co/storage/v1/object/public/design-assets/2026/02/1771305513839-ff8z6zxf.jpg",
    },
  ]

  for (const asset of designAssets) {
    await prisma.designAsset.upsert({
      where: { id: asset.id },
      update: {},
      create: {
        ...asset,
        createdBy: user.id,
      },
    })
    console.log(`✓ Upserted design asset: ${asset.title ?? "(タイトルなし)"}`)
  }

  // ============================================================
  // DataImport デモデータ（8件）
  // ============================================================
  const importSeed = [
    {
      id: "a1b2c3d4-0001-0001-0001-000000000001",
      dataset: ImportDataset.sales,
      fileName: "sales_2024-12.csv",
      status: ImportStatus.success,
      summary: "全レコードが正常に取り込まれました。",
      importedAt: new Date("2024-12-20T10:30:00+09:00"),
      rowsTotal: 12450, rowsSuccess: 12450, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0001-000000000002",
      dataset: ImportDataset.sales,
      fileName: "sales_2024-11.csv",
      status: ImportStatus.success,
      summary: "売上データを問題なく取り込みました。",
      importedAt: new Date("2024-11-25T09:12:00+09:00"),
      rowsTotal: 11980, rowsSuccess: 11980, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0002-000000000001",
      dataset: ImportDataset.payables,
      fileName: "payables_2024-12.xlsx",
      status: ImportStatus.success,
      summary: "支払い予定データが正常に取り込まれました。",
      importedAt: new Date("2024-12-18T14:02:00+09:00"),
      rowsTotal: 3580, rowsSuccess: 3580, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0002-000000000002",
      dataset: ImportDataset.payables,
      fileName: "payables_2024-11.xlsx",
      status: ImportStatus.partial,
      summary: "一部欠損行を除外して取り込みました。",
      note: "数行の欠損あり",
      importedAt: new Date("2024-11-20T13:50:00+09:00"),
      rowsTotal: 3400, rowsSuccess: 3380, rowsSkipped: 20,
      warningsCount: 2, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0003-000000000001",
      dataset: ImportDataset.receivables,
      fileName: "receivables_2024-12.csv",
      status: ImportStatus.success,
      summary: "入金予定データを問題なく取り込みました。",
      importedAt: new Date("2024-12-19T16:20:00+09:00"),
      rowsTotal: 6720, rowsSuccess: 6720, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0003-000000000002",
      dataset: ImportDataset.receivables,
      fileName: "receivables_2024-11.csv",
      status: ImportStatus.success,
      summary: "入金予定データを問題なく取り込みました。",
      importedAt: new Date("2024-11-22T11:05:00+09:00"),
      rowsTotal: 6550, rowsSuccess: 6550, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0004-000000000001",
      dataset: ImportDataset.gross_profit,
      fileName: "profit_2024.csv",
      status: ImportStatus.success,
      summary: "年度粗利データが正常に取り込まれました。",
      importedAt: new Date("2024-12-10T08:45:00+09:00"),
      rowsTotal: 980, rowsSuccess: 980, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 0,
    },
    {
      id: "a1b2c3d4-0001-0001-0004-000000000002",
      dataset: ImportDataset.gross_profit,
      fileName: "profit_2023.csv",
      status: ImportStatus.failed,
      summary: "フォーマット不一致のため取り込みに失敗しました。",
      note: "フォーマット不一致",
      importedAt: new Date("2024-11-01T08:45:00+09:00"),
      rowsTotal: 960, rowsSuccess: 0, rowsSkipped: 0,
      warningsCount: 0, errorsCount: 3,
    },
  ] as const

  for (const imp of importSeed) {
    await prisma.dataImport.upsert({
      where: { id: imp.id },
      update: {},
      create: { ...imp, importedBy: user.id },
    })
    console.log(`✓ Upserted data import: ${imp.fileName}`)
  }

  // DataImportIssue（payables-2024-11の警告2件 + gross-profit-2023のエラー3件）
  const issueSeed = [
    {
      id: "b1000000-0000-0000-0000-000000000001",
      importId: "a1b2c3d4-0001-0001-0002-000000000002",
      level: IssueLevel.warning,
      message: "仕入先コードが未設定の行が20件ありスキップしました。",
      rowNumber: null, columnName: null,
    },
    {
      id: "b1000000-0000-0000-0000-000000000002",
      importId: "a1b2c3d4-0001-0001-0002-000000000002",
      level: IssueLevel.warning,
      message: "日付形式の揺れが2件あり自動補正しました。",
      rowNumber: null, columnName: null,
    },
    {
      id: "b1000000-0000-0000-0000-000000000003",
      importId: "a1b2c3d4-0001-0001-0004-000000000002",
      level: IssueLevel.error,
      message: "列数が想定と一致しません（期待: 12列 / 実際: 9列）。",
      rowNumber: null, columnName: null,
    },
    {
      id: "b1000000-0000-0000-0000-000000000004",
      importId: "a1b2c3d4-0001-0001-0004-000000000002",
      level: IssueLevel.error,
      message: '必須列「gross_margin」が見つかりません。',
      rowNumber: null, columnName: null,
    },
    {
      id: "b1000000-0000-0000-0000-000000000005",
      importId: "a1b2c3d4-0001-0001-0004-000000000002",
      level: IssueLevel.error,
      message: '日付列「month」がYYYY-MM形式ではありません。',
      rowNumber: null, columnName: null,
    },
  ] as const

  for (const issue of issueSeed) {
    await prisma.dataImportIssue.upsert({
      where: { id: issue.id },
      update: {},
      create: issue,
    })
  }
  console.log("✓ Upserted data import issues")

  // ============================================================
  // ファクトテーブル デモデータ（各20件）
  // sales_fact: 2サンプル行 × 10コピー
  // ============================================================
  const salesBase = [
    {
      customerCategory1Code: "C01", customerCategory1Name: "セレクトA",
      brandCode: "BR01", brandName: "UrbanLine",
      itemCode: "IT01", itemName: "トップス",
      productCode: "SKU001", productName1: "リネンシャツ", productName2: "ベージュ",
      cs1Code: "CS10", cs1Name: "定番", cs2Code: "CS20", cs2Name: "新作",
      staffCode: "S001", staffName: "佐藤",
      janCode: "4901234567890",
      netQty: 120, listPriceYen: BigInt(8900), netSalesYen: BigInt(1068000),
      returnYen: BigInt(0), grossProfitYen: BigInt(392000), grossProfitRate: 36.7,
    },
    {
      customerCategory1Code: "C02", customerCategory1Name: "百貨店B",
      brandCode: "BR02", brandName: "LuxeCoat",
      itemCode: "IT02", itemName: "アウター",
      productCode: "SKU005", productName1: "ウールコート", productName2: "グレー",
      cs1Code: "CS30", cs1Name: "高単価", cs2Code: "CS40", cs2Name: "定番",
      staffCode: "S002", staffName: "田中",
      janCode: "4901234567891",
      netQty: 45, listPriceYen: BigInt(28000), netSalesYen: BigInt(1260000),
      returnYen: BigInt(0), grossProfitYen: BigInt(420000), grossProfitRate: 33.3,
    },
  ]

  const salesImportId = "a1b2c3d4-0001-0001-0001-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < salesBase.length; j++) {
      const base = salesBase[j]
      const month = String(12 - (i % 12)).padStart(2, "0")
      await prisma.salesFact.upsert({
        where: { id: `c1${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001` },
        update: {},
        create: {
          id: `c1${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001`,
          importId: salesImportId,
          ...base,
          periodYm: new Date(`2024-${month}-01`),
          salesDate: new Date(`2024-${month}-${String(10 + i).padStart(2, "0")}`),
          netQty: base.netQty + i * 5,
          netSalesYen: base.netSalesYen + BigInt(i * 50000),
        },
      })
    }
  }
  console.log("✓ Upserted sales_fact (20 rows)")

  // payables_fact: 2サンプル行 × 10コピー
  const payablesBase = [
    {
      vendorName: "大阪繊維", vendorShort: "大阪繊維",
      prevBalanceYen: BigInt(820000), paymentYen: BigInt(1180000), carryoverYen: BigInt(0),
      netPurchaseYen: BigInt(1250000), purchaseYen: BigInt(1250000),
      returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0),
      taxYen: BigInt(125000), purchaseTaxInYen: BigInt(1375000), monthEndBalanceYen: BigInt(940000),
      cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(1180000),
      billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0),
    },
    {
      vendorName: "京都染工", vendorShort: "京都染工",
      prevBalanceYen: BigInt(540000), paymentYen: BigInt(760000), carryoverYen: BigInt(0),
      netPurchaseYen: BigInt(820000), purchaseYen: BigInt(820000),
      returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0),
      taxYen: BigInt(82000), purchaseTaxInYen: BigInt(902000), monthEndBalanceYen: BigInt(600000),
      cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(760000),
      billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0),
    },
  ]

  const payablesImportId = "a1b2c3d4-0001-0001-0002-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < payablesBase.length; j++) {
      const base = payablesBase[j]
      await prisma.payablesFact.upsert({
        where: { id: `c2${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001` },
        update: {},
        create: {
          id: `c2${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001`,
          importId: payablesImportId,
          ...base,
          paymentYen: base.paymentYen + BigInt(i * 10000),
          monthEndBalanceYen: base.monthEndBalanceYen + BigInt(i * 5000),
        },
      })
    }
  }
  console.log("✓ Upserted payables_fact (20 rows)")

  // receivables_fact: 2サンプル行 × 10コピー
  const receivablesBase = [
    {
      staffName: "佐藤", customerName: "南青山セレクト", customerShort: "南青山",
      prevBalanceYen: BigInt(420000), receivedYen: BigInt(980000), carryoverYen: BigInt(0),
      netSalesYen: BigInt(1080000), salesYen: BigInt(1080000),
      returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0),
      taxYen: BigInt(108000), salesTaxInYen: BigInt(1188000), monthEndBalanceYen: BigInt(520000),
      cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(980000),
      billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0),
      npCreditYen: BigInt(1200000), npPaymentsYen: BigInt(300000), creditLimitBalanceYen: BigInt(900000),
      notes: "主要卸先",
    },
    {
      staffName: "田中", customerName: "北陸百貨店", customerShort: "北陸",
      prevBalanceYen: BigInt(680000), receivedYen: BigInt(620000), carryoverYen: BigInt(0),
      netSalesYen: BigInt(940000), salesYen: BigInt(940000),
      returnYen: BigInt(0), discountYen: BigInt(0), otherYen: BigInt(0),
      taxYen: BigInt(94000), salesTaxInYen: BigInt(1034000), monthEndBalanceYen: BigInt(1000000),
      cashYen: BigInt(0), checkYen: BigInt(0), transferYen: BigInt(620000),
      billYen: BigInt(0), offsetYen: BigInt(0), discount2Yen: BigInt(0), feeYen: BigInt(0), other2Yen: BigInt(0),
      npCreditYen: BigInt(900000), npPaymentsYen: BigInt(120000), creditLimitBalanceYen: BigInt(780000),
      notes: "新規拡大",
    },
  ]

  const receivablesImportId = "a1b2c3d4-0001-0001-0003-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < receivablesBase.length; j++) {
      const base = receivablesBase[j]
      await prisma.receivablesFact.upsert({
        where: { id: `c3${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001` },
        update: {},
        create: {
          id: `c3${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001`,
          importId: receivablesImportId,
          ...base,
          receivedYen: base.receivedYen + BigInt(i * 10000),
          monthEndBalanceYen: base.monthEndBalanceYen + BigInt(i * 8000),
        },
      })
    }
  }
  console.log("✓ Upserted receivables_fact (20 rows)")

  // gross_profit_fact: 2サンプル行 × 10コピー
  const grossProfitBase = [
    {
      staffName: "佐藤", fiscalYear: 2024,
      customerCategory1Code: "C01", customerCategory1Name: "セレクトA",
      netQty: 1320, listPriceYen: BigInt(8600), netSalesYen: BigInt(10980000),
      returnYen: BigInt(0), grossProfitYen: BigInt(3920000), grossProfitRate: 35.7,
    },
    {
      staffName: "田中", fiscalYear: 2024,
      customerCategory1Code: "C02", customerCategory1Name: "百貨店B",
      netQty: 760, listPriceYen: BigInt(21500), netSalesYen: BigInt(16340000),
      returnYen: BigInt(0), grossProfitYen: BigInt(4860000), grossProfitRate: 29.7,
    },
  ]

  const grossProfitImportId = "a1b2c3d4-0001-0001-0004-000000000001"
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < grossProfitBase.length; j++) {
      const base = grossProfitBase[j]
      await prisma.grossProfitFact.upsert({
        where: { id: `c4${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001` },
        update: {},
        create: {
          id: `c4${String(i).padStart(6, "0")}-0000-0000-${String(j + 1).padStart(4, "0")}-000000000001`,
          importId: grossProfitImportId,
          ...base,
          fiscalYear: base.fiscalYear - (i % 3),
          netQty: base.netQty + i * 20,
          netSalesYen: base.netSalesYen + BigInt(i * 100000),
        },
      })
    }
  }
  console.log("✓ Upserted gross_profit_fact (20 rows)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
