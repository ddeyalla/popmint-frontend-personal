# Popmint AI Ad Agent – Comprehensive Product & Architecture Document (v0)

## 1. Introduction

This document serves as the comprehensive Product and Architecture specification for Popmint v0, an AI Ad Agent designed to streamline ad creative generation. The primary focus of this version is to deliver a functional prototype to validate core assumptions around AI-powered ad creation from a product URL, emphasizing a chat-based user experience and a real-time, interactive canvas. This document integrates requirements and technical details from planning documents, chat logic specifications, backend API contracts, and observed codebase structure.

## 2. Goals for v0

- **Core Workflow Validation:** Successfully validate the end-to-end user flow:
    - User inputs a product URL and/or text prompt.
    - An AI agent processes this input.
    - AI-generated ad images are displayed on an interactive canvas.
- **Chat UX Testing:** Evaluate the usability and effectiveness of the chat-based interaction model for guiding the user through the ad creation process.
- **AI Output Assessment:** Assess the quality, relevance, and usability of the AI-generated ad images and associated creative concepts/copy.
- **Functional Prototype:** Deliver a working, local-first application prototype built with a defined tech stack to enable rapid iteration and testing.

## 3. User Flow & Chat Panel Interaction Logic

The primary user interaction occurs within the Agent Playground, driven by a sequential chat flow that mirrors the backend's ad generation pipeline stages. The UI uses distinct chat bubble types and real-time updates via Server-Sent Events (SSE).

### 3.1. High-Level User Journey

1.  **Home Screen Input:** User lands on the home page, enters a product URL (required for v0 ad generation flow) and an optional text prompt in the input area. They may also upload an image (functionality deferred for v0).
2.  **Submission & Navigation:** User clicks "Send". The frontend POSTs the initial request to a Next.js API route (`/api/agent/start` or `/api/proxy/generate`), receives a `sessionId` (or `job_id`), and navigates to the dynamic Playground URL (`/playground/[sessionId]`).
3.  **Playground Initialization:** The Playground page component (Server Component) extracts the `sessionId` from URL parameters. The Client-Side Playground component initializes, potentially restoring state from `localStorage`, and establishes an SSE connection to the backend streaming endpoint (`/api/proxy/generate/stream?job_id=[jobId]`).
4.  **Agent-Guided Generation:** The user interacts with the AI Agent via the Chat Panel. The agent communicates progress, requests information, provides outputs (text, images), and guides the user through the ad creation stages using a structured, real-time chat interface powered by SSE events.
5.  **Canvas Interaction:** Generated ad images are automatically added to the interactive canvas. Users can manipulate these images and add text via canvas controls.
6.  **Completion/Error:** The flow concludes with the agent signaling successful completion or reporting an error via the chat stream.

### 3.2. Detailed Chat Panel Flow (Mapping SSE Events to UI)

The Chat Panel uses a "Unified Chat Flow" principle where all interactions appear as sequential chat bubbles. Specialized "Agent" bubbles represent ongoing AI tasks, while standard bubbles handle conversational elements, summaries, and final outputs.

Based on the `new-chat-logic.md` and `backenddoc.md` details, the flow is as follows:

1.  **Initial Greeting:**
    - **UI:** Standard AI Chat Bubble: `[lucide:Sparkles] "Hi there! Give me a product URL..."`
2.  **User Submission:**
    - **USER ACTION:** Enters URL/prompt and submits.
    - **UI:** Temporary Standard AI Bubble: `[lucide:Loader2 class:animate-spin] "Got it! Let me take a look..."` (Disappears upon first agent bubble).
    - **FRONTEND LOGIC:** POST `/api/proxy/generate`. Get `job_id`. Connect to `/api/proxy/generate/stream?job_id={job_id}`.
3.  **Plan Phase (`stage: "plan"`)**:
    - **SSE Event:** `event: plan`, `data: {"stage": "plan", ...}`
    - **UI:** Specialized "Plan" Chat Bubble appears. Includes title `[lucide:ClipboardList] **Our Ad Creation Plan**` and a description of the upcoming steps.
4.  **Product Analysis Phase (`stage: "page_scrape_started"`, `"page_scrape_done"`, `"image_extraction_started"`, `"image_extraction_done"`)**:
    - **SSE Event:** `event: page_scrape_started`
    - **UI:** Specialized "Product Analysis" Bubble appears. `[lucide:FileSearch] **Analyzing Product Page**`. Starts timer. Sections for "Page Content Scan" and "Visual Asset Check" appear with dynamic status (`[lucide:Loader2]` / `[lucide:Hourglass]`).
    - **SSE Events:** `event: page_scrape_done` (with `data.scraped_content_summary`), `event: image_extraction_started`, `event: image_extraction_done` (with `data.extracted_image_urls`).
    - **UI:** Dynamic statuses within the "Product Analysis" bubble update (`[lucide:CheckCircle2]`). Timer stops.
    - **UI:** Standard AI Output Bubble appears below. `[lucide:Bot] "Product page analysis complete! Here's a quick look:"`. Displays summary and image thumbnails.
5.  **Research Phase (`stage: "research_started"`, `"research_done"`)**:
    - **SSE Event:** `event: research_started`
    - **UI:** Specialized "Research" Chat Bubble appears. `[lucide:Library] **Conducting Deep Research**`. Starts timer. Sections for synthesis, market, competitors appear with dynamic statuses.
    - **SSE Event:** `event: research_done` (with `data.summary`).
    - **UI:** Dynamic statuses update to `[lucide:CheckCircle2]`. Timer stops.
    - **UI:** Standard AI Output Bubble appears. `[lucide:Bot] "Research phase wrapped up! [lucide:SearchCheck] This should give us a solid strategic base..."`. Displays research summary (expandable).
6.  **Creative Strategy Phase (`stage: "concepts_started"`, `"concepts_done"`, `"ideas_started"`, `"ideas_done"`)**:
    - **SSE Event:** `event: concepts_started`
    - **UI:** Specialized "Creative Strategy" Chat Bubble appears. `[lucide:Palette] **Crafting Ad Concepts & Copy**`. Starts timer. Sections for "Concept Generation" and "Copywriting" appear with dynamic statuses.
    - **SSE Events:** `event: concepts_done` (with `data.concepts`), `event: ideas_started`, `event: ideas_done` (with `data.ideas`).
    - **UI:** Dynamic statuses update. Timer stops.
    - **UI:** Standard AI Output Bubble appears. `[lucide:Bot] "Ad copy is hot off the press! [lucide:PenTool] Here are a few different ideas..."`. Displays ad ideas list (expandable).
7.  **Ad Creation Phase (`stage: "images_started"`, `"image_generation_progress"`, `"images_done"`)**:
    - **SSE Event:** `event: images_started`
    - **UI:** Specialized "Ad Creation" Chat Bubble appears. `[lucide:ImagePlay] **Generating Ad Visuals**`. Starts timer. Progress indicator shows image count.
    - **UI:** Canvas area becomes active, showing image placeholders.
    - **SSE Event (Repeated):** `event: image_generation_progress` (with `data.image_url`).
    - **UI:** Progress indicator updates. Image appears on canvas.
    - **SSE Event:** `event: images_done` (with `data.generated_image_urls`).
    - **UI:** Progress indicator updates to completion status (`[lucide:PartyPopper]`). Timer stops.
    - **UI (Optional):** Standard AI Bubble: `[lucide:Bot] "Visuals are complete!..."`
8.  **Completion (`stage: "done"`)**:
    - **SSE Event:** `event: done` (with `data.imageUrls`).
    - **UI:** Final Standard AI Chat Bubble: `[lucide:Bot] [lucide:Award] "And we're all done!..."`. Displays total time.
    - **FRONTEND LOGIC:** Stop master timer. Close EventSource connection.
9.  **Error Handling (`stage: "error"`)**:
    - **SSE Event:** `event: error` (with `message` and `errorCode`).
    - **UI:** The currently active Specialized Agent bubble shows error icon (`[lucide:AlertTriangle]`). Its timer shows elapsed time + `[lucide:XCircle] "Error"`.
    - **UI:** Standard AI Error Bubble appears. `[lucide:Bot] [lucide:Frown] "Oh dear, looks like we hit a small bump..."`. Displays error message and stage.
    - **FRONTEND LOGIC:** Stop timers. Display error state clearly.

### 3.3. Canvas Area Interaction

-   **Image Display:** Images generated via SSE (from `image_generation_progress` or `images_done` events) are automatically added to the Konva canvas. Multiple images are arranged with spacing.
-   **Basic Manipulation:** Users can pan (drag canvas background), zoom (via top-bar dropdown/scroll wheel), move (drag items), scale (transform handles), and delete (select + keypress) images and text nodes.
-   **Text Editing:** Add text nodes via toolbar button. Double-click to edit text using an overlay HTML input.
-   **Undo/Redo:** Manage a history of canvas states for undo/redo functionality.

## 4. System Architecture

The system follows a decoupled frontend/backend architecture with a Next.js frontend acting as a proxy for a Python FastAPI backend which orchestrates the AI Agent and external services (like OpenAI DALL-E, potential future scrapers).

### 4.1. High-Level Diagram

```mermaid
graph TD
    UserBrowser[User Browser (React, Konva, CSS)] -->|HTTP/S (Initial POST, SSE connection)| NextjsFrontend[Next.js Frontend (App Router, /api/proxy)]
    NextjsFrontend -->|HTTP/S (Proxy Requests)| FastAPIBackend[Python FastAPI Backend (OpenAI Agent SDK)]
    FastAPIBackend -->|OpenAI API| OpenAIServices[OpenAI Services (LLM, DALL-E)]
    FastAPIBackend -->|External Services (Future)| Scraper[Product Scraper]

    NextjsFrontend --SSE Stream--> UserBrowser
    FastAPIBackend --Tool Calls/Events--> FastAPIBackend
    OpenAIServices --Tool Outputs--> FastAPIBackend

    subgraph Frontend
        NextjsFrontend
    end

    subgraph Backend
        FastAPIBackend
        OpenAIServices
        Scraper
    end
```

### 4.2. Component & File Structure

-   **Frontend (Next.js App Router, TypeScript, React, Tailwind CSS, Shadcn/ui, Zustand, React Konva):**
    -   `/app/layout.tsx`: Root layout.
    -   `/app/page.tsx`: Home screen component. Handles initial user input form and navigation.
    -   `/app/playground/[sessionId]/page.tsx`: Server component page for the playground. Extracts `sessionId` from params and renders the client component.
    -   `/app/playground/[sessionId]/client.tsx`: Client component for the main playground logic. Initializes state, handles SSE connection, orchestrates chat panel and canvas.
    -   `/app/api/proxy/...`: Next.js API routes (`/generate/route.ts`, `/generate/stream/route.ts`, `/message/route.ts`, `/cancel/[jobId]/route.ts`, `/healthz/route.ts`) that act as proxies forwarding requests to the FastAPI backend.
    -   `/components/home/`: Home page specific components (`project-section.tsx`, `project-card.tsx`).
    -   `/components/playground/`: Playground-specific components (`collapsed-overlay.tsx`, `project-title-dropdown.tsx`, `sidebar-toggle.tsx`, `top-bar.tsx`).
        -   `/components/playground/chat-panel/`: Chat UI components (`chat-panel.tsx`, `message-bubble.tsx`, `message-renderer.tsx`, `chat-input/chat-input.tsx`). Contains logic for rendering different message types based on state.
        -   `/components/playground/canvas/`: Canvas UI components (`canvas-area.tsx`, `konva-image.tsx`, `konva-text.tsx`, `canvas-toolbar.tsx`). Manages React Konva stage, layers, objects, and interactions.
        -   `/components/playground/chat-panel/agent-bubbles/`: Specialized components for rendering distinct agent task bubbles.
        -   `/components/playground/chat-panel/agent-states/`: Components for dynamic status within agent bubbles.
        -   `/components/playground/chat-panel/blocks/`: Reusable content blocks within messages (e.g., for displaying research summary, ad ideas).
        -   `/components/playground/chat-panel/sse/`: Logic for handling SSE events (e.g., `product-page-handler.ts`).
        -   `/components/playground/chat-panel/handlers/`: Handlers for different message/event types.
        -   `/components/playground/chat-panel/utils/`: Chat-related utility functions.
    -   `/components/ui/`: Shared Shadcn/ui components (`button.tsx`, `dialog.tsx`, etc.).
    -   `/components/hooks/`: Custom React hooks (`use-auto-resize-textarea.ts`).
    -   `/lib/`: Utility functions (`utils.ts`, `format-utils.ts`), service wrappers (`generate-ad.ts`, `generate-image.ts`, `ad-generation-service.ts`), SSE handling (`use-event-source.ts`), agent state mapping (`agent-state-mapper.ts`), Supabase client (`supabase.ts`, `mock-supabase.ts`).
    -   `/store/`: Zustand state management stores (`chatStore.ts`, `canvasStore.ts`, `sessionStore.ts`, `projectStore.ts`). These hold the core application state that drives UI rendering.
-   **Backend (Python 3.9+, FastAPI, OpenAI Agent SDK, Pydantic):** (Illustrative structure based on PRD)
    -   `/popmint_backend/app/main.py`: FastAPI app entry point and router setup.
    -   `/popmint_backend/app/api/endpoints.py`: Defines backend API endpoints (`/generate`, `/generate/stream`, etc.).
    -   `/popmint_backend/app/agents/ad_creation_agent.py`: Defines the OpenAI Assistant, its instructions, and the tools it can use.
    -   `/popmint_backend/app/agents/event_handler.py`: Custom `AssistantEventHandler` to process OpenAI SDK events and format them for the SSE stream.
    -   `/popmint_backend/app/services/stream_manager.py`: Manages active SSE connections and queues formatted events for each session.
    -   `/popmint_backend/app/models/schemas.py`: Pydantic models for request/response validation.
    -   `/popmint_backend/requirements.txt`: Python dependencies.
    -   `/popmint_backend/.env`: Backend environment variables (e.g., API keys).

## 5. Backend API Contract & Server-Sent Events (SSE)

The frontend communicates with the backend primarily via a set of REST endpoints (proxied through Next.js) and a crucial SSE stream for real-time updates.

### 5.1. Endpoints (Proxied via `/api/proxy/`)

-   **`POST /generate`**
    -   Purpose: Initiate a new ad generation job.
    -   Request Body (JSON):
        ```json
        {
          "product_url": "string", // URL of the product page
          "n_images": "integer"    // Optional, number of images to generate (default 4)
        }
        ```
    -   Response (200 OK, JSON):
        ```json
        {
          "job_id": "string" // UUID v4 hex
        }
        ```
    -   Errors: Standard HTTP 4xx/5xx with JSON `{ "error": "...", "errorCode": "..." }`.
-   **`GET /generate/stream?job_id={job_id}`**
    -   Purpose: Subscribe to real-time progress and events for a job.
    -   Request URL: `/generate/stream?job_id=<uuid_v4_hex>`
    -   Response (200 OK, `text/event-stream`): An SSE stream. See "SSE Event Format" below.
    -   Error (404 Not Found): If `job_id` is invalid or not found. `{ "error": "job_not_found", "errorCode": "JOB_NOT_FOUND" }`
-   **`POST /cancel/{job_id}`** (Optional Feature for v0)
    -   Purpose: Request cancellation of a running job.
    -   Request URL: `/cancel/<uuid_v4_hex>`
    -   Request Body: Empty.
    -   Response (202 Accepted): `{ "status": "cancelling" }`
    -   Error (404 Not Found): If `job_id` invalid. `{ "error": "job_not_found", "errorCode": "JOB_NOT_FOUND" }`
-   **`GET /healthz`**
    -   Purpose: Liveness probe.
    -   Request: None.
    -   Response (200 OK, `text/plain`): `pong`

### 5.2. Server-Sent Events (SSE) Details

The `/generate/stream` endpoint streams events to the frontend, enabling real-time UI updates.

#### SSE Event Format

Each event follows the standard SSE format:

```
id: <sequence_number>
event: <stage_name>
data: <JSON_payload_as_string>
```

-   `id`: Unique, incrementing sequence number.
-   `event`: Corresponds to the `stage` field in the JSON payload, used for typed client-side listeners (e.g., `plan`, `research_done`, `error`).
-   `data`: A JSON string representation of the `SseEvent` object.

#### SseEvent Object Structure

```typescript
interface SseEvent {
  jobId: string;              // UUID v4 hex of the job
  stage: Stage;               // Current stage of the pipeline
  pct?: number;               // Optional: Overall progress percentage (0-100)
  message?: string;           // Optional: Human-readable status update or message
  data?: any;                 // Optional: Stage-specific payload (see below)
  errorCode?: ErrorCode;      // Optional: Specific code if stage is "error"
}
```

#### Key `Stage` Values & Payloads (`data`)

-   `"plan"`: Initial stage. `data` might contain a high-level plan or initial message.
-   `"page_scrape_started"`: Begin scraping product page. `data`: empty or minimal.
-   `"page_scrape_done"`: Page scraping finished. `data`: `{ "scraped_content_summary": { ... } }` (product details).
-   `"image_extraction_started"`: Begin image extraction. `data`: empty.
-   `"image_extraction_done"`: Image extraction finished. `data`: `{ "extracted_image_urls": ["url1", ...] }`.
-   `"research_started"`: Begin research phase. `data`: empty.
-   `"research_done"`: Research finished. `data`: `{ "summary": "Detailed research report..." }`.
-   `"concepts_started"`: Begin concept generation. `data`: empty.
-   `"concepts_done"`: Concepts generated. `data`: `{ "concepts": [{ "concept_name": "...", ... }, ...] }`.
-   `"ideas_started"`: Begin ad idea/copy generation. `data`: empty.
-   `"ideas_done"`: Ideas generated. `data`: `{ "ideas": [{ "title": "...", "ad_description": "...", ... }, ...] }`.
-   `"images_started"`: Begin image generation/batching. `data`: Might include total image count.
-   `"image_generation_progress"`: Progress for a single image. `data`: `{ "current_image": N, "total_images": M, "image_url": "url" }`. This event is crucial for adding images to the canvas in real-time.
-   `"images_done"`: Image generation batch complete. `data`: `{ "generated_image_urls": ["url1", ...], "failed_image_count": N }`.
-   `"done"`: Entire pipeline successful. `data`: Often includes final image URLs `{ "imageUrls": ["url1", ...] }`.
-   `"error"`: Pipeline failed. `data`: empty or includes error details.

#### Error Codes (`errorCode`)

-   `"SCRAPE_FAIL"`
-   `"IMAGE_EXTRACTION_FAIL"`
-   `"RESEARCH_FAIL"`
-   `"CONCEPT_FAIL"`
-   `"IDEA_FAIL"`
-   `"IMAGE_GENERATION_FAIL"`
-   `"CANCELLED"`
-   `"UNKNOWN_ERROR"`
-   `"JOB_NOT_FOUND"` (for `/stream` or `/cancel` requests)

#### Heartbeat Events

-   Sent periodically (`event: heartbeat`, `data: { "timestamp": ... }`) to keep the connection alive.

#### Sample Log

See the content of `.cursor/docs/sample-logs.md` for a real-world example sequence of SSE events and their structure during a full ad generation job.

## 6. State Management (Frontend)

Frontend state is managed using Zustand, a lightweight state management library.

-   **`chatStore.ts`:** Manages the array of chat messages (`ChatMessage[]`), including specialized agent bubbles and their dynamic statuses. It also tracks the `currentJob` state (`AdGenerationData`), which reflects the overall progress and data (`stage`, `progress`, `scrapedContent`, `researchSummary`, `adIdeas`, `generatedImages`) received from the SSE stream.
-   **`canvasStore.ts`:** Manages the state of the React Konva canvas, including the list of objects (`KonvaObject[]` - images, text), canvas history for undo/redo, current history step, selected object ID, and zoom level.
-   **`sessionStore.ts`:** Stores session-specific information like the `sessionId` and `projectName`. It also includes logic to map backend `job_id`s to frontend `projectName`s.
-   **`projectStore.ts`:** (If used beyond sessionStore) Manages broader project-level state, although v0 focuses on session-level ephemerality.

UI components read from these stores, and actions (like adding a message, updating job progress, adding an image to the canvas) are dispatched via store actions, often triggered by incoming SSE events.

## 7. Error Handling

-   **Backend Errors:** Critical errors in the backend pipeline trigger an `event: error` on the SSE stream with a specific `errorCode` and message. The frontend detects this, stops relevant timers, updates the corresponding agent bubble to an error state, and displays a dedicated error message bubble with details.
-   **Frontend Errors:** Handled within components and hooks (e.g., invalid URL input on the home page, API call failures). Error messages are typically added as standard error-typed chat messages (`type: 'error'`).
-   **SSE Connection Errors:** The custom `use-event-source.ts` hook should handle connection retries and report unrecoverable errors to the chat store.
-   **API Proxy Errors:** Errors from the Next.js proxy routes when forwarding requests to the backend should be caught and presented to the user in the chat UI.

## 8. Key Data Structures & Types

### 8.1. Frontend (`types.ts`, `store/chatStore.ts`)

```typescript
// Simplified Stage system (Frontend representation)
export type AdGenerationStage =
  | 'thinking' | 'planning' | 'scraping' | 'researching' | 'concepting' | 'ideating' | 'imaging' | 'completed' | 'error';

// Simplified Message Types (Frontend)
export type MessageType =
  | 'text' | 'ad_generation' | 'ad_step_complete' | 'agent_progress'
  | 'agent_output' | 'agent_bubble' | 'temporary_status' | 'error';

// Agent bubble types (Frontend UI categories)
export type AgentBubbleType =
  | 'plan' | 'product_analysis' | 'research' | 'creative_strategy' | 'ad_creation';

// Agent bubble section status
export type SectionStatus =
  | 'pending' | 'active' | 'completed' | 'error';

// Agent bubble section structure
export interface AgentBubbleSection {
  id: string; // Client-side generated
  title: string;
  description: string;
  icon: string; // Lucide icon name or SVG identifier
  status: SectionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // ms
  data?: any; // Section-specific data
}

// Specialized Agent bubble data
export interface AgentBubbleData {
  id: string; // Client-side generated
  type: AgentBubbleType; // e.g., 'product_analysis'
  title: string;
  icon: string;
  gradient?: string; // Styling hint
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms
  sections: AgentBubbleSection[]; // Steps within the agent task
  isCompleted: boolean;
  error?: string;
  jobId: string; // Corresponds to backend jobId
}


// State for a running ad generation job (in chatStore)
export interface AdGenerationData {
  jobId: string; // Backend job ID
  stage: AdGenerationStage; // Current stage (frontend abstraction)
  progress: number; // Overall progress %
  message?: string; // Current status message

  // Data accumulated from different stages
  scrapedContent?: any; // From page_scrape_done
  researchSummary?: string; // From research_done
  adIdeas?: any[]; // From ideas_done
  generatedImages?: string[]; // From images_done

  // Error info
  error?: string;
  errorCode?: string; // Backend error code

  // Timing
  startTime?: Date; // Job start time
  stageStartTime?: Date; // Current stage start time
  stepTimings: StepTiming[]; // Log of completed step timings
  currentStepStartTime?: Date;
}

// Main Chat Message structure
export interface ChatMessage {
  id: string; // Client-side generated UUID
  role: 'user' | 'assistant';
  type: MessageType; // e.g., 'text', 'ad_generation', 'agent_output'
  content: string; // Main text content
  timestamp: Date;
  icon?: string; // Optional icon (e.g., Lucide name)

  // Optional data for specific message types
  adData?: AdGenerationData; // For ad_generation type (main task bubble state)
  agentData?: AgentBubbleData; // For agent_bubble type (specialized task bubbles)
  imageUrls?: string[]; // For messages containing images (user upload, agent output)
  isTemporary?: boolean; // For temporary UI status messages
}

// Canvas object structure
interface KonvaObject {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  // ... other Konva properties (width, height, rotation, etc.)
  src?: string; // for images
  text?: string; // for text
}

interface CanvasState {
  objects: KonvaObject[];
  // ... other canvas state like zoom, pan offset
}
```

### 8.2. Backend (`popmint_backend/app/models/schemas.py`, Event Logic)

```typescript
// Backend Error Codes
type ErrorCode =
  | "SCRAPE_FAIL"
  | "IMAGE_EXTRACTION_FAIL"
  | "RESEARCH_FAIL"
  | "CONCEPT_FAIL"
  | "IDEA_FAIL"
  | "IMAGE_GENERATION_FAIL"
  | "CANCELLED"
  | "UNKNOWN_ERROR"
  | "JOB_NOT_FOUND";

// Backend Pipeline Stages (correspond to SSE 'event' and 'stage')
type Stage =
  | "plan"
  | "page_scrape_started"
  | "page_scrape_done"
  | "image_extraction_started"
  | "image_extraction_done"
  | "research_started"
  | "research_done"
  | "concepts_started"
  | "concepts_done"
  | "ideas_started"
  | "ideas_done"
  | "images_started"
  | "image_generation_progress"
  | "images_done"
  | "done"
  | "error";

// Structure of the payload sent in the 'data' field of an SSE event
interface SseEvent {
  jobId: string;              // UUID v4 hex
  stage: Stage;               // Current stage
  pct?: number;               // 0-100 (optional)
  message?: string;           // Optional status update
  data?: any;                 // Stage-specific payload (details vary by stage)
  errorCode?: ErrorCode;      // Optional, if stage is "error"
}

// Examples of Stage-specific data payloads (within SseEvent.data)
interface PageScrapeDoneData { scraped_content_summary: { [key: string]: any }; }
interface ImageExtractionDoneData { extracted_image_urls: string[]; }
interface ResearchDoneData { summary: string; /* ... other research details */ }
interface ConceptsDoneData { concepts: Array<{ concept_name: string; [key: string]: any }>; }
interface IdeasDoneData { ideas: Array<{ title: string; ad_description: string; [key: string]: any }>; }
interface ImageProgressData { current_image: number; total_images: number; image_url?: string; }
interface ImagesDoneData { generated_image_urls: string[]; failed_image_count: number; }
interface DoneData { imageUrls: string[]; }

// Pydantic models in backend for request/response validation (e.g., for /generate POST body)
// Example (schematic):
class GenerateRequestSchema:
    product_url: str
    n_images: int = 4

class GenerateResponseSchema:
    job_id: str

// The backend's internal representation of a Job (schematic, likely in-memory for v0)
interface AdGenerationJob {
    id: string; // job_id
    thread_id: string; // OpenAI Assistant Thread ID
    run_id: string; // Current OpenAI Assistant Run ID
    status: 'running' | 'completed' | 'failed' | 'cancelled'; // Internal status
    current_stage: Stage;
    progress: number;
    // ... other job data accumulated during the process
}
```

## 9. Out of Scope for v0

-   User authentication and accounts.
-   Advanced collaboration features on the canvas.
-   Billing, subscription, or payment integration.
-   Multi-language support.
-   Sophisticated AI agent capabilities beyond the defined ad generation pipeline (e.g., freeform creative editing via chat).

## 10. Future Considerations (Post-v0)

-   Implementing persistent storage for projects and user data.
-   Adding user authentication and accounts.
-   Expanding canvas features (layers, more tools, templates).
-   Integrating more sophisticated AI editing capabilities (e.g., "Change background to...", "Make text bolder").
-   Improving the AI agent's ability to handle more complex prompts and iterative feedback.
-   Implementing the `/cancel` endpoint functionality fully.
-   Adding more robust validation and error handling.
-   Developing a comprehensive test suite (unit, integration, E2E).
-   Refining the mobile/responsive experience.

## 11. References

-   [backenddoc.md](backenddoc.md): Full backend API contract and SSE event details.
-   [new-chat-logic.md](new-chat-logic.md): Detailed frontend UI chat script and bubble logic.
-   [sample-logs.md](sample-logs.md): Real event logs for a full ad generation job.
-   [ad_generation_flow.md](ad_generation_flow.md): Mermaid diagram of the ad generation flow (referenced within this doc).
-   Codebase: `/app`, `/components`, `/lib`, `/store`, `/types` directories for implementation details.

---