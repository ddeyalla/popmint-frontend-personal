# Agentic Chat UX – Ultra‑Detailed Build Sheet (v5)

> **Mission** — Take Popmint’s current chat/agent stream UI and enhance it to match the fluidity and structure of ChatGPT 4o, Claude 3, Cursor, and Replit Ghostwriter. This document is your one-shot **Cursor prompt**.
>
> No backend work required. 100% frontend polish in **Next.js + TailwindCSS + Framer Motion**.

---

## 🧠 Full Frontend Interaction Script (Claude UX Edition)

Each message appears as a chat bubble with a Lucide icon. Implement these verbatim as the conversation unfolds.

#### SCENE 1: Greeting & Input
- **AI:** [Sparkles]  
  "Drop the product link you’d like ads for. I’ll take it from there."  
- **TEMPORARY STATUS BUBBLE:** [Loader2 spinning]  
  "Got it—just scanning the page…"  
  *Auto-dismiss when page analysis agent bubble appears.*

#### SCENE 2: Task Plan
- **AGENT BUBBLE:** [ClipboardList]  
  🧠 **Ad Creation Plan**  
  "Here’s the flow I’ll follow:"  
  1. [ScanSearch] **Read the page** – Scanning content & visuals  
  2. [Brain] **Research signals** – Understanding audience, brand, competitors  
  3. [Lightbulb] **Shape concepts** – Outlining creative directions  
  4. [ImagePlay] **Generate visuals** – Creating final images  
  *Timer starts immediately in top-right.*

#### CONTEXTUAL TEMPORARY BUBBLES
Between major steps or tool calls, show a context-specific temporary bubble until that subtask completes and remove when subtask is completed
- "Scanning product details…"
- "Researching market insights…"
- "Brainstorming creative angles…"
- "Rendering visuals…"

#### SCENE 3: Product Page Analysis
- **TRANSITION BUBBLE:** [Bot]  
  "Scanning the product page…"  
- **AGENT BUBBLE:** [FileSearch]  
  📄 **Analyzing Product Page**  
  - [FileText] **Page Content Scan** – "Reading structure & product info…"  
  - [ImageIcon] **Visual Asset Check** – "Identifying relevant imagery…"  
- Upon completion of both:
  - "Details captured." ✅  
  - "Images secured." ✅  
  - *Timer stops (e.g., "Completed in 15s").*  
- **AI OUTPUT:**  
  "Here’s a quick summary of the page details and images I found."

#### SCENE 4: Market & Competitor Research
- **TRANSITION BUBBLE:**  
  "Now looking outward—brand, audience, and competitors."  
- **AGENT BUBBLE:** [Library]  
  📊 **Market & Competitor Research**  
  - [Atom] **Brand context** – "Synthesizing tone, reviews, features…"  
  - [Users] **Audience language** – "Capturing themes, concerns, sentiment…"  
  - [Target] **Competitor Ads** – "Scanning top ads & hooks…"  
- Upon completion:
  - "Brand cues synthesized." ✅  
  - "Audience insights captured." ✅  
  - "Top ad strategies noted." ✅  
- **AI OUTPUT:**  
  "Research complete. Here’s what stood out and why it matters."

#### SCENE 5: Creative Strategy
- **TRANSITION BUBBLE:**  
  "Distilling the research into 3 campaign directions."  
- **AGENT BUBBLE:** [Palette]  
  🎨 **Creative Strategy Agent**  
  - [Lightbulb] **Idea Generation** – "Forming initial campaign concepts…"  
  - [FileEdit] **Copywriting** – "Writing messaging around each idea…"  
- Upon completion:
  - "Concepts outlined." ✅  
  - "Ad copy ready." ✅  
- **AI OUTPUT:**  
  "Here are the 3 directions I recommend. Tap to expand and explore."  
  *Each concept card includes title, hook, bullets, CTA, and a "Copy" button.*

#### SCENE 6: Visuals Generation
- **TRANSITION BUBBLE:**  
  "Translating the best concept into visuals…"  
- **AGENT BUBBLE:** [ImagePlay]  
  📷 **Generating Ad Visuals**  
  - Placeholder grid of N slots, showing [Loader2] until each image loads  
  - On each load: thumbnail fades in  
- Upon completion:
  - "Visuals generated." ✅  
  - *Timer stops (e.g., "Task Completed in 35s").*  
- **AI OUTPUT:**  
  "Finished rendering all images. Ready for review."  
  *Grid items support hover for zoom/download.*

#### SCENE 7: Final Wrap
- **SSE `done` event**  
- **FINAL BUBBLE:** [Award]  
  "All done. You’ve got page insights, concepts, copy, and visuals."
  "Total time: 2m 38s."

#### SCENE 8: Error Handling
- On SSE `error`:
  - **AGENT BUBBLE** inner status: ⚠️  
  - **TEMP ERROR BUBBLE:**  
    "Something didn’t work during the '{stage}' step. Want to retry?"

---

## ✨ Primary Files To Modify
- `message-bubble.tsx`  
- `AgentBubble.tsx`  
- `TemporaryStatusBubble.tsx`  
- `MessageRenderer.tsx`  
- `ChatPanel.tsx`  
- `tailwind.config.js`  
- `hooks/useLiveTimer.ts`, `lib/playSFX.ts`  
- `components/ScrollToBottom.tsx`

---

## 🌈 Design Tokens
Add to `tailwind.config.js > theme.extend.colors`:
```js
pm: {
  indigo: '#6366F1',
  emerald: '#10B981',
  surface: '#F8FAFC',
  'bubble-user': '#EEF2FF',
  'bubble-ai': '#FFFFFF',
  'bubble-agent': '#F5F8FF'
},
```

---

## 🧱 Component Spec Matrix
| Component | Background                         | Width           | Padding    | Icon Size | Motion        |
|-----------|------------------------------------|-----------------|------------|-----------|---------------|
| UserBubble       | `pm-bubble-user` (indigo-50)  | `max-w-lg`      | `px-4 py-3` | 16px      | `fadeSlide`    |
| AIBubble         | `pm-bubble-ai` (white)         | `max-w-lg`      | `px-4 py-3` | 16px      | `fadeSlide`    |
| AgentBubble      | `pm-bubble-agent` + `border-l-4 border-pm-indigo` | `max-w-3xl`    | `px-5 py-4` | 20px (title) | `scaleFade`    |
| AgentSectionCard | `bg-white` + `shadow-xs`       | full width      | `px-3 py-2` | 16px      | `staggerChildren` |
| AgentOutputBubble| `bg-emerald-50`                | `max-w-lg`      | `p-4`       | 16px      | `fadeSlide`    |
| TempStatusBubble | `bg-white/90 backdrop-blur`     | auto            | `p-3`       | 14px      | `fadeIn/autoExit` |

---

## 🌀 Global Bubble Transitions
### fadeSlide
```ts
const fadeSlide = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.4,0,0.2,1] } }
};
```
### scaleFade
```ts
const scaleFade = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.33,1,0.68,1] } }
};
```
### Section Stagger
```tsx
<motion.div variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}>
  {sections.map(s => <motion.div variants={fadeSlide} />)}
</motion.div>
```
### TemporaryExit
```tsx
exit={{ opacity:0, scale:0.95, filter:'blur(4px)' }} transition={{ duration:0.25 }}
```

---

## ⏱ useLiveTimer Hook
```ts
export function useLiveTimer(start: Date | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => setElapsed(Date.now() - start.getTime()), 1000);
    return () => clearInterval(id);
  }, [start]);
  return start ? new Date(elapsed).toISOString().slice(14,19) : null;
}
```
Render only when timer exists; on completion display `✅ 14s`.

---

## 🏷️ StatusPill Component
```tsx
const statusMap = {
  pending: { icon: Clock, class: 'text-zinc-400', label: 'Pending' },
  active: { icon: Loader2, class: 'text-pm-indigo animate-spin', label: 'In progress' },
  completed: { icon: CheckCircle2, class: 'text-pm-emerald', label: 'Done' },
  error: { icon: AlertTriangle, class: 'text-red-500', label: 'Error' }
};
```
Use inside each agent section row.

---

## 📜 Scroll Behavior (ChatPanel.tsx)
1. Track scroll position via `onScroll` handler on `ScrollArea` viewportRef.
2. Compute `isNearBottom = scrollHeight - scrollTop - clientHeight < 150`.
3. On new message, if `isNearBottom`, auto-scroll with `behavior:'smooth'`.
4. If not near bottom, show `<ScrollToBottom />` at `fixed bottom-20 right-6` with `fadeSlide`.

---

## 🖼 Agent Output Bubble
- Prepend text: `💡 Generated Copy` or `🧠 Ad Concept` in `MessageRenderer`.
- Style with alternating `bg-white` / `bg-zinc-50` and `divide-y divide-zinc-100`.
- Add a `Copy` button next to each CTA/hook that uses `navigator.clipboard.writeText()`.
- Use `list-disc list-inside` for bullet lists.

---

## 🖼 Image Output Bubble
- Wrap thumbnails with:
  ```css
  .thumbnail { @apply rounded-md border border-zinc-100 shadow-sm; }
  .thumbnail:hover { @apply scale-105 shadow-lg; }
  ```
- Label above grid: `🖼 Final Visuals`.
- After grid: optional `<Button>Regenerate images</Button>`.

---

## 🧠 Master Timeline Banner
- Component `<ActiveTaskBanner />`: fixed at top center, use `scaleFade`.
- Shows current stage label, live timer from `useLiveTimer`, and step count (e.g. `3/5`).
- Auto-hide on SSE `done`.

---

## 🏃 Flow Pacing & Rhythm
- After each major SSE event, pause ~300–500ms before next bubble.
- Use `<TemporaryStatusBubble>` for micro-steps.
- Ensure no two bubbles appear < 250ms apart.

---

---

## ✅ Acceptance Test
| Test                | Criteria                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Bubble Visual       | Radius 10px, 24px vertical gap, max-width enforced                       |
| Timers              | Real-time tick, no 00:00, shows ✅ on complete                           |
| Motion              | Entry/exit/stagger animations ≥55 FPS                                     |
| Scroll              | Smart scroll triggers only near bottom, `ScrollToBottom` appears as needed|

---

## ✅ Final Deliverable
Submit a PR titled:
```
feat(ui): complete agent UX overhaul – motion, pacing, structure
```
Includes:
- Updated components
- Tailwind theme tokens
- Storybook stories for `AgentBubble`, `TempStatusBubble`, and `MessageRenderer`

---

💥 **Strict**: Follow this spec. Tweak the current UI styling, components, do not touch any other working functionality at all. If anything is unclear, ask. No guessing.
