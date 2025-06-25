.
├── .cursor/                     # Cursor IDE specific files
├── .git/                        # Git repository data
├── .next/                       # Next.js build output (Gitignored)
├── __tests__/                   # All test files
│   ├── fixtures/                # Test data, mock HTML files
│   ├── app/                     # Tests for app routes/pages
│   │   └── page.test.tsx        # Example test for home page
│   ├── components/              # Tests for components
│   │   ├── ad-generator/
│   │   │   └── AdForm.test.tsx
│   │   └── playground/
│   │       └── chat/
│   │           └── MessageBubble.test.tsx
│   ├── hooks/                   # Tests for custom hooks
│   │   └── useEventSource.test.ts
│   ├── lib/                     # Tests for library functions
│   │   ├── services/
│   │   │   └── ad-generation-service.test.ts
│   │   └── utils/
│   │       └── persistence-utils.test.ts
│   └── setupTests.ts            # Test setup file (if needed)
├── app/                         # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── auth/                # Example: Authentication routes
│   │   │   └── [...nextauth]/route.ts
│   │   ├── proxy/               # Proxy routes (as existing)
│   │   │   └── generate/route.ts
│   │   └── webhooks/            # Example: Webhook handlers
│   │       └── stripe/route.ts
│   ├── (main)/                  # Main application routes (optional route group)
│   │   ├── layout.tsx           # Layout for main app section
│   │   ├── page.tsx             # Home page (significantly refactored, imports components)
│   │   └── playground/          # Playground feature route
│   │       ├── layout.tsx
│   │       └── page.tsx         # Entry for /playground
│   ├── _dev/                    # Optional: For development/debug specific routes (underscored)
│   │   ├── component-showcase/
│   │   │   └── page.tsx
│   │   └── test-feature-x/
│   │       └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx               # Root layout
│   └── loading.tsx              # Root loading UI
├── components/                  # React components
│   ├── ad-generator/            # Components specific to Ad Generator feature
│   │   ├── AdForm.tsx
│   │   ├── AdPreview.tsx
│   │   └── index.ts             # Optional: Barrel file for easy imports
│   ├── home/                    # Components specific to the Home page
│   │   ├── HeroSection.tsx
│   │   └── FeatureList.tsx
│   ├── playground/              # Components specific to the Playground feature
│   │   ├── canvas/              # Canvas related components
│   │   │   ├── CanvasToolbar.tsx
│   │   │   └── ImageLayer.tsx
│   │   ├── chat-panel/          # Chat panel components (as existing)
│   │   │   ├── blocks/          # Ad generation step blocks (as existing)
│   │   │   │   ├── AdGenerationPlanBlock.tsx
│   │   │   │   ├── AdIdeasListDisplayBlock.tsx
│   │   │   │   ├── CreatingAdsBlock.tsx
│   │   │   │   ├── ResearchSummaryBlock.tsx
│   │   │   │   └── ScrapedDataBlock.tsx
│   │   │   ├── agent-bubbles/   # Agent bubble components (as per memory)
│   │   │   ├── chat-input/      # Chat input related components
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── message-types/   # Specific message type renderers
│   │   │   └── MessageRenderer.tsx
│   │   ├── settings/            # Settings components for playground
│   │   │   └── ExportOptions.tsx
│   │   └── PlaygroundLayout.tsx # Overall layout for the playground
│   ├── shared/                  # Components shared across multiple features but not generic enough for ui/
│   │   └── PageTitle.tsx
│   └── ui/                      # Generic, reusable UI primitives (e.g., from shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── input.tsx
├── docs/                        # Project documentation
│   ├── ADR/                     # Architecture Decision Records
│   │   └── 001-chosen-state-manager.md
│   ├── API.md                   # API documentation
│   ├── CANVAS_THUMBNAIL_README.md
│   ├── PERSISTENCE_IMPLEMENTATION.md
│   ├── PHASE_3_COMPLETE.md
│   └── chat-implementation.md
├── hooks/                       # Custom React hooks (globally reusable)
│   ├── useEventSource.ts
│   ├── useFormValidation.ts
│   └── useLocalStorage.ts
├── lib/                         # Core logic, services, and larger utilities
│   ├── services/                # External service interactions
│   │   ├── ad-generation-service.ts
│   │   ├── supabase-service.ts  # Wraps supabase client interactions
│   │   └── image-service.ts
│   ├── utils/                   # Utility functions (can be sub-grouped)
│   │   ├── agent-state-mapper.ts
│   │   ├── canvas-persistence.ts
│   │   ├── chat-persistence.ts
│   │   ├── chat-swr.ts
│   │   ├── format-utils.ts
│   │   ├── icon-utils.ts      # (if not a component, or helper for icons)
│   │   ├── persistence-manager.ts
│   │   ├── persistence-utils.ts
│   │   └── thumbnail-utils.ts   # Formerly utils/thumbnail.ts
│   ├── config.ts                # Application-wide configurations
│   ├── constants.ts             # Application-wide constants
│   ├── generate-ad.ts           # (Could be part of ad-generation-service.ts or a specific module)
│   └── supabase.ts              # Supabase client initialization
├── node_modules/                # Project dependencies (Gitignored)
├── public/                      # Static assets (images, fonts, etc.)
│   ├── images/
│   └── fonts/
├── scripts/                     # Utility scripts (build, deploy, testing scripts not part of jest/vitest)
│   ├── seed-database.ts
│   ├── deploy.sh
│   └── verify-persistence.sh    # (Moved from root)
├── store/                       # State management (Zustand)
│   ├── canvasStore.ts
│   ├── chatStore.ts
│   ├── projectStore.ts
│   └── sessionStore.ts
├── styles/                      # Global styles (if not solely in app/globals.css)
│   └── themes.css
├── supabase/                    # Supabase specific files (migrations, functions)
│   └── migrations/
├── types/                       # Global TypeScript type definitions
│   ├── api.ts                   # Types for API request/responses
│   ├── ad-generation.ts
│   ├── canvas.ts
│   ├── chat.ts
│   ├── index.ts                 # Barrel file for common types or global augmentations
│   └── supabase.ts              # Auto-generated Supabase types
├── .env.local                   # Local environment variables (Gitignored)
├── .eslint.config.mjs
├── .gitignore
├── .prettierrc.json             # Optional: Prettier config
├── components.json              # shadcn/ui configuration
├── next-env.d.ts
├── next.config.mjs              # Consolidated Next.js configuration
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json