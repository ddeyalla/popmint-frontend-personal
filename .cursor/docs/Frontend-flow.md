**Overall Principle:**

- Once the job_id is obtained and the SSE connection is established, the frontend listens to specific event types from the stream.
- Each relevant event (e.g., page_scrape_started, page_scrape_done) will trigger a corresponding UI update.
- Loading messages like "Thinking...", "Checking product details..." should be displayed when the *_started event for that stage is received and replaced/updated when the *_done event (or image_generation_progress) for that stage is received.
- start a timer when a stage starts just below the bubble and time taken to complete a stage - use start and end time ti calculate the time taken

---

**Refined Frontend Flow:**

1. **User Submits URL:**
    - User pastes a product URL into an input field and submits.
    - **FE Action:**
        - Display a "Thinking..." bubble (with animated dots).
        - Make a POST /generate API call to the backend with the product_url.
    - **BE Interaction:**
        - Backend receives the request, creates a job, and returns a job_id.
2. **Job Initialization & SSE Connection:**
    - **FE Action (on POST /generate success - job_id received):**
        - Store the job_id.
        - Initiate an SSE connection to GET /generate/stream?job_id={job_id}.
        - The "Thinking..." bubble remains.
    - **FE Action (on POST /generate failure):**
        - Remove "Thinking..." bubble.
        - Display an appropriate error message to the user. (End of flow for this attempt).
    - **SSE Event Listener:**
        - Once connected, the FE listens for an event: plan from the SSE stream.
        - **Expected SSE:** id: X, event: plan, data: {"jobId": "...", "stage": "plan", "message": "Smart plan queued", "pct": 0} (or similar initial plan message).
3. **Smart Plan UI Display:**
    - **FE Action (on receiving first event: plan from SSE):**
        - Remove the "Thinking..." bubble.
        - Display the "Smart plan" UI. This could be a static message like **Smart planning**
        Here’s a plan I’ve prepared to create the ad
        - **Icon Deep research**
            - Dive into the product page, real reviews, and top performing competitor ads
        - **Sparkle icon Shape Ad concepts**
            - Blend those insights with your brand voice to sketch 2–3 campaign angles each with a clear promise, vibe, and CTA
        - **Image icon Craft the ads**
            - Turn the concept you pick into fully finished static visuals + copy
        
        ![image.png](attachment:9a795272-30c4-4b0a-865d-598e1fafc2ff:image.png)
        
4. **Checking Product Details:**
    - **FE Action (on receiving event: page_scrape_started from SSE):**
        - **Expected SSE:** id: X, event: page_scrape_started, data: {"jobId": "...", "stage": "page_scrape_started", "message": "Scraping product page...", "pct": Y}
        - Display "Checking product details..." (with animated dots).
    - **FE Action (on receiving event: page_scrape_done from SSE):**
        - **Expected SSE:** id: X, event: page_scrape_done, data: {"jobId": "...", "stage": "page_scrape_done", "message": "Page scrape completed", "data": {"scraped_content_summary": {...}}}
        - Remove "Checking product details..."
        - Display the scraped_content_summary data in a structured format.
    - **Note:** The backend also performs image_extraction_started and image_extraction_done. The FE will receive these SSE events but will **not** display any specific UI updates for them, as per your requirement.
5. **Researching Product:**
    - **FE Action (on receiving event: research_started from SSE):**
        - **Expected SSE:** id: X, event: research_started, data: {"jobId": "...", "stage": "research_started", "message": "Researching product...", "pct": Y}
        - Display "Researching..." (with animated dots).
    - **FE Action (on receiving event: research_done from SSE):**
        - **Expected SSE:** id: X, event: research_done, data: {"jobId": "...", "stage": "research_done", "message": "Research completed", "data": {"summary": "..."}}}
        - Remove "Researching..."
        - Display the product research summary. Show the first 300 characters and provide a UI element (e.g., a dropdown/expander button) to view the full content. Ensure the output is well-structured.
6. **Generating Ad Concepts:**
    - **FE Action (on receiving event: concepts_started from SSE):**
        - **Expected SSE:** id: X, event: concepts_started, data: {"jobId": "...", "stage": "concepts_started", "message": "Generating ad concepts...", "pct": Y}
        - Display "Generating ad concepts..." (with animated dots).
    - **FE Action (on receiving event: concepts_done from SSE):**
        - **Expected SSE:** id: X, event: concepts_done, data: {"jobId": "...", "stage": "concepts_done", "message": "Concepts generated", "data": {"concepts": [...]}}}
        - The "Generating ad concepts..." message can be removed or updated (e.g., to "✓ Ad concepts generated. Moving to next step...").
        - No specific data from concepts_done needs to be rendered on the UI, as per your requirement.
7. **Generating Ad Copy Ideas:**
    - **FE Action (on receiving event: ideas_started from SSE):**
        - **Expected SSE:** id: X, event: ideas_started, data: {"jobId": "...", "stage": "ideas_started", "message": "Generating ad copy ideas...", "pct": Y}
        - Display "Generating ad copy ideas..." (with animated dots).
    - **FE Action (on receiving event: ideas_done from SSE):**
        - **Expected SSE:** id: X, event: ideas_done, data: {"jobId": "...", "stage": "ideas_done", "message": "Ad copy ideas generated", "data": {"ideas": [...]}}}
        - Remove "Generating ad copy ideas..."
        - Display all ad ideas from data.ideas in a structured format.
8. **Generating Ads (Images):**
    - **FE Action (on receiving event: images_started from SSE):**
        - **Expected SSE:** id: X, event: images_started, data: {"jobId": "...", "stage": "images_started", "message": "Generating N images...", "pct": Y}
        - Display "Generating ads..." (with animated dots). You could also use the message from the event, e.g., "Generating 4 images..."
    - **FE Action (on receiving event: image_generation_progress from SSE):**
        - **Expected SSE:** id: X, event: image_generation_progress, data: {"jobId": "...", "stage": "image_generation_progress", "message": "Generated image C of T", "data": {"current_image": C, "total_images": T, "image_url": "..."}}}
        - The "Generating ads..." message can be updated, e.g., "Generating ad image {C} of {T}..."
        - Stream/display the generated image from data.image_url as it becomes available.
    - **FE Action (on receiving event: images_done from SSE):**
        - **Expected SSE:** id: X, event: images_done, data: {"jobId": "...", "stage": "images_done", "message": "Images generated", "data": {"generated_image_urls": [...], "failed_image_count": F}}}
        - The "Generating ads..." message can be updated to "✓ Ads generated." or similar.
        - If there were any failed_image_count > 0, this could be indicated.
        - Ensure all successfully generated images (from the image_generation_progress events or the final generated_image_urls list) are displayed.
9. **Completion:**
    - **FE Action (on receiving event: done from SSE):**
        - **Expected SSE:** id: X, event: done, data: {"jobId": "...", "stage": "done", "message": "All tasks completed successfully", "pct": 100, "data": {"imageUrls": [...]}}}
        - Display a final success message, e.g., "All ads generated successfully!" and time take from Step 1 to completiong.
        - Ensure all final imageUrls from data.imageUrls are displayed on the Canvas.
        - The SSE connection will be closed by the server, or the client can close it.

**General SSE Handling:**

- **Heartbeat:** Listen for event: heartbeat. No UI update is needed, but it confirms the connection is alive.
- **Error:** Listen for event: error.
    - **Expected SSE:** id: X, event: error, data: {"jobId": "...", "stage": "error", "message": "Error description", "errorCode": "ERROR_CODE", "pct": Y}
    - On error, display the error message and potentially the errorCode.
    - Halt any loading animations.
    - The SSE connection will likely be closed.