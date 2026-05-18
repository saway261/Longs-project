import { prisma } from "@/src/lib/prisma"

const NEWS_DEFAULT_EXCLUDED_SOURCES_KEY = "news.default_excluded_sources"

export async function getDefaultExcludedSources(): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: NEWS_DEFAULT_EXCLUDED_SOURCES_KEY },
  })
  return row?.value ?? null
}

export async function setDefaultExcludedSources(sources: string | null): Promise<void> {
  if (!sources) {
    await prisma.systemSetting.deleteMany({ where: { key: NEWS_DEFAULT_EXCLUDED_SOURCES_KEY } })
  } else {
    await prisma.systemSetting.upsert({
      where: { key: NEWS_DEFAULT_EXCLUDED_SOURCES_KEY },
      create: { key: NEWS_DEFAULT_EXCLUDED_SOURCES_KEY, value: sources },
      update: { value: sources },
    })
  }
}
