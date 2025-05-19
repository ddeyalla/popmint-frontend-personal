# Popmint

## AI Ad Agent – Create AI-powered ad creatives

Popmint is an AI-powered tool for generating static ad creatives from product inputs. Users can enter a product link or text prompt (for example, “Create an ad for a mango flavored protein powder highlighting its freshness”), and the AI agent produces marketing content and images accordingly. The app features a drop zone where you can “Drop your ideas and the product link you want to create ads for”. Once a request is submitted, the AI agent analyzes the input and generates one or more ad designs, including static images and suggested copy. It even identifies issues (e.g., wrong tone or aspect ratio) and automatically fixes them in new ad variants. For example, after the initial generation, the agent might respond with comments and then provide several image variants for review. This creates a feedback loop: the agent refines ads iteratively based on user comments and suggestions, ultimately producing polished ad creatives.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

- **Interactive Canvas Editor**: A drag-and-drop canvas powered by React Konva where ad elements (images, text, shapes) can be arranged and edited. The canvas store provides methods like `addImage` and `addText` to insert elements, along with tools to move, resize, and style them.

- **AI-Powered Ad Generation**: A built-in AI “ad agent” chat interface generates ad concepts from your prompts. Users input product details or links, and the agent returns text suggestions and images. (In the current code, AI calls are simulated, but real integration would use an OpenAI-based backend.) The example implementation shows a user prompt (“Create an ad for a mango flavored protein powder…”) and the agent outputting feedback and new images.

- **Product Input Support**: Users can enter a product URL or drop images onto the canvas. This helps tailor the ads to real products. The UI even highlights when you can drop images (showing a “Drop images here” overlay) and lets you upload multiple images simultaneously.

- **Ad-Type Suggestions**: Quick suggestion buttons (e.g., “Facebook ad”, “Instagram ad”, “Product ad”, “Discount ad”) are provided to help define the ad style. Clicking one of these tags autofills the prompt area.

- **Iterative Feedback Loop**: After generation, the agent asks for feedback and offers further revisions. For instance, it might say “What do you think about the ads? If you want to try a different concept, edit or want more variants, drop your thoughts in the chat”. This allows you to continue refining the ad creative until you’re satisfied.

- **Multiple Variants & Images**: The AI can output multiple image variants. In the demo code, after fixing issues, the agent “creates 5 more variants” of the ad and returns a list of image URLs. You can then click or drag these images onto the canvas for further editing or selection.

---

## Tech Stack

- **Next.js (App Router)**: The project is built on Next.js 13, enabling server- and client-side components.

- **React & TypeScript**: The frontend uses React (version 19) with TypeScript for type safety.

- **Tailwind CSS v4**: Styling is done with Tailwind CSS (plus the `tailwindcss-animate` plugin), allowing rapid UI development. Dark mode is supported via a CSS class strategy.

- **Zustand**: State management is handled by Zustand stores for chat (`chatStore.ts`), canvas (`canvasStore.ts`), and session (`sessionStore.ts`) data.

- **React Konva**: The interactive canvas editor uses `react-konva` (Konva.js) for HTML5 canvas manipulation (layers, transformers, drag/resize).

- **Radix UI & Lucide**: UI components (dialogs, dropdowns, tooltips) use Radix UI primitives, with icons from Lucide (see `components/ui/`).

- **OpenAI API (Planned)**: While the current agent endpoints are stubbed, the design anticipates calling a Python backend that uses the OpenAI API. API routes under `app/api/agent/` (for starting a session, streaming responses, and sending messages) are placeholders.

- **Other Tools**: The project uses Next.js’ built-in font optimization (`next/font` for Inter and Sora), Stagewise Toolbar for development debugging, and ESLint for linting. Dependencies are managed via npm (see `package.json`).

---

## Local Development

To run Popmint locally:

1. **Clone the repo**:
   ```
   git clone https://github.com/ddeyalla/popmint.git
   cd popmint
   ```

2. **Install dependencies**:
   ```
   npm install    # or `yarn install` / `pnpm install`
   ```

3. **Configure environment (if needed)**: Create a `.env.local` file in the root directory for any required secrets (e.g., `OPENAI_API_KEY`) or custom settings. (Currently, the AI endpoints are mocked, but you can add keys as needed for a real integration.)

4. **Run the development server**:
   ```
   npm run dev    # or `yarn dev` / `pnpm dev`
   ```
   By default, the app will start on `http://localhost:3000`. Open this URL in your browser to use Popmint.

5. **Explore and develop**: You can edit pages under `app/` (e.g., `app/page.tsx` for the homepage). The Next.js dev server will live-reload as you make changes.

No special build step is needed for local development beyond the above. You can build the production version with `npm run build` and then `npm start` once ready for deployment (not covered here).

---

## Directory Structure

A brief overview of the project layout:

```
popmint/
├── app/                        
│   ├── page.tsx                # Landing page (product input & upload UI)
│   ├── api/agent/              # API routes for AI agent (start session, message streaming)
│   └── playground/[sessionId]/
│       ├── page.tsx            # Canvas + Chat view for a session
│       └── client.tsx          # Client-side initialization logic
├── components/                 
│   ├── playground/             # Playground UI (CanvasArea, ChatPanel, toolbars, etc.)
│   └── ui/                     # Reusable UI components (Button, Dialog, Dropdown, Tooltip, etc.)
├── store/                      # Zustand state stores (chatStore, canvasStore, sessionStore)
├── public/                     # Static assets (images, icons, logos)
├── tailwind.config.ts          # Tailwind CSS configuration
├── next.config.js              # Next.js custom webpack config (e.g., Konva fix)
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts (Next.js, React, Tailwind, etc.)
└── README.md                   # (this file)
```

---

## Contributing

Contributions to Popmint are welcome! If you find a bug or have a feature request, please open an issue or discussion. To contribute code:

1. Fork the repository and create a new branch for your feature or bugfix.

2. **Coding style**: Follow the existing TypeScript/React conventions (e.g., use of functional components, Tailwind classes, Zustand for state). Ensure linting passes (the project includes an ESLint config).

3. **PR & Review**: Submit a pull request describing your changes. Make sure to include documentation or comments for new functionality.

4. **Collaborate**: We welcome feedback and review on design ideas. For substantial changes (like adding a real AI backend), please discuss in an issue first.

Please adhere to the Contributor Covenant Code of Conduct in all interactions.

---

## License

Popmint is released under the MIT License. (See the `LICENSE` file for details.)
