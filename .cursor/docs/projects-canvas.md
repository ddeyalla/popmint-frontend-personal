## Persistent Project State PRD (No-Auth First, Fully Detailed)

---

### 1. Executive Summary

Enable true persistence of user “Projects” in Popmint’s Playground, even before Auth is in place. Every session—from the moment a user submits a prompt on the homepage through all chat and canvas interactions—must be saved to Supabase and fully restorable on reload, cross-tab, or later visits.

---

### 2. Objectives & Success Metrics

| Objective              | Metric                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| **Project Creation**   | 100% of “Send” clicks yield a `project_id` in < 200 ms           |
| **Job Mapping**        | 100% of projects link to a `job_id` before redirect              |
| **Chat Persistency**   | ≥ 99% of chat writes succeed (3× retries, <500 ms per write)     |
| **Canvas Persistency** | ≥ 99% of canvas writes succeed (debounced to ≤ 10 req/s)         |
| **State Hydration**    | ≥ 99% of projects ≤ 500 records fully restore in < 1 s on reload |
| **Error Resilience**   | “Save failed” shown ≤ 1% of interactions; manual retry available |

---

### 3. Scope & Assumptions

* **In-Scope**

  * Instant creation of a `projects` record when user submits prompt
  * Mapping `project_id ↔ job_id` in `project_jobs`
  * Full CRUD for `chat_messages` and `canvas_objects` tables
  * Client-side hydration, persistence middleware, error handling
  * Basic offline queuing for retry

* **Out-of-Scope**

  * Authentication & Authorization (to be added later)
  * Real-time multi-user collaboration
  * Advanced conflict resolution or branching
  * Version history

* **Tech Stack**

  * Frontend: Next.js, React 18, Zustand, React-Konva
  * Backend: Supabase Postgres + Edge Functions or Next.js API
  * Network: Occasional disconnects; assume ≥ 2 Mbps

---

### 4. User Flow & Sequence

1. **Homepage “Send”**

   1. User types prompt & clicks **Send**.
   2. Frontend → `POST /api/projects` → `{ project_id }` (UUID).
   3. Frontend → Your AI backend → `{ job_id }`.
   4. Frontend → `POST /api/projects/{project_id}/link-job { job_id }`.
   5. Frontend → `router.push('/playground/' + project_id)`.

2. **Playground Initial Load**

   1. Read `project_id` from URL.
   2. Parallel fetch:

      * `GET /api/projects/{project_id}/chat` → chat array.
      * `GET /api/projects/{project_id}/canvas` → objects array.
   3. Populate `useChatStore.setMessages(...)` & `useCanvasStore.setObjects(...)`.
   4. Hide loaders, show chat + canvas UI.

3. **Chat Interaction**

   * **User sends message** → local store action `addMessage(local-id, role:user, content, …)` → middleware → `POST /chat` → actual `id` replaces `local-id`.
   * **Agent responds** → same flow via `addMessage` + `POST /chat`.

4. **Canvas Interaction**

   * **Add** (drag-drop/image upload or text box):

     * `addObject(local-id, type, x,y,width,height,src,props)` → middleware → `POST /canvas/objects`.
   * **Transform** (move/resize/rotate):

     * Debounced `updateObject(id, { x,y,width,height,rotation })` → `PATCH /canvas/objects/{id}`.
   * **Delete**:

     * `deleteObject(id)` → `DELETE /canvas/objects/{id}`.

5. **Reload / New Tab**

   * Repeat **Initial Load** to fully rehydrate UI.

6. **Error & Offline Handling**

   * On any failed write: retry up to 3× (exponential backoff).
   * If still failing: surface non-blocking toast “Save failed. Retry?” with **Retry** button.
   * If offline: queue mutations in IndexedDB/localStorage; flush on reconnect.

---

### 5. Functional Requirements

| ID   | Requirement                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | **Project Creation:** `POST /api/projects` creates `projects(id, created_at)`.                                                                                 |
| FR2  | **Job Mapping:** `POST /api/projects/{project_id}/link-job { job_id }` inserts into `project_jobs`.                                                            |
| FR3  | **List Chat:** `GET /api/projects/{project_id}/chat` returns all messages ordered by `created_at`.                                                             |
| FR4  | **Create Chat:** `POST /api/projects/{project_id}/chat { role, content, image_urls[] }` inserts one message.                                                   |
| FR5  | **List Canvas:** `GET /api/projects/{project_id}/canvas` returns all objects ordered by `updated_at`.                                                          |
| FR6  | **Create Object:** `POST /api/projects/{project_id}/canvas/objects` with full object payload inserts one.                                                      |
| FR7  | **Update Object:** `PATCH /api/projects/{project_id}/canvas/objects/{id}` accepts partial fields and updates `updated_at`.                                     |
| FR8  | **Delete Object:** `DELETE /api/projects/{project_id}/canvas/objects/{id}` removes the row.                                                                    |
| FR9  | **Hydration:** On page load, client fetches chat + canvas and populates stores before UI render.                                                               |
| FR10 | **Persistence Middleware:** Subscriptions on Zustand stores trigger appropriate API calls for chat and canvas mutations, with `100 ms` debounce on transforms. |
| FR11 | **Error & Retry:** All writes retry 3×; if still failing, UI shows non-blocking toast with **Retry**.                                                          |

---

### 6. Data Models & Indexes

```sql
-- Projects
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Project–Job Mapping
CREATE TABLE project_jobs (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_id     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id)
);

-- Chat Messages
CREATE TABLE chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK(role IN ('user','agent')),
  content     text NOT NULL,
  image_urls  text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_proj_time ON chat_messages(project_id, created_at);

-- Canvas Objects
CREATE TABLE canvas_objects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK(type IN ('image','text','shape')),
  x           double precision NOT NULL,
  y           double precision NOT NULL,
  width       double precision,
  height      double precision,
  rotation    double precision DEFAULT 0,
  src         text,
  props       jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canvas_proj_updated ON canvas_objects(project_id, updated_at);
```

---

### 7. API Specification

#### 7.1. Create Project

* **POST /api/projects**
* **Response:** `200 { project_id }`

#### 7.2. Link Job

* **POST /api/projects/{project\_id}/link-job**
* **Body:** `{ "job_id": "string" }`
* **Responses:**

  * `200 { success: true }`
  * `400` if missing `job_id`
  * `404` if invalid `project_id`
  * `409` if already linked

#### 7.3. Chat Endpoints

* **GET /api/projects/{project\_id}/chat** → `{ messages: ChatMessage[] }`
* **POST /api/projects/{project\_id}/chat** → new `ChatMessage`

  * **Body:** `{ role, content, image_urls[] }`
  * **400** if invalid role or oversized payload

#### 7.4. Canvas Endpoints

* **GET /api/projects/{project\_id}/canvas** → `{ objects: CanvasObject[] }`
* **POST /api/projects/{project\_id}/canvas/objects** → new `CanvasObject`
* **PATCH /api/projects/{project\_id}/canvas/objects/{id}** → updated object
* **DELETE /api/projects/{project\_id}/canvas/objects/{id}** → `{ success: true }`

---

### 8. Frontend Design & Implementation

#### 8.1. State Stores (Zustand)

* **useProjectStore**

  * `projectId: string`, `jobId: string`, `status: 'idle'|'loading'|'error'`
  * Actions: `init(projectId)`, `setJobId(jobId)`

* **useChatStore**

  * `messages: ChatMessage[]`
  * Actions: `setMessages(ChatMessage[])`, `addMessage(ChatMessageLocal)`, `replaceMessageLocal(localId, ChatMessageServer)`

* **useCanvasStore**

  * `objects: CanvasObject[]`
  * Actions: `setObjects(CanvasObject[])`, `addObject(CanvasObjectLocal)`, `updateObject(id, Partial<CanvasObject>)`, `deleteObject(id)`

#### 8.2. Hydration Flow

```ts
// In useEffect(() => {...}, [projectId]):
projectStore.init(projectId);
Promise.all([
  supabase.from('chat_messages').select('*').eq('project_id', projectId).order('created_at'),
  supabase.from('canvas_objects').select('*').eq('project_id', projectId)
]).then(([{data: chats}, {data: objs}]) => {
  chatStore.setMessages(chats);
  canvasStore.setObjects(objs);
  // hide loader
}).catch(err => {
  // show “Failed to load project. Retry” banner
});
```

#### 8.3. Persistence Middleware

* **Chat**

  ```ts
  useChatStore.subscribe(
    state => state.messages,
    (curr, prev) => {
      const last = curr[curr.length - 1];
      if (last?.id.startsWith('local-')) {
        api.postChat(projectId, last)
           .then(serverMsg => chatStore.replaceMessageLocal(last.id, serverMsg))
           .catch(err => scheduleRetry('chat', last));
      }
    }
  );
  ```
* **Canvas**
  Similar subscription for `objects`, with `debounce(100)` on transform events.

#### 8.4. UI States & Feedback

* **Loading:** Full-screen spinner + “Preparing your workspace…”
* **Saving:** Inline spinners on message bubbles and object handles
* **Error Toast:** “Save failed. Retry” with **Retry** button
* **Offline Banner:** “You’re offline—changes will sync when you’re back.”

---

### 9. Non-Functional Requirements

| Category              | Requirement                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Performance**       | Initial hydrate ≤ 1 s for ≤ 500 records; writes < 200 ms each                       |
| **Scalability**       | Support up to 10 k chat messages + 2 k canvas objects per project                   |
| **Reliability**       | 3× retry with exponential backoff for transient failures; queue offline mutations   |
| **Security**          | (Phase 2) Add Supabase Auth + RLS so only owners can access their projects          |
| **Observability**     | Log API errors to Sentry; track metrics (save latency, hydrate duration) in Datadog |
| **Disaster Recovery** | Nightly DB backups; 7-day PITR window                                               |

---

### 10. Analytics & Instrumentation

* **Events**

  * `project_created` → `{ project_id, latency_ms }`
  * `job_linked` → `{ project_id, job_id }`
  * `chat_saved` / `canvas_saved` → `{ success, error? }`
  * `project_hydrated` → `{ messages_count, objects_count, duration_ms }`
* **Dashboards**

  * Save success rate (chat vs canvas)
  * Hydration latency distribution by project size
  * Error rate by endpoint

---

### 11. Quality Assurance & Testing

* **Unit Tests**

  * API validation errors, happy paths
  * DB migrations & constraints

* **Integration Tests**

  * End-to-end API flows with supertest / Jest
  * Data integrity checks after CRUD sequences

* **E2E Tests (Cypress)**

  1. Create project → chat 3 messages + add 2 objects → reload → assert all items present.
  2. Simulate offline → queue 2 messages → come online → assert messages saved.

* **Load Testing (Artillery)**

  * 50 concurrent users writing 5 msg/s for 1 min → 95th-pct latency < 500 ms

---

### 13. Detailed Acceptance Criteria

| AC ID | Description                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------- |
| AC1   | Homepage “Send” → `POST /projects` returns 200 + `project_id`; immediate redirect to `/playground/{id}`. |
| AC2   | `POST /link-job` stores mapping; 409 if called twice.                                                    |
| AC3   | Chat: create/read/delete all function; invalid payloads return 400.                                      |
| AC4   | Canvas: create/read/update/delete all function; invalid coords return 400.                               |
| AC5   | Reload/new tab fully hydrates UI with previous state.                                                    |
| AC6   | Debounce ensures ≤ 10 writes/s per client.                                                               |
| AC7   | Retry attempts 3× then shows “Save failed” toast with **Retry**.                                         |
| AC8   | Offline mode queues writes; syncs on reconnect.                                                          |
| AC9   | All unit/integration/E2E tests pass with ≥ 95% coverage.                                                 |


---
