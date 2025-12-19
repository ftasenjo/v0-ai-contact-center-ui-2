import { redirect } from "next/navigation"

export default function Home() {
  // For demos, redirect to login
  // In production, you might want to show a landing page first
  redirect("/login")
}
