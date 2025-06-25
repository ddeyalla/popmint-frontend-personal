## 1. Overview

**Introduction**
Enable durable, server-backed persistence of agent–human chat history so every project’s conversation survives reloads, device switches, and browser-storage clears.

**Current Challenges**

* **Volatile state**: In-memory or localStorage storage is lost on hard refreshes, incognito sessions, or manual clears.
* **Lack of sync**: Chats started on one device aren’t visible on another.
* **Collaboration gap**: Multiple teammates can’t share or review a unified history.

**Solution Overview**
Use Supabase (Postgres + Row-Level Security + Auth) as the single source of truth for each project’s `chat_history` JSONB. Frontend calls secure Next.js API routes to fetch and save messages; clients hydrate on load and debounce updates back to the DB.

**Goals & Objectives**

* **Reliability**: Conversations persist across sessions and devices.
* **Portability**: Users pick up exactly where they left off, anywhere.
* **Collaboration**: Team members see and contribute to the same history.

---

## 2. Scope

**In-Scope**

* Supabase table & RLS policy design for `projects.chat_history`.
* Next.js API routes (`GET` / `POST`) gated by Supabase RLS.
* React/Zustand frontend integration: hydrate + debounced sync.
* Basic UX: loading skeleton, error banner with retry.

**Out-of-Scope**

* Real-time WebSocket/live updates (Phase 2).
* Full-text search or indexing (future).
* Versioned snapshots or retention policies beyond basic JSONB overwrite.

---

## 3. Stakeholders

* **Product**: Defines requirements, acceptance, KPIs
* **Engineering**: Schema, API, frontend integration
* **UX/Design**: Loading / error states
* **QA**: Functional, security, performance tests
* **Security**: RLS policy review, data-at-rest encryption

---

## 4. User Personas

| Persona         | Needs                                                     |
| --------------- | --------------------------------------------------------- |
| Individual User | Reliable load/save of personal chats across sessions      |
| Team Member     | Shared history view & write access among collaborators    |
| Project Owner   | Control over who can read/write chat (access enforcement) |

---

## 5. User Stories

1. **As a user**, I want my previous messages to load instantly when I re-open a project.
2. **As a user**, I want my chat history to survive browser clears so I never lose context.
3. **As a team member**, I want to see the same history as my collaborator on another device.
4. **As a non-collaborator**, I must be prevented from accessing any project’s chats.

---

## 6. Feature Specifications

### 6.1 Data Flow

* **On Load**

  1. Client calls `GET /api/chat/[projectId]`.
  2. API returns `chat_history` JSON.
  3. Frontend hydrates Zustand (`setMessages(initial)`).

* **On Change**

  1. Zustand store updates on each new/edited message.
  2. Debounced (500 ms) `POST /api/chat/[projectId]` with full array.
  3. API writes JSONB back to Supabase.

### 6.2 Supabase Schema & RLS

```sql
-- projects table
create table public.projects (
  id           text primary key,
  name         text not null,
  chat_history jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.projects enable row level security;

-- Only collaborators can read
create policy select_chat on public.projects
  for select using (
    exists (
      select 1 from public.project_collaborators pc
      where pc.project_id = projects.id
        and pc.user_id = auth.uid()
    )
  );

-- Only collaborators can update
create policy update_chat on public.projects
  for update using (
    exists (
      select 1 from public.project_collaborators pc
      where pc.project_id = projects.id
        and pc.user_id = auth.uid()
    )
  );
```

> **Note:** Assumes a `project_collaborators(project_id text, user_id uuid)` linking table.

### 6.3 Next.js API Routes

```ts
// pages/api/chat/[projectId].ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  const { projectId } = req.query as { projectId: string };

  if (req.method === 'GET') {
    const { data, error, status } = await supabase
      .from('projects')
      .select('chat_history')
      .eq('id', projectId)
      .single();
    if (error) return res.status(status).json({ error: error.message });
    return res.status(200).json(data.chat_history);
  }

  if (req.method === 'POST') {
    const { messages } = req.body as { messages: any[] };
    const { error, status } = await supabase
      .from('projects')
      .update({ chat_history: messages, updated_at: new Date() })
      .eq('id', projectId);
    if (error) return res.status(status).json({ error: error.message });
    return res.status(200).end();
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end();
}
```

> **Implementation Notes**
>
> * Uses `@supabase/auth-helpers-nextjs` for automatic JWT-backed auth.
> * Overwrites the entire JSONB on each POST.

### 6.4 Frontend Integration

```tsx
// lib/supabaseClient.ts
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
export const supabase = createBrowserSupabaseClient();

// ChatPanel.tsx
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { useChatStore } from '@/store/chatStore';

const fetcher = (url: string) =>
  fetch(url).then((res) => { if (!res.ok) throw new Error(); return res.json() });

export function ChatPanel() {
  const { projectName } = useSessionStore();
  const { data: initial, error: loadError } = useSWR(
    projectName ? `/api/chat/${projectName}` : null,
    fetcher
  );
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);

  // Hydrate on load
  useEffect(() => {
    if (initial) setMessages(initial);
  }, [initial, setMessages]);

  // Debounced sync
  useEffect(() => {
    if (!projectName) return;
    const timer = setTimeout(() => {
      supabase
        .from('projects')
        .update({ chat_history: messages })
        .eq('id', projectName)
        .then(({ error }) => { if (error) console.error(error.message); });
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, projectName]);

  if (loadError) return <ErrorBanner message="Could not load chat. Retry?" />;
  if (!initial)  return <LoadingSkeleton />;

  return <ChatWindow messages={messages} />;
}
```

> **UX Details**
>
> * **LoadingSkeleton** until `initial` arrives.
> * **ErrorBanner** with “Retry” triggers SWR revalidation.

---

## 7. Technical Specifications

* **Backend**: Next.js API routes + Supabase JS client
* **Database**: Supabase (Postgres + JSONB)
* **Auth**: Supabase Auth + RLS policies
* **Frontend**: React + Zustand + SWR + TypeScript
* **Error Handling**:

  * Retry 1× on transient failures (debounced sync).
  * Display banners for persistent failures.
* **Performance**:

  * Debounce at 500 ms to batch rapid message bursts.
  * Index on `projects.updated_at` for monitoring.

---

## 8. Use Cases

### UC-1: Load Chat History

* **Actor**: Authenticated collaborator
* **Flow**:

  1. User opens project.
  2. Client `GET /api/chat/[projectId]`.
  3. DB returns JSONB.
  4. Chat panel renders full history.

### UC-2: Save Chat History

* **Actor**: Authenticated collaborator
* **Flow**:

  1. User sends/receives message → Zustand update.
  2. Debounced `update` to Supabase.
  3. DB JSONB is overwritten.
  4. Client logs errors on failure.

---

## 9. Acceptance Criteria

* [ ] **Persistence**: Chats reload after hard refresh & localStorage clear.
* [ ] **Cross-Device**: History matches when opened on another device.
* [ ] **RLS**: Unauthorized users receive `403`.
* [ ] **Performance**: Initial load ≤ 300 ms for ≤ 500 messages.
* [ ] **Resilience**: Debounced sync with retry on 5xx.

---

## 10. Testing & Quality Assurance

| Case                           | Type             | Criteria                                        |
| ------------------------------ | ---------------- | ----------------------------------------------- |
| Empty history load             | Unit/Integration | Renders “No messages yet” placeholder.          |
| Existing history load          | Integration      | All messages appear in correct order.           |
| Save after new message         | Integration      | DB JSONB reflects new entry.                    |
| Unauthorized GET/POST          | Security         | API returns `403 Forbidden`.                    |
| Network failure on save        | E2E              | Single retry; user notified on persistent fail. |
| Large payload (>1000 messages) | Performance      | Load & save complete within thresholds.         |

---

## 11. KPIs

* **Load Success Rate** ≥ 99.5%
* **Sync Latency** (client → server commit) median < 1 s
* **API Error Rate** < 0.1%
* **Initial-Load Drop-off** < 5%

---

## 12. Go-Live Strategy

| Phase          | Activities                                                        |
| -------------- | ----------------------------------------------------------------- |
| Canary (5%)    | Enable for 5% new projects; monitor errors & latency              |
| Ramp (25–100%) | Gradually increase over 48 h as metrics stabilize                 |
| Full           | Roll out to all; monitor closely for anomalies                    |
| Roll-back      | Disable API write; revert to localStorage-only fallback if needed |

---

## 13. RACI

| Activity                   | R            | A         | C           | I            |
| -------------------------- | ------------ | --------- | ----------- | ------------ |
| Schema & RLS design        | DB Eng       | Product   | Security    | UX, QA       |
| API route implementation   | Backend Eng  | Tech Lead | Product     | QA           |
| Frontend integration & UX  | Frontend Eng | Tech Lead | UX, Product | QA           |
| QA test plan & execution   | QA           | QA Lead   | Eng         | Product      |
| Performance & load testing | DevOps       | DevOps    | Product, QA | —            |
| Production rollout         | DevOps       | Product   | Eng         | Stakeholders |

---

## 14. Security & Compliance

* **RLS**: Enforce per-row collaborator checks.
* **Encryption**: Supabase managed encryption at rest.
* **Input Sanitization**: Validate/Sanitize messages to prevent injection.
* **Data Retention**: JSONB overwrites only; archival policies TBD.

---

## 15. Future Enhancements

* Live collaborative updates via WebSockets.
* Message search & filtering.
* Versioned chat snapshots & undo/redo.
* Rich-media attachments with S3-backed URLs.

---

## 16. Appendix

* **Supabase RLS docs**: [https://supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)
* **Auth-helpers for Next.js**: [https://github.com/supabase/auth-helpers](https://github.com/supabase/auth-helpers)
* **Next.js API routes**: [https://nextjs.org/docs/api-routes/introduction](https://nextjs.org/docs/api-routes/introduction)
* **Zustand persist**: [https://github.com/pmndrs/zustand#persist](https://github.com/pmndrs/zustand#persist)
