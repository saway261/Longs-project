// ============================================================
// リトライユーティリティ
// 指数バックオフ付きリトライ処理
// ============================================================

export interface RetryOptions {
  /** 最大試行回数（デフォルト: 3） */
  maxAttempts?: number
  /** 初回リトライ待機時間 ms（デフォルト: 1000） */
  delayMs?: number
  /** バックオフ係数（デフォルト: 2 → 1s → 2s → 4s） */
  backoffMultiplier?: number
  /** タイムアウト ms（デフォルト: 30000） */
  timeout?: number
}

/**
 * 非同期関数を指数バックオフ付きでリトライする。
 *
 * @example
 * const url = await withRetry(() => storage.upload(buffer, filename), {
 *   maxAttempts: 3,
 *   delayMs: 1000,
 *   timeout: 30000,
 * })
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    timeout = 30000,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`タイムアウト: ${timeout}ms 超過`)),
            timeout
          )
        ),
      ])
      return result
    } catch (err) {
      lastError = err

      if (attempt < maxAttempts) {
        const wait = delayMs * Math.pow(backoffMultiplier, attempt - 1)
        console.warn(
          `[retry] 試行 ${attempt}/${maxAttempts} 失敗。${wait}ms 後にリトライします。`,
          err instanceof Error ? err.message : err
        )
        await new Promise((res) => setTimeout(res, wait))
      }
    }
  }

  throw lastError
}
