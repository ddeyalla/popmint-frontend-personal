```mermaid
graph TD
    A[User: Enters '/ad' command in ChatInput] --> B{ChatInput: Parse Command};
    B --> C[Frontend Service: Call POST /api/proxy/generate];
    C --> D[Backend: POST /generate (product_url, n_images)];
    D --> E[Backend: Initiates Ad Generation Job];
    E --> F[Backend: Returns job_id];
    F --> G[Frontend Service: Receives job_id];
    G --> H{Frontend: Connect to SSE /api/proxy/generate/stream?job_id};
    H --> I[Backend: GET /generate/stream (SSE)];
    I -- SSE Events (stage, pct, data) --> J{chatStore: Update AdGenerationTask Message};
    J -- Update currentUiStage & data fields --> J;

    K[ChatPanel: Renders Messages] --> L{MessageRenderer};
    J -- adGenerationTask message --> L;

    L -- type 'adGenerationTask' --> M{Render Ad Generation Blocks};
    M --> M1[Debug Info: JobID, Stage, Progress];
    M --> N[AdGenerationPlanBlock (Always shows, updates with smartPlanContent)];
    
    M -- currentUiStage 'pageScraping' OR scrapedPageContent available --> O[ScrapedDataBlock];
    N --> O;

    M -- currentUiStage 'researching' OR researchSummaryText available --> P[ResearchSummaryBlock];
    O --> P;

    M -- currentUiStage 'ideating' OR adIdeasList available --> Q[AdIdeasListDisplayBlock];
    P --> Q;

    M -- currentUiStage 'imaging'/'imagesDone' OR generatedImagesList available --> R[CreatingAdsBlock];
    Q --> R;

    M -- currentUiStage 'completed' --> S[All Blocks Reflect Completion];
    R --> S;
    
    M -- currentUiStage 'error' --> T[Error Handling in relevant Blocks / ErrorBlock];
    N ----> T;
    O ----> T;
    P ----> T;
    Q ----> T;
    R ----> T;

    subgraph Message Rendering Logic
        direction LR
        L
        M
        M1
        N
        O
        P
        Q
        R
        S
        T
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#ccf,stroke:#333,stroke-width:2px
    style I fill:#ccf,stroke:#333,stroke-width:2px
    style J fill:#lightgrey,stroke:#333,stroke-width:2px
    style L fill:#lightgrey,stroke:#333,stroke-width:2px
```
