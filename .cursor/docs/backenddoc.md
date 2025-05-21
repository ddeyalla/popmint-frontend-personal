AI Ad Maker
The AI Ad Maker is a tool that takes a product URL and generates a research summary, ad concepts, ad copy ideas, and locally stored static images. Users can see the progress live in a chat-style UI.

Project Overview
This project is an MVP (Minimum Viable Product) designed for a single user. It focuses on delivering the core functionality of generating ad creatives from a product URL.

Frontend: Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and shadcn/ui.
Backend: Powered by FastAPI (Python 3.11), handling the generation pipeline asynchronously.
AI/ML: Utilizes OpenAI GPT-4o for text generation and Stability/Leonardo for image generation (though initially implemented with stubs).
Web Scraping: Uses playwright-async for headless browser scraping.
Asset Storage: Generated images are stored locally on disk.
Directory Structure
ai-ad-agent/
├── api/                  # FastAPI Backend
│   ├── main.py             # FastAPI app, /healthz endpoint
│   ├── routes.py           # /generate, /cancel endpoints
│   ├── models.py           # Pydantic models for requests/responses
│   ├── orchestrator.py     # Orchestrator class managing the pipeline
│   ├── steps.py            # Functions for each pipeline stage (initially stubs)
│   ├── state.py            # Stage enum for tracking progress
│   ├── prompt_utils.py     # Utility for loading prompts
│   ├── prompts/            # Directory for prompt text files
│   │   ├── research_product.txt
│   │   ├── extract_images.txt
│   │   ├── create_ad_concept.txt
│   │   ├── generate_ad_ideas.txt
│   │   └── edit_ad_image.txt
│   ├── .env.example        # Example environment variables for the API
│   └── requirements.txt    # Python dependencies
├── web/                  # Next.js Frontend
│   ├── app/
│   │   ├── api/proxy/[...slug]/route.ts # Edge proxy to backend
│   │   └── page.tsx        # Main landing/studio page
│   ├── components/
│   │   ├── AdChat.tsx      # Chat UI component
│   │   └── ImageGrid.tsx   # Component to display generated images
│   ├── lib/useEventSource.ts # React hook for SSE
│   ├── public/generated/   # Directory where generated images are stored
│   ├── .env.example        # Example environment variables for the web app
│   └── next.config.js      # Next.js configuration
├── .env.example          # Shared/root example environment variables
├── README.md               # This file
└── ... (other configuration files)
Setup Instructions
Prerequisites
Node.js (latest LTS version recommended)
Python 3.11
Poetry (for Python package management, if pyproject.toml is used) or pip
Environment Variables
Root Level: Copy ai-ad-agent/.env.example to ai-ad-agent/.env and fill in any necessary global variables. (Though specific keys are usually in service-level .env files).

API (Backend):

Navigate to the ai-ad-agent/api/ directory.
Copy api/.env.example to api/.env.
Fill in the required API keys and configurations:
OPENAI_API_KEY="your_openai_api_key"
STABILITY_API_KEY="your_stability_api_key" 
# Add other necessary environment variables for the API
Web (Frontend):

Navigate to the ai-ad-agent/web/ directory.
Copy web/.env.example to web/.env.local (Next.js convention).
Fill in the required configurations:
NEXT_PUBLIC_FASTAPI_URL="http://localhost:8000" # URL of your running FastAPI backend
# Add other necessary environment variables for the frontend
Note: NEXT_PUBLIC_FASTAPI_URL is used by the proxy route to forward requests to the backend.
Backend Setup (FastAPI)
Navigate to the ai-ad-agent/api/ directory:
cd api
Create a Python virtual environment and activate it:
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install dependencies:
pip install -r requirements.txt
# If using poetry and pyproject.toml:
# poetry install
Run the FastAPI development server:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
The API should now be running at http://localhost:8000. You can check its health at http://localhost:8000/healthz.
Frontend Setup (Next.js)
Navigate to the ai-ad-agent/web/ directory:
cd web
Install dependencies:
npm install
# or
# yarn install
# or
# pnpm install
Run the Next.js development server:
npm run dev
# or
# yarn dev
# or
# pnpm dev
The frontend should now be running at http://localhost:3000.
Backend API Specifications
The backend is a FastAPI application providing endpoints to generate ad creatives and stream progress.

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

Orchestration and Pipeline Steps
The backend uses an Orchestrator class (api/orchestrator.py) to manage the ad generation pipeline. This orchestrator calls a sequence of functions defined in api/steps.py.

The pipeline stages are (as per Stage enum):

plan
page_scrape_started -> page_scrape_done
image_extraction_started -> image_extraction_done
research_started -> research_done
concepts_started -> concepts_done
ideas_started -> ideas_done
images_started -> (image_generation_progress) -> images_done
done or error
Initially, the functions in api/steps.py are stubs that return dummy data and simulate async work. This allows the end-to-end system (UI to SSE stream to local file creation) to be tested without actual LLM/API calls. These stubs are intended to be replaced with real implementations.

Prompts
Prompts for LLM interactions are stored in the api/prompts/ directory. A utility function in api/prompt_utils.py (load_prompt(prompt_name: str)) is used to load these prompts. Placeholder prompt files:

research_product.txt
extract_images.txt
create_ad_concept.txt
generate_ad_ideas.txt
edit_ad_image.txt
Image Storage
Generated images are stored locally in the web/public/generated/<job_id>/ directory. For example, web/public/generated/a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8/img_0.png. The Next.js frontend serves these images statically.

Important Considerations
Error Handling: The pipeline is designed to emit detailed error events via SSE if any stage fails.
Cancellation: An optional cancellation endpoint allows stopping a running job. Step functions should check for a cancellation flag.
Scalability (Future): The current inline pipeline is suitable for an MVP. For scaling, this could be refactored to use a message queue (e.g., Redis, RabbitMQ, Upstash) with background workers.
Security: API keys and sensitive configurations should never be hardcoded. Always use environment variables loaded from .env files (which should be in .gitignore).
Dependencies: Ensure all dependencies listed in api/requirements.txt and web/package.json are installed correctly in their respective environments.
Development Workflow
Ensure both backend and frontend development servers are running.
Open the frontend URL (e.g., http://localhost:3000) in your browser.
Use the chat interface to input a product URL and start the ad generation process.
Monitor the console in your browser's developer tools and the terminal output of the FastAPI server for logs and SSE events.
This README provides a comprehensive guide to understanding, setting up, and developing the AI Ad Maker project. Refer to the PRD document and code comments for more granular details.