import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(6, "新しいパスワードは6文字以上で入力してください"),
  confirmPassword: z.string().min(1, "確認用パスワードを入力してください"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "新しいパスワードが一致しません",
  path: ["confirmPassword"],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
