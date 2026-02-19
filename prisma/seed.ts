import { PrismaClient } from "@prisma/client"
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
      role: "admin",
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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
