Product Requirements Document: Project Section for Homepage
Feature Overview:
Create a project section component that displays user projects in a card-based grid layout, positioned directly below the main header and prompt input box on the homepage.
Functional Requirements:

Section Layout:

Add a dedicated project section below the homepage header/prompt area
Use the existing card design pattern visible in the screenshot
Display projects in a responsive grid layout (3 columns on desktop)
Include section title "Your Projects" or similar


Project Cards:

Reuse the existing card styling shown in the community section
Each card should display:

Project thumbnail/preview image
Project name
Brief description or last modified date
Quick access button/link


Cards should be clickable to open the project


Data Persistence:

Store project data using Supabase (as mentioned in requirements)
Ensure projects persist across browser sessions
Load user's projects on page refresh/reload


User Experience:

Show "Create New Project" card/button as first item
Display message "No projects yet" if user has no projects
Smooth hover effects on cards (reuse existing interaction patterns)


Integration:

New projects created elsewhere should automatically appear in this section
Maintain existing homepage functionality and styling
Use existing color scheme and typography



Technical Constraints:

Focus ONLY on this project section feature
Reuse existing CSS classes and design patterns from the current interface
Do not modify any other homepage components
Use the same card component structure visible in the "From the Community" section

Design Requirements:

Match the visual hierarchy and spacing of existing sections
Use consistent card shadows, borders, and hover states
Maintain responsive behavior across screen sizes
Follow the existing pink/coral accent color scheme for interactive elements

Build this as a self-contained component that integrates seamlessly with the existing homepage layout.