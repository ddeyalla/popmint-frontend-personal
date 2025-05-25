## Canvas Thumbnail Preview Feature PRD

---

### 1. Executive Summary

Enable per-project thumbnail snapshots on the Home page—mirroring Figma/Miro’s “project card” previews—by capturing the live canvas state, generating a compressed image, storing it in Supabase Storage, and surfacing it in each project’s card. Users will immediately see a miniature of their work when they leave the Playground.

---

### 2. Objectives & Success Metrics

| Objective              | Success Metric                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Accurate Previews**  | 100% of projects with ≥1 canvas object display a thumbnail ≥ 90% visually accurate |
| **Performance**        | Snapshot generation + upload < 300 ms on desktop, < 500 ms on mobile               |
| **Storage Efficiency** | Average thumbnail size ≤ 50 KB (JPEG @ quality 0.6, 512×512 max)                   |
| **Freshness**          | Thumbnail updated within 5 s of last canvas change or on navigate-away             |
| **Reliability**        | ≥ 99% successful snapshot uploads; retries on failure                              |
| **User Satisfaction**  | Users correctly recognize projects by thumbnail in ≥ 95% of usability tests        |

---

### 3. Scope & Assumptions

* **In-Scope**

  * Client-side snapshot generation via React-Konva (`stageRef.toDataURL`)
  * Throttled snapshot triggers: on “Leave Playground” or after 2 s of inactivity post-change
  * Upload to Supabase Storage bucket `project-thumbnails/`
  * Add `thumbnail_url` column to `projects` table
  * API endpoint for thumbnail upload & project update
  * Homepage Project Card UI update to render thumbnail

* **Out-of-Scope**

  * Real-time thumbnail updates while in Playground (only on exit/inactivity)
  * Multi-page snapshot histories
  * Auth/RLS changes (assumes existing anonymous context)
  * Server-side headless rendering

* **Assumptions**

  * Existing persistent canvas state and `project_id` available
  * Supabase Storage and public URL delivery configured
  * Canvas size capped at 1024×1024; thumbnails at 512×512 max

---

### 4. How Figma & Miro Do It (Research Insights)

1. **Client-Side Snapshot**

   * Convert canvas DOM/Canvas element to data URL.
2. **Server-Side Rendering (Advanced)**

   * Figma spins up a headless browser on the server, replays the document JSON, and renders PNG.
3. **Storage & Caching**

   * Thumbnails stored in CDN-backed storage; aggressively cached.
4. **Trigger Points**

   * On file close, on manual save, and periodically.
5. **Scaling Considerations**

   * Use low-res, compressed JPEGs for thumbnails; avoid raw PNGs.

Our implementation will follow the simpler client-side model.

---

### 5. User Flow & Sequence

1. **In Playground**

   * User adds/edits canvas objects.
2. **Trigger Snapshot** (whichever comes first):

   * **On Navigate Away**: user clicks “Back to Home”
   * **Inactivity**: 2 s after last canvas change (move/resize/add/delete)
3. **Generate Data URL**

   * Call `stageRef.toDataURL({ pixelRatio: 0.5, mimeType: 'image/jpeg', quality: 0.6 })`
4. **Upload**

   * POST binary blob to `/api/projects/{project_id}/thumbnail`
5. **Server**

   * Store file in `project-thumbnails/{project_id}.jpg`
   * Update `projects.thumbnail_url` = public URL
6. **Home Page**

   * Fetch projects list: each record includes `thumbnail_url`
   * Render `<img src={thumbnail_url} alt="Project preview" />` in project card
   * If missing, show default placeholder

---

### 6. Functional Requirements

| ID   | Requirement                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | **DB**: Add `thumbnail_url text NULL` and `thumbnail_updated_at timestamptz NULL` to `projects`.                                                |
| FR2  | **Client**: Expose `stageRef` in React-Konva; implement `generateThumbnail()` util.                                                             |
| FR3  | **Trigger**: On “Back” button click or 2 s debounce after canvas mutations, call `generateThumbnail()`.                                         |
| FR4  | **API**: `POST /api/projects/{project_id}/thumbnail` accepts `Content-Type: image/jpeg` body.                                                   |
| FR5  | **Server**: On upload, save blob to Supabase Storage at `/project-thumbnails/{project_id}.jpg`; set file ACL to public-read.                    |
| FR6  | **Server**: Update `projects` row: `thumbnail_url = publicURL`, `thumbnail_updated_at = now()`.                                                 |
| FR7  | **Home**: `GET /api/projects` returns `{ thumbnail_url }`; React renders `<img>` with CSS `object-fit: cover; width:100%; height:100%`.         |
| FR8  | **Error Handling**: Retry upload up to 3× on network failure; on final failure, log to Sentry, show non-blocking toast “Thumbnail save failed.” |
| FR9  | **Debounce/Throttle**: Ensure at most 1 thumbnail generation/upload per 10 s per project to limit cost.                                         |
| FR10 | **Fallback**: If `thumbnail_url` is null or broken, show default SVG placeholder.                                                               |

---

### 7. Data Model Changes

```sql
ALTER TABLE projects
  ADD COLUMN thumbnail_url text,
  ADD COLUMN thumbnail_updated_at timestamptz;

-- Optional index to sort by freshness
CREATE INDEX idx_projects_thumb_updated ON projects(thumbnail_updated_at DESC);
```

Supabase Storage bucket:

* **Name:** `project-thumbnails`
* **Folder convention:** `{project_id}.jpg`
* **Public URL:** `https://<supabase-url>/storage/v1/object/public/project-thumbnails/{project_id}.jpg`

---

### 8. API Specification

#### 8.1. Upload Thumbnail

* **Endpoint:** `POST /api/projects/{project_id}/thumbnail`
* **Headers:** `Content-Type: image/jpeg; charset=binary`
* **Body:** JPEG binary ≤ 100 KB
* **Responses:**

  * `200 { "thumbnail_url": string, "updated_at": timestamp }`
  * `400` if invalid project\_id or empty body
  * `413` if payload > 200 KB
  * `500` on storage or DB error

---

### 9. Frontend Design & Implementation

#### 9.1. Utilities

```ts
// utils/thumbnail.ts
export async function generateThumbnail(stage: Konva.Stage): Promise<Blob> {
  const dataURL = stage.toDataURL({ pixelRatio: 0.5, mimeType: 'image/jpeg', quality: 0.6 });
  const res = await fetch(dataURL);
  const blob = await res.blob();
  return blob;
}
```

#### 9.2. Hook

```ts
// hooks/useThumbnail.ts
import { useEffect, useRef } from 'react';
import { generateThumbnail } from '@/utils/thumbnail';

export function useThumbnail(projectId: string, stageRef: React.RefObject<Konva.Stage>) {
  const timer = useRef<NodeJS.Timeout|null>(null);

  function scheduleSnapshot(delay = 2000) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(snapshot, delay);
  }

  async function snapshot() {
    if (!stageRef.current) return;
    try {
      const blob = await generateThumbnail(stageRef.current);
      await fetch(`/api/projects/${projectId}/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
    } catch (err) {
      console.error('Thumbnail save failed', err);
    }
  }

  // Trigger on inactivity
  useEffect(() => {
    // Subscribe to canvas changes elsewhere: call scheduleSnapshot()
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [projectId]);
  
  // Trigger on navigate away
  useEffect(() => {
    const handle = () => snapshot();
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [projectId]);
  
  return { scheduleSnapshot };
}
```

#### 9.3. Playground Integration

* Pass `stageRef` to `<Stage ref={stageRef}>`.
* On every canvas operation (`onDragEnd`, `onTransformEnd`, `onAdd`, `onDelete`), call `scheduleSnapshot()`.

#### 9.4. Homepage Project Card

```jsx
function ProjectCard({ project }) {
  const { thumbnail_url } = project;
  return (
    <div className="project-card">
      <div className="thumbnail">
        {thumbnail_url
          ? <img src={thumbnail_url} alt="Preview" className="object-cover w-full h-full"/>
          : <DefaultPlaceholderIcon />}
      </div>
      <div className="title">{project.name}</div>
    </div>
  );
}
```

---

### 10. Non-Functional Requirements

| Category          | Requirement                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Performance**   | Snapshot gen + upload < 300 ms desktop, < 500 ms mobile (512×512, 50 KB max)          |
| **Scalability**   | Thumbnails capped at 10 MB/month storage; auto-expire old versions if project deleted |
| **Reliability**   | 3× retry on failures; queued during brief offline, flush on reconnect                 |
| **Security**      | Only owner can upload (future Auth); files public-read in Storage                     |
| **Observability** | Log errors to Sentry; custom metric `thumbnail.upload.success_rate` in Datadog        |

---

### 11. Analytics & Instrumentation

* **Events:**

  * `thumbnail_generated` → `{ project_id, size_kb, duration_ms }`
  * `thumbnail_uploaded` → `{ success: boolean, error?: string }`
* **Dashboards:**

  * Success rate by project
  * Average upload latency
  * Storage usage trends

---

### 12. QA & Testing Strategy

* **Unit Tests:**

  * `generateThumbnail()` outputs valid Blob ≤ 200 KB
  * API rejects invalid inputs

* **Integration Tests:**

  * Simulate snapshot upload + DB update; verify `projects.thumbnail_url` set
  * Supabase Storage file exists at expected path

* **E2E Tests (Cypress):**

  1. In Playground: add object → trigger snapshot → navigate Home → assert project card shows new thumbnail.
  2. Network offline during snapshot → come online → assert retry and thumbnail appears.

* **Load Tests:**

  * Simulate 100 users triggering snapshots every 30 s → monitor Storage and API throughput

---

### 13. Deployment & Rollout

1. **Feature Flag**: `feature.canvasThumbnails`
2. **Canary**: Enable for 10% of users; monitor storage errors/latency
3. **Full Rollout**: After 48 h stable
4. **Cleanup**: Remove flag and guard code in 2 weeks

---

### 14. Acceptance Criteria

| AC ID | Description                                                                             |
| ----- | --------------------------------------------------------------------------------------- |
| AC1   | Canvas changes trigger snapshot generation within 2 s of inactivity.                    |
| AC2   | Snapshot binary size ≤ 100 KB, resolution ≤ 512×512.                                    |
| AC3   | `POST /thumbnail` stores file and updates `projects.thumbnail_url`.                     |
| AC4   | Homepage fetch returns `thumbnail_url`; project card displays correct image.            |
| AC5   | Retries occur on failure; no uncaught errors in console.                                |
| AC6   | Unit, integration, E2E tests pass with ≥ 95% coverage.                                  |
| AC7   | Feature flag successfully toggles entire thumbnail pipeline on/off without regressions. |

