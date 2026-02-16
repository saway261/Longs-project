import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
})

export type LoginInput = z.infer<typeof loginSchema>
