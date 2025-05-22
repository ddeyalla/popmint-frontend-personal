Overall Strategy:

Embrace Event-Driven UI: The core idea is that each specific SSE event (e.g., page_scrape_started, page_scrape_done) will trigger a distinct UI update.
State Management is Key: chatStore.ts will need to be enhanced to hold more granular state for each ad generation job, including the data for each stage and timing information.
Modular Message Components: We'll likely need different React components to render the various types of information (smart plan, scraped summary, research results, ad ideas, images).
Iterative Implementation: We'll tackle one stage of the flow at a time.
Phase 1: Enhancing State Management (chatStore.ts)

The PopmintChatMessage and the store's state need to accommodate the new requirements.

Refine PopmintChatMessage Interface:
Add optional fields to the data property (or create a more specific adGenerationData object within PopmintChatMessage if a message is of type assistant and related to an ad job).
Fields needed:
jobId?: string (already somewhat handled, but good to be explicit on the message representing the job)
currentUiStage?: string (e.g., 'smartPlanning', 'pageScraping', 'researching', 'concepting', 'ideating', 'imaging', 'completed', 'error') - This will help determine which loading message or data to show.
smartPlan?: { title: string, steps: Array<{ icon: string, title: string, description: string }> } (To store the static smart plan structure)
scrapedContentSummary?: object (Structure TBD based on actual backend data)
researchSummary?: string
adConcepts?: Array<any> (Structure TBD, though Frontend-flow.md says not to render)
adIdeas?: Array<{ title: string, copy: string, cta: string }> (Example structure)
generatedImages?: Array<{ url: string, progressMessage?: string }>
stageTimers?: Record<string, { startTime?: number, endTime?: number, durationText?: string }>
errorDetails?: { message: string, errorCode?: string }
pct?: number (Percentage completion for the current stage)
New Actions in useChatStore:
initializeAdJobMessage(jobId: string, thinkingMessageId: string): Updates the initial "Thinking..." message to a "smartPlanning" state, associating it with the jobId.
updateAdJobStage(jobId: string, stage: string, data?: any, pct?: number, messageText?: string): A versatile action to update the message associated with jobId based on the current SSE event. This would set currentUiStage, update pct, store stage-specific data, and potentially update the main content of the message.
startStageTimer(jobId: string, stageKey: string): Records startTime.
endStageTimer(jobId: string, stageKey: string): Records endTime and calculates durationText.
addGeneratedImage(jobId: string, imageUrl: string, progressMessage?: string): Adds an image to generatedImages.
setAdJobError(jobId: string, errorMessage: string, errorCode?: string): Sets error state.
Phase 2: Overhauling SSE Event Handling in chat-input.tsx

The handleAdGenerationEventCallback function will be the heart of this refactor. It needs to become a more sophisticated dispatcher based on event.type (which corresponds to event in Frontend-flow.md, e.g., plan, page_scrape_started).

Initial Setup (handleSubmitInternal):
The existing logic to call handleUserAdRequest (which adds 'user' and 'thinking' messages) is good.
The thinkingMessageId returned by handleUserAdRequest is crucial.
After generateAdsFromProductUrl returns the jobId, call initializeAdJobMessage(jobId, thinkingMessageId) from the store. This message will now be the primary message that evolves throughout the job.
Refactor handleAdGenerationEventCallback:
Use a switch statement on parsedData.stage (or event.type if that's what the backend sends as the event name in the SSE event: line).
Case plan (or initial event):
Call updateAdJobStage to set currentUiStage: 'smartPlanning', store the plan structure (from Frontend-flow.md Section 3, this seems static for now but could come from backend).
Case page_scrape_started:
Call updateAdJobStage to set currentUiStage: 'pageScraping', messageText: "Checking product details...", pct.
Call startStageTimer(jobId, 'pageScrape').
Case page_scrape_done:
Call updateAdJobStage to set currentUiStage: 'pageScrapeDone', store parsedData.data.scraped_content_summary, pct.
Call endStageTimer(jobId, 'pageScrape').
Case research_started:
Call updateAdJobStage to set currentUiStage: 'researching', messageText: "Researching...", pct.
Call startStageTimer(jobId, 'research').
Case research_done:
Call updateAdJobStage to set currentUiStage: 'researchDone', store parsedData.data.summary, pct.
Call endStageTimer(jobId, 'research').
And so on for:
concepts_started, concepts_done
ideas_started, ideas_done
images_started
image_generation_progress (call addGeneratedImage and update pct/message)
images_done
done (final completion)
error (call setAdJobError)
heartbeat (ignore for UI, but good for console log/debugging)
Phase 3: Rendering Enhanced Chat Messages

You'll need to update your chat message rendering logic (wherever you map through messages from useChatStore) to display these new states and data types.

Create New Message Components (or enhance existing):
SmartPlanMessage: Renders the structured smart plan.
ScrapedDataMessage: Renders the scraped content summary.
ResearchSummaryMessage: Renders the research summary with an expander.
AdIdeasListMessage: Renders the list of ad ideas.
ImageGalleryMessage: Renders the generated images.
StageTimerDisplay: A small component to show stage duration.
Loading indicators within messages for active stages.
Conditional Rendering in Chat Bubble:
Based on message.data.currentUiStage or the presence of specific data fields (e.g., message.data.researchSummary), render the appropriate component or information.
Display loading messages ("Checking product details...", "Researching...") based on currentUiStage.
Display stage timers.
Step-by-Step Prompts for Execution:

Let's break this down into manageable steps. I'll provide a prompt, you can work on it, and then we'll move to the next.

Prompt 1: Enhance PopmintChatMessage in chatStore.ts

"Based on the Frontend-flow.md and our plan, let's update the PopmintChatMessage interface (or its data field) in store/chatStore.ts. Define the necessary optional fields to hold:

jobId?: string
currentUiStage?: string (e.g., 'smartPlanning', 'pageScraping')
smartPlanContent?: { title: string, steps: Array<{ iconType: string, stepTitle: string, description: string }> } (use iconType as a string for now, e.g., 'DeepResearchIcon', 'SparkleIcon')
scrapedContentSummary?: any (use any for now, we can refine later)
researchSummaryText?: string
adIdeasList?: Array<any> (use any for now)
generatedImagesList?: Array<{ url: string, progressText?: string }>
stageTimers?: Record<string, { startTime?: number, endTime?: number, durationText?: string }>
errorDetails?: { message: string, errorCode?: string }
progressPercent?: number
Show me the proposed changes to the PopmintChatMessage interface."