---

**Full Frontend UI Interaction Script (All as Chat Bubbles with Lucide Icons)**

**Core UI Principles:**

- **Unified Chat Flow:** All interactions appear as sequential chat bubbles.
- **Specialized "Agent" Chat Bubbles:** These bubbles are styled distinctly (e.g., specific background, prominent title icon) to represent an AI agent performing a task. They contain:
    - A main title with an icon for the agent's role.
    - A top-right timer ("00:00" -> "Completed in X seconds").
    - Internal sections with their own icons, descriptions, and dynamic status text/icons.
- **Standard AI Chat Bubbles:** Used for conversational transitions, output summaries, and final messages, often with a simple [lucide:MessageCircle] or [lucide:Bot] icon.
- **Temporary Action Indicators:** Short-lived text *within* the agent bubbles' dynamic status fields, or very brief standalone AI chat bubbles for quick status updates that then disappear.

---

**SCENE 1: The Greeting & URL Submission**

- **AI (Standard Chat Bubble):** [lucide:Sparkles] "Hi there! Give me a product URL, and I'll whip up some ad creatives for you."
- **UI:** Input field for "Product URL" is active.
- **USER ACTION:** Types https://example.com/product-page and submits.
- **AI (Temporary Standard Chat Bubble):** *Smoothly appears.*
    - Content: [lucide:Loader2 class:animate-spin] "Got it! Let me take a look at that for you..."
    - *(This bubble will smoothly disappear once the first "agent" bubble appears).*
- **FRONTEND LOGIC:**
    - POST /generate sent.
    - On job_id received, connect to /generate/stream?job_id={job_id}.
    - Start master "Total time" timer.

---

**SCENE 2: The Plan**

- **SSE Event Received:** event: plan, data: {"stage": "plan", "message": "Connected..."}
- **UI UPDATE:**
    - The "Got it! Let me take a look..." temporary bubble *smoothly disappears (blur-out effect)*.
    - **AI (Specialized Chat Bubble - Plan):** *Smoothly appears.*
        - **Bubble Style:** Distinct "Plan" styling.
        - **Top-Right Info:** (Not a timer, or "Plan Ready")
        - **Content:**
            - [lucide:ClipboardList] **Our Ad Creation Plan**
            - "Okay, here’s the game plan I've put together for us:"
            - "1️⃣ [lucide:ScanSearch] **Product Deets:** First, I'll get familiar with your product page."
            - "2️⃣ [lucide:Brain] **Deep Dive Research:** Then, I'll explore the market and see what competitors are up to."
            - "3️⃣ [lucide:Lightbulb] **Creative Angles:** Next, I'll brainstorm some catchy ad concepts and copy."
            - "4️⃣ [lucide:ImagePlay] **Visual Magic:** Finally, I'll generate the actual ad images!"
    - This "Plan" bubble remains persistent.
- **FRONTEND LOGIC:** Store jobId.

---

**SCENE 3: Product Analysis - Understanding the Product Page**

- **AI (Standard Chat Bubble - Transition):** [lucide:Bot] "First up, let's analyze that product page thoroughly."
- **SSE Event Received:** event: page_scrape_started
- **UI UPDATE:**
    - **AI (Specialized Chat Bubble - Product Analysis):** *Smoothly appears.*
        - **Bubble Style:** Distinct "Product Analysis" styling.
        - **Top-Right Timer:** "00:00" (starts counting up).
        - **Main Title:** [lucide:FileSearch] **Analyzing Product Page**
        - **Section 1: Page Content Scan**
            - Icon: [lucide:FileText]
            - Text: "Reading page details, text, and structure."
            - **Dynamic Status:** [lucide:Loader2 class:animate-spin] "Scanning content..."
        - **Section 2: Visual Asset Check** (Initially less emphasized)
            - Icon: [lucide:ImageIcon]
            - Text: "Looking for primary product images."
            - **Dynamic Status:** [lucide:Hourglass] "Pending..."
- **FRONTEND LOGIC:** Start timer for this agent bubble.
- **SSE Event Received:** page_scrape_done
- **UI UPDATE (within "Analyzing Product Page" bubble):**
    - **Section 1: Page Content Scan**
        - **Dynamic Status:** [lucide:CheckCircle2] "Page details captured!"
    - **Section 2: Visual Asset Check** (Becomes active)
        - **Dynamic Status:** [lucide:Loader2 class:animate-spin] "Extracting images..."
- **FRONTEND LOGIC:** Store scraped_content_summary.
- **SSE Event Received:** image_extraction_started (Confirms image extraction is active)
- **SSE Event Received:** image_extraction_done
- **UI UPDATE:**
    - **Within "Analyzing Product Page" bubble:**
        - **Section 2: Visual Asset Check**
            - **Dynamic Status:** [lucide:CheckCircle2] "Images secured!"
        - **Top-Right Timer:** Stops (e.g., "Completed in 15 seconds").
    - **AI (Standard Chat Bubble - Output):** *Smoothly appears below the "Analyzing Product Page" bubble.*
        - [lucide:Bot] "Product page analysis complete! Here’s a quick look:"
        - Displays:
            - Brief summary from scraped_content_summary (e.g., "Product: [Title], Price: [Price]").
            - First 4 extracted_image_urls as small thumbnails, each potentially with a [lucide:Image] icon.
- **FRONTEND LOGIC:** Stop timer. Render output.

---

**SCENE 4: Research - Deeper Market & Competitor Insights**

- **AI (Standard Chat Bubble - Transition):** [lucide:Bot] "Alright, got the product essentials. Now, let's zoom out and research the bigger picture – market trends and competitor moves!"
- **SSE Event Received:** event: research_started
- **UI UPDATE:**
    - **AI (Specialized Chat Bubble - Research):** *Smoothly appears.*
        - **Bubble Style:** Distinct "Research" styling.
        - **Top-Right Timer:** "00:00" (starts).
        - **Main Title:** [lucide:Library] **Conducting Deep Research** (using Library instead of Sparkles to avoid confusion with greeting)
        - **Section 1: Product & Brand Synthesis**
            - Icon: [lucide:Atom]
            - Text: "Reviewing product info, reviews, brand voice..."
            - **Dynamic Status:** [lucide:Loader2 class:animate-spin] "Consolidating details..."
        - **Section 2: Market Analysis** (Initially less emphasized)
            - Icon: [lucide:Users]
            - Text: "Listening to customer chatter, pain points, desires..."
            - **Dynamic Status:** [lucide:Hourglass] "Pending..."
        - **Section 3: Competitor Teardown** (Initially less emphasized)
            - Icon: [lucide:Target]
            - Text: "Analyzing top-performing competitor ads, hooks, angles..."
            - **Dynamic Status:** [lucide:Hourglass] "Pending..."
- **FRONTEND LOGIC:** Start timer.
- **(ASSUMPTION: Backend sends distinct events or updates message field for sub-stages of research. UI updates Dynamic Status for each section sequentially upon internal backend completion.)**
    - *Example: "Product & Brand Synthesis" Dynamic Status becomes [lucide:CheckCircle2] "Info synthesized!". Then "Market Analysis" Dynamic Status becomes [lucide:Loader2 class:animate-spin] "Gauging market sentiment...", etc.*
- **SSE Event Received:** event: research_done
- **UI UPDATE:**
    - **Within "Conducting Deep Research" bubble:**
        - **Section 1:** Dynamic Status: [lucide:CheckCircle2] "Info synthesized!"
        - **Section 2:** Dynamic Status: [lucide:CheckCircle2] "Market insights gathered!"
        - **Section 3:** Dynamic Status: [lucide:CheckCircle2] "Competitor strategies analyzed!"
        - **Top-Right Timer:** Stops (e.g., "Completed in 40 seconds").
    - **AI (Standard Chat Bubble - Output):** *Smoothly appears below "Conducting Deep Research" bubble.*
        - [lucide:Bot] "Research phase wrapped up! [lucide:SearchCheck] This should give us a solid strategic base. Here’s the full report (expandable):"
        - Displays first ~300 chars of data.summary, with an "Expand" button ([lucide:ChevronDown]).
- **FRONTEND LOGIC:** Stop timer. Render output.

---

**SCENE 5: Creative Strategy - Concepts & Ideas**

- **AI (Standard Chat Bubble - Transition):** [lucide:Bot] "Fantastic research! Now, let's get those creative juices flowing [lucide:Wand2] and brainstorm some ad concepts and compelling copy."
- **SSE Event Received:** event: concepts_started
- **UI UPDATE:**
    - **AI (Specialized Chat Bubble - Creative Strategy):** *Smoothly appears.*
        - **Bubble Style:** Distinct "Creative" styling.
        - **Top-Right Timer:** "00:00" (starts).
        - **Main Title:** [lucide:Palette] **Crafting Ad Concepts & Copy**
        - **Section 1: Concept Generation**
            - Icon: [lucide:Lightbulb]
            - Text: "Developing unique campaign angles based on research."
            - **Dynamic Status:** [lucide:Loader2 class:animate-spin] "Brainstorming concepts..."
        - **Section 2: Copywriting** (Initially less emphasized)
            - Icon: [lucide:FileEdit]
            - Text: "Writing engaging headlines, body text, and calls to action."
            - **Dynamic Status:** [lucide:Hourglass] "Pending..."
- **FRONTEND LOGIC:** Start timer.
- **SSE Event Received:** event: concepts_done
- **UI UPDATE (within "Crafting Ad Concepts & Copy" bubble):**
    - **Section 1: Concept Generation**
        - **Dynamic Status:** [lucide:CheckCircle2] "Concepts outlined!"
    - **Section 2: Copywriting** (Becomes active)
        - **Dynamic Status:** [lucide:Loader2 class:animate-spin] "Writing ad copy..."
- **FRONTEND LOGIC:** (No direct output bubble for concepts alone).
- **SSE Event Received:** event: ideas_started (Confirms copywriting is active).
- **SSE Event Received:** event: ideas_done
- **UI UPDATE:**
    - **Within "Crafting Ad Concepts & Copy" bubble:**
        - **Section 2: Copywriting**
            - **Dynamic Status:** [lucide:CheckCircle2] "Ad copy ready!"
        - **Top-Right Timer:** Stops (e.g., "Completed in 30 seconds").
    - **AI (Standard Chat Bubble - Output):** *Smoothly appears.*
        - [lucide:Bot] "Ad copy is hot off the press! [lucide:PenTool] Here are a few different ideas we can work with (expand to see all [lucide:ChevronDown]):"
        - Displays data.ideas in a structured, expandable list.
- **FRONTEND LOGIC:** Stop timer. Render output.

---

**SCENE 6: Ad Creation - Image Generation**

- **AI (Standard Chat Bubble - Transition):** [lucide:Bot] "Love those ideas! Now for the visual magic – let's generate some eye-catching ad images [lucide:Camera]."
- **SSE Event Received:** event: images_started
- **UI UPDATE:**
    - **AI (Specialized Chat Bubble - Ad Creation):** *Smoothly appears.*
        - **Bubble Style:** Distinct "Image Gen" styling.
        - **Top-Right Timer:** "00:00" (starts).
        - **Main Title:** [lucide:ImagePlay] **Generating Ad Visuals**
        - **Progress Indicator:** [lucide:Loader2 class:animate-spin] "Preparing to generate {N} images..."
        - **(Image Canvas Area/Panel becomes active here, showing N placeholders, each could have [lucide:ImageDown] icon initially).**
- **FRONTEND LOGIC:** Start timer. Prepare image canvas.
- **SSE Event Received (Repeatedly):** event: image_generation_progress
- **UI UPDATE:**
    - **Within "Generating Ad Visuals" bubble:**
        - **Progress Indicator:** [lucide:Loader2 class:animate-spin] "Image {C} of {T} generated..." (Image {C} appears in the canvas).
    - **Image Canvas:** C-th image placeholder is filled ([lucide:Image] now visible).
- **SSE Event Received:** event: images_done
- **UI UPDATE:**
    - **Within "Generating Ad Visuals" bubble:**
        - **Progress Indicator:** [lucide:PartyPopper] "All {N} images generated!"
        - **Top-Right Timer:** Stops (e.g., "Completed in 50 seconds").
    - **AI (Standard Chat Bubble - Output, optional):**
        - [lucide:Bot] "Visuals are complete! Take a look at the generated ads." (Points to canvas)
- **FRONTEND LOGIC:** Stop timer. Ensure canvas is up-to-date.

---

**SCENE 7: The Grand Finale!**

- **SSE Event Received:** event: done
- **UI UPDATE:**
    - **AI (Standard Chat Bubble - Final):** *Smoothly appears.*
        - [lucide:Bot] "[lucide:Award] And we're all done! From product page to finished ad creatives. I hope these hit the mark for you!"
        - Sub-Content: "Total time taken: MM:SS" (from master timer).
- **FRONTEND LOGIC:** Stop master timer. Display final message. Close EventSource.

---

**SCENE 8: Graceful Handling (Heartbeats & Errors)**

- **SSE Event: heartbeat**: No UI change.
- **SSE Event: error**:
    - **The currently active "Specialized Agent Chat Bubble":**
        - Its internal dynamic statuses freeze or show an error icon like [lucide:AlertTriangle].
        - **Top-Right Timer:** Shows time elapsed, then [lucide:XCircle] "Error".
    - **AI (Standard Chat Bubble - Error styled):** *Smoothly appears.*
        - [lucide:Bot] "[lucide:Frown] Oh dear, looks like we hit a small bump in the road during the '{stage_where_error_occurred}' step. Specifically: {error_message}. So sorry about that! Perhaps we can try that bit again?"
- **FRONTEND LOGIC:** Stop timers. Display error clearly.

---