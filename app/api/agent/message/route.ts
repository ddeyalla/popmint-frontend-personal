import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, message, imageUrl } = body

    // In a real implementation, this would call the Python backend
    // For now, we'll simulate the API call

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending message to agent:", error)
    return NextResponse.json({ error: "Failed to send message to agent" }, { status: 500 })
  }
}
