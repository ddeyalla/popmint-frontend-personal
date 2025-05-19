import { Suspense } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import ClientSidePlayground from "./client";

// This is a Server Component
export default function PlaygroundPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientSidePlayground sessionId={sessionId} />
    </Suspense>
  );
}
