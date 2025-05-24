## Overview

I’m building an AI agent app with a canvas (Konva) and chat interface for generating ad creatives. The agent streams responses via SSE. Each session creates a new project.

I need to **persist all state** (chat messages, canvas objects, project metadata, job outputs) to **Supabase**, so when a user closes the project and comes back, everything is restored — like Figma.

Here’s what’s broken and what I want Cursor to fix, clearly mapped to files and line numbers from this repo:  
https://github.com/ddeyalla/popmint-frontend-personal

---

## 1. Fix Chat Persistence

### Problem

Chat messages disappear on refresh. They’re only stored in memory.

### Found In:

- `store/chat.ts` – the store does not hydrate from Supabase  
- `components/Chat.tsx` – message submission is not persisted  

### Fix Instructions

- **On chat submit**, call `POST /api/projects/[projectId]/chat` to persist each message to Supabase.
- **On project load**, call `GET /api/projects/[projectId]/chat` and hydrate the store using `setMessages()`.

Use the existing API handler as defined in `supabase/functions/chat_messages` (schema matches `id`, `project_id`, `sender`, `message`, `timestamp`).

Add this to `useEffect` inside `Playground.tsx` when a `projectId` is available.

---

## 2. Fix Canvas Object Persistence (Konva)

### Problem

Canvas drawings (images, shapes, text) vanish on refresh. No server sync exists.

### Found In:

- `store/canvas.ts` – maintains only local state  
- `components/Canvas.tsx` – renders shapes but doesn’t persist or fetch  

### Fix Instructions

- On **any canvas change** (e.g. shape added, moved, or deleted), serialize the canvas:
  ```ts
  const json = stageRef.current.toJSON();
````

* Save this to Supabase via `POST /api/projects/[projectId]/canvas`.

* On project load, call `GET /api/projects/[projectId]/canvas` and restore:

  ```ts
  Konva.Node.create(JSON.parse(json), stageRef.current);
  ```

Throttle/debounce save calls to prevent spam (e.g. 200ms debounce per change).

---

## 3. Fix SSE Job Output Persistence

### Problem

Agent responses (streamed via SSE) are not saved. If the page reloads mid-generation, output is lost.

### Found In:

* `lib/agent.ts` – handles SSE events but doesn’t link jobs to projects
* `api/agent/route.ts` – streams events but lacks a save mechanism

### Fix Instructions

* On SSE response start, generate a `jobId` and call:

  ```ts
  POST /api/projects/[projectId]/link-job
  { jobId }
  ```
* On stream complete (`onCompletion` handler), call:

  ```ts
  supabase.from('project_jobs').insert([{ project_id, job_id, output }])
  ```

This will allow restoration of job output later by fetching the `job` record.

---

## 4. Hydrate Full Project State on Load

### Problem

Project reloads don’t hydrate anything. No chat, canvas, or job output is restored.

### Found In:

* `app/playground/[projectId]/page.tsx` – loads project but does not hydrate stores

### Fix Instructions

* Implement `hydrateProject(projectId)` function that:

  * Calls `GET /api/projects/[projectId]` → fetches product metadata
  * Calls `GET /api/projects/[projectId]/chat` → chat history
  * Calls `GET /api/projects/[projectId]/canvas` → canvas JSON
  * Calls `GET /api/projects/[projectId]/job` → if available, populate past agent response

Call `hydrateProject()` inside a `useEffect()` in `Playground.tsx`.

---

## 5. Create Project On Product Submit

### Problem

On the homepage, user submits a product link but no project is actually created or saved to Supabase.

### Found In:

* `app/page.tsx` → the home form handler

### Fix Instructions

* Replace placeholder logic with:

  ```ts
  const projectId = await createProjectFromPrompt(productUrl);
  router.push(`/playground/${projectId}`);
  ```

* Inside `createProjectFromPrompt()`, call:

  ```ts
  POST /api/projects
  { product_url }
  ```

This should return a `projectId` that is used throughout the rest of the session.

---

## 6. Suggested File Updates Summary

| File                                  | Action                                        |
| ------------------------------------- | --------------------------------------------- |
| `store/chat.ts`                       | Add `setMessages`, call on load               |
| `components/Chat.tsx`                 | Save message to `/chat` API on submit         |
| `components/Canvas.tsx`               | Save canvas JSON on change, restore on load   |
| `lib/agent.ts`                        | Link SSE `jobId` to project, save on complete |
| `app/page.tsx`                        | Replace form logic to create project          |
| `app/playground/[projectId]/page.tsx` | Hydrate full project state on mount           |

---

## Final Goal

Make every project behave like a persistent workspace:

* Every drawing, chat message, and AI output is auto-saved
* On returning to `/playground/[projectId]`, all state is restored

Achieve Figma-level UX: nothing disappears unless explicitly deleted.

---