# 4 Elements

A browser turn based battle card game.

Command the four elemental disciplines; **Pyrolurgy**, **Terralurgy**, **Aerolurgy**, and **Hydrolurgy**, and claim your victory with superior strategy!

**Built With:**

-   JavaScript,
-   jQuery\*,
-   FontAwesome

<sub>\* To be replaced with DOM API or other library (dependent on UI library in use, e.g.: React)</sub>

## TODO:

-   [x] Extrapolate CSS and JavaScript into separate external resources
-   [x] Set up local server with Express and Nodemon
-   [ ] Complete phases (battle phase and beyond)
-   [ ] Implement support cards and effects
-   [ ] Deck building and customisation
-   [ ] Set up walkthrough tutorial, guides and informational lookups
-   [ ] AI difficultly tuning
    -   expand scope of awareness and range of actions for smarter strategic decisions
-   [ ] Implement win rewards & bonus points
    -   win rewards: new cards, etc.
    -   bonus points: based on game and deck conditions and/or results (improves rewards)
-   [ ] Implement user login and authentication
-   [ ] Implement multiplayer

## Short Term Roadmap:

-   **Project Conversion:**
    -   convert to React (TBC: DOM manipulation required antithetical to React's philosophies)
    -   convert to TypeScript
    -   convert jQuery to browser DOM API
-   **Build:**
    -   introduce compiler and bundler
-   **Testing:**
    -   introduce testing library and unit tests
-   **Refactoring:**
    -   optimise (animations, actions, event loop, etc.)
    -   replace jQuery with equivalent DOM API methods and syntax
    -   extrapolate into components
    -   introduce state management
    -   extrapolate scripts into utils and helper methods
    -   type interfaces and enums
    -   JavaScript:
        -   convert `var` into `let` and `const`
        -   other ES version updates
    -   CSS:
        -   introduce design tokens and utilize variables
        -   scope css where applicable
-   **Tools:**
    -   write Debug Logging tool
-   **Account Management:**
    -   introduce user login and authentication
    -   implement account management (create, read, update, delete)
-   **Storage:**
    -   introduce persistent storage (e.g.: cloud, local, etc.) to track win records and store saved decks
-   **CI/CD & Hosting:**
    -   introduce CI/CD pipeline, build agents and host to deploy to

## Long Term Roadmap:

-   Set up WebSocket for real-time multiplayer interactions
-   Implement multiplayer chat
-   Implement API
-   Implement agentic AI
    -   LLM interacts with API for smarter CPU opponent
        -   sends actions via requests in JSON to interact with tools and resources,
        -   receives responses and acts upon them,
        -   DOM updates accordingly
