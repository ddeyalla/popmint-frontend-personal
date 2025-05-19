import { MessageCircle } from "lucide-react"
import Link from "next/link"

export function Logo() {
  return (
    <Link href="/Users/divyanshudv/Desktop/Popmint/popmint/public/popmint_logo.svg" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple">
        <MessageCircle className="h-4 w-4 text-white" />
      </div>
      <span className="text-xl font-semibold">Popmint</span>
    </Link>
  )
}
