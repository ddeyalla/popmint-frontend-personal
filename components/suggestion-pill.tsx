"use client"

import { Button } from "@/components/ui/button"

interface SuggestionPillProps {
  text: string
  onClick?: () => void
}

export function SuggestionPill({ text, onClick }: SuggestionPillProps) {
  return (
    <Button variant="outline" className="rounded-full bg-white hover:bg-gray-50" onClick={onClick}>
      {text}
    </Button>
  )
}
