import { z } from "zod"

export const generateDesignSchema = z.object({
  selectedStyle: z.string().nullable(),
  selectedColor: z.string(),
  popTitle: z.string(),
  catchphrase: z.string(),
  mainText: z.string(),
  prompt: z.string(),
  selectedRatio: z.string().nullable(),
  customRatioWidth: z.string(),
  customRatioHeight: z.string(),
  uploadedImages: z
    .array(
      z.object({
        base64: z.string(),
        mimeType: z.string(),
      })
    )
    .max(14)
    .default([]),
  selectedType: z.enum(["pop", "poster"]),
})

export type GenerateDesignInput = z.infer<typeof generateDesignSchema>
