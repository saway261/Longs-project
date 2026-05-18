import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/auth"
import { PasswordClient } from "./password-client"

export default async function PasswordPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <PasswordClient />
}
