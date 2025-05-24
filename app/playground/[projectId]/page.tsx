// "use client" directive removed to make this a Server Component

import ClientSidePlayground from "./client";


interface PlaygroundPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

// Make the component async to allow awaiting params
export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  // Log the initial state of params (which is a Promise)
  console.log('[PlaygroundPage Server Component] Received params promise:', params);

  // Await the params promise to get the actual parameters object
  const resolvedParams = await params;

  // This log will now appear in your server terminal with the resolved object
  console.log('[PlaygroundPage Server Component] Rendering with resolved params:', resolvedParams);

  if (!resolvedParams || !resolvedParams.projectId) {
    // This log will also appear in your server terminal
    console.error('[PlaygroundPage Server Component] Error: projectId is missing in resolved params. Resolved params:', resolvedParams);
    return <div>Error: Project ID is missing. Cannot load playground.</div>;
  }

  const projectId = resolvedParams.projectId;
  // This log will also appear in your server terminal
  console.log('[PlaygroundPage Server Component] Extracted projectId:', projectId);

  // ClientSidePlayground is a Client Component and will render in the browser.
  // We pass the projectId (a string) as a prop.
  return <ClientSidePlayground projectId={projectId} />;
}
