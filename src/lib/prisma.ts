import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"] // クエリログを非表示（開発中も静かに）
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


// Next.jsの開発環境ではホットリロード（HMR）のたびにモジュールが再読み込みされるため、何も対策しないと new PrismaClient() が何度も呼ばれ、DB接続が大量に作られてしまいます。
// このファイルは globalThis にインスタンスを保持することで、アプリ全体で1つのPrismaClientを使い回すパターンです。