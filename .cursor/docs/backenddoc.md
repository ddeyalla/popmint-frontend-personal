API Contract (v0)
Common Objects
type ErrorCode = 
  | "SCRAPE_FAIL"
  | "IMAGE_EXTRACTION_FAIL"
  | "RESEARCH_FAIL"
  | "CONCEPT_FAIL"
  | "IDEA_FAIL"
  | "IMAGE_GENERATION_FAIL"
  | "CANCELLED"
  | "UNKNOWN_ERROR"
  | "JOB_NOT_FOUND"; // Added for cancel/stream lookup

type Stage =
  | "plan" // Initial planning phase, e.g., job accepted
  | "page_scrape_started" // Starting to scrape the main product page for initial info
  | "page_scrape_done" // Finished scraping the main product page
  | "image_extraction_started" // Starting to extract product images from product URL
  | "image_extraction_done" // Finished extracting product images
  | "research_started" // Starting detailed product and market research
  | "research_done" // Research phase completed
  | "concepts_started" // Starting to generate ad concepts
  | "concepts_done" // Ad concepts generated
  | "ideas_started" // Starting to generate ad ideas/copy
  | "ideas_done" // Ad ideas generated
  | "images_started" // Starting image generation/editing batch
  | "image_generation_progress" // Optional: Progress for individual image generation within the batch
  | "images_done" // All images in the batch are processed (successfully or with errors for some)
  | "done" // All steps completed successfully, final images ready
  | "error"; // An error occurred in the pipeline

interface SseEvent {
  jobId: string;              // UUID v4 hex
  stage: Stage;
  pct?: number;               // 0-100 (optional, overall progress)
  message?: string;           // human-readable status update
  data?: any;                 // stage-specific payload (see details below)
  errorCode?: ErrorCode;      // Optional: specific code if stage is "error"
}

// Example of specific data payloads (refer to PRD Section 7.1 for full list)
interface PageScrapeData { scraped_content_summary: string; }
interface ImageExtractionData { extracted_image_urls: string[]; }
interface ResearchData { summary: string; /* ... */ }
interface ConceptData { concept_name: string; /* ... */ }
interface IdeaData { ad_idea_title: string; concept: string; /* ... */ }
interface ImageProgressData { current_image: number; total_images: number; image_url?: string; }
interface ImagesDoneData { generated_image_urls: string[]; failed_image_count: number; }
interface DoneData { imageUrls: string[]; }
Endpoints
All endpoints are part of the FastAPI service (e.g., http://localhost:8000). The frontend interacts with these via a proxy at /api/proxy/ to avoid CORS issues.

GET /healthz

Purpose: Liveness probe.
Request: None.
Response (200 OK):
Header: Content-Type: text/plain; charset=UTF-8
Body: pong
POST /generate

Purpose: Kicks off a new ad generation pipeline.
Request Headers: Content-Type: application/json
Request Body:
{
  "product_url": "https://example.com/product-page",
  "n_images": 4 
}
product_url (string, required): The URL of the product.
n_images (integer, optional): Number of images to generate per ad idea. Defaults to 4, min 1, max 10.
Response (200 OK):
Header: Content-Type: application/json
Body: {"job_id": "<uuid_v4_hex>"} The client uses this job_id to connect to the SSE stream.
Error Responses: Standard HTTP 4xx/5xx with JSON body:
{ "error": "Descriptive error message", "errorCode": "OPTIONAL_ERROR_CODE" }
GET /generate/stream?job_id={job_id}

Purpose: Streams pipeline progress using Server-Sent Events (SSE).
Request URL: /generate/stream?job_id=<uuid_v4_hex>
Request Headers (Optional): Last-Event-ID for reconnection support.
Response (200 OK):
Headers:
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
X-Accel-Buffering: no
Transfer-Encoding: chunked (often added by ASGI server)
Body: An SSE stream. See "Server-Sent Events (SSE) Details" below.
Error Response (404 Not Found): If job_id is invalid or not found.
{ "error": "job_not_found", "errorCode": "JOB_NOT_FOUND" }
POST /cancel/{job_id} (Optional, as per PRD)

Purpose: Requests cancellation of a running generation job.
Request URL: /cancel/<uuid_v4_hex>
Request Body: Empty.
Response (202 Accepted):
{ "status": "cancelling" }
Response (404 Not Found): If job_id is invalid or not found.
{ "error": "job_not_found", "errorCode": "JOB_NOT_FOUND" }
Server-Sent Events (SSE) Details
The /generate/stream endpoint provides real-time updates on the ad generation process.

SSE Event Format
Each event sent over the stream follows this format:

id: <sequence_number>
event: <stage_name>
data: <JSON_payload_as_string>

id: A unique, incrementing sequence number for the event. Used by clients for reconnection (Last-Event-ID).
event: The current Stage of the pipeline (e.g., plan, research_done, error).
data: A JSON string representing the SseEvent object (see "Common Objects" above).
Example SSE Event:

id: 5
event: concepts_done
data: {"jobId":"a1b2c3d4-...", "stage":"concepts_done", "pct":60, "message":"Ad concepts generated.", "data":{"concepts":[{"concept_name":"Dummy Concept 1"}, {"concept_name":"Dummy Concept 2"}]}}

A more complete example of an SSE event stream, including orchestrator logs, can be found in api/fastapi_sse_event_example.log.

Heartbeat Events
To prevent connection timeouts with proxies and load balancers, a heartbeat event is sent approximately every 30-55 seconds if no other data is being sent.

id: <current_sequence_number>
event: heartbeat
data: {"timestamp": 1678886400000} 
:

Note the extra colon (:) line for some heartbeat implementations; the exact format might vary but event: heartbeat is key. The PRD specifies `:

which meansid: event: heartbeat data: {"timestamp":123456789} :

`.

Stream Lifecycle
Connection: Client connects to /generate/stream?job_id={job_id}.
First Event: Typically an event with stage: "plan":
id: 1
event: plan
data: {"jobId":"<uuid>","stage":"plan","message":"Smart plan queued"}

Intermediate Events: As the pipeline progresses, events corresponding to each Stage are sent. This includes *_started and *_done stages, and potentially image_generation_progress.
Final Event (Success):
id: N
event: done
data: {"jobId":"<uuid>","stage":"done","pct":100,"message":"Ad generation complete.","data":{"imageUrls":["/generated/<uuid>/img_0.png", ...]}}

Final Event (Error): If an error occurs:
id: M
event: error
data: {"jobId":"<uuid>","stage":"error","message":"Failed during research.","errorCode":"RESEARCH_FAIL", "pct": <progress_at_failure>}

Stream Closure: After a done or error event, the server typically closes the connection. The client should also close its EventSource instance.
Client-Side Handling (Example)
The frontend uses a custom hook useEventSource.ts which likely wraps the browser's native EventSource API.

// Simplified example (see web/lib/useEventSource.ts for actual implementation)
const eventSource = new EventSource(`/api/proxy/generate/stream?job_id=${jobId}`);

eventSource.onmessage = (event) => { // Default handler for events without a specific 'event' field
  const parsedData = JSON.parse(event.data);
  console.log("Generic SSE message:", parsedData);
  // Update UI based on parsedData.stage, parsedData.data, etc.
  if (parsedData.stage === "done" || parsedData.stage === "error") {
    eventSource.close();
  }
};

eventSource.addEventListener('plan', (event) => {
  const planData = JSON.parse(event.data);
  console.log('Plan received:', planData);
});

eventSource.addEventListener('research_done', (event) => {
  const researchData = JSON.parse(event.data);
  console.log('Research done:', researchData.data);
});

// Add listeners for other specific stages as needed...

eventSource.addEventListener('heartbeat', (event) => {
  console.log('Heartbeat received:', JSON.parse(event.data));
});

eventSource.onerror = (error) => {
  console.error("SSE Error:", error);
  // EventSource handles reconnection automatically by default,
  // unless the error is fatal (e.g., server closes connection with non-200 code).
};
SSE Event Summary Breakdown
The Server-Sent Events (SSE) stream provides a detailed, real-time account of the ad generation pipeline. Here's a breakdown of the typical event flow and what each signifies, based on the information from the shared resource (ChatGPT - SSE Overview) and the project's implementation:

Connection & Initialization:

Upon successful connection to the /generate/stream?job_id={job_id} endpoint, the stream begins.
event: plan with stage: "plan": This is often the first event, indicating the job is queued and the orchestrator is preparing to start or has connected to an existing job. The message might confirm connection or queue status. pct (progress percentage) will be low (e.g., 0-5%).
Core Pipeline Stages: Each major step in the ad generation process will typically emit *_started and *_done events. The message field provides a human-readable status, and pct is updated to reflect overall progress.

event: page_scrape_started (stage: "page_scrape_started"): Signals the beginning of the product page scraping process.
event: page_scrape_done (stage: "page_scrape_done"): Indicates that page scraping is complete. The data field will contain a summary of the scraped content, like {"scraped_content_summary": {"price": "...", "title": "...", ...}}.
event: image_extraction_started (stage: "image_extraction_started"): Image extraction from the product URL begins.
event: image_extraction_done (stage: "image_extraction_done"): Image extraction is complete. data includes {"extracted_image_urls": ["url1.jpg", ...]}.
event: research_started (stage: "research_started"): The research phase (e.g., using LLMs to analyze product info) starts.
event: research_done (stage: "research_done"): Research is finished. data contains the research {"summary": "Detailed research report..."}.
event: concepts_started (stage: "concepts_started"): Ad concept generation begins.
event: concepts_done (stage: "concepts_done"): Ad concepts are generated. data includes {"concepts": [{"concept_name": "Concept A"}, ...]}.
event: ideas_started (stage: "ideas_started"): Generation of ad copy and specific ideas starts.
event: ideas_done (stage: "ideas_done"): Ad ideas are complete. data includes {"ideas": [{"title": "Ad Idea 1"}, ...]}.
event: images_started (stage: "images_started"): The image generation batch process begins. The message might indicate how many images are being generated.
event: image_generation_progress (stage: "image_generation_progress"): Sent for each image generated within a batch. data includes {"current_image": 1, "total_images": 4, "image_url": "/generated/.../img_0.png"}.
event: images_done (stage: "images_done"): All images in the batch have been processed. data includes {"generated_image_urls": ["/path/to/img1.png", ...], "failed_image_count": 0}.
Completion or Error:

event: done (stage: "done"): Signals the successful completion of the entire pipeline. pct will be 100. The data field typically includes the final {"imageUrls": ["/path/to/final_image1.png", ...]}.
event: error (stage: "error"): Sent if any part of the pipeline fails. The message will describe the error, and errorCode will provide a specific code (e.g., "SCRAPE_FAIL"). pct will reflect progress at the point of failure.
Keep-Alive:

event: heartbeat: These events are sent periodically (e.g., every 30-55 seconds) if no other data is transmitted. This prevents proxies or load balancers from closing the connection due to inactivity. The data payload usually contains a timestamp: {"timestamp": 1234567890}.
General Event Structure: As noted previously, each SSE message is structured with:

id: <sequence_number>
event: <stage_name> (corresponds to the stage in the JSON data for typed client-side listeners)
data: <JSON_payload_string>
The JSON payload string is an SseEvent object containing jobId, stage, pct, message, and often stage-specific data.

This structured flow allows the client to precisely track the job's progress, display relevant messages, and handle data specific to each stage, providing a rich, interactive experience for the user. For a raw log example of such a stream, see api/fastapi_sse_event_example.log.