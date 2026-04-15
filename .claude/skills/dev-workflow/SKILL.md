---
name: dev-workflow
description: Orchestrates the full development workflow for ODH Dashboard tasks. After implementing a user's requested change, runs linting, type-checking, and tests to verify correctness. For UI changes, uses an available browser MCP to visually verify the result against the live dev server. Use when the user asks to implement a feature, fix a bug, refactor code, or make any code change in the dashboard.
---

# Dev Workflow — ODH Dashboard

Follow this workflow whenever implementing a task for the user.

## Phase 1: Implement the task

1. Understand the user's request — read relevant files, explore the codebase as needed.
2. Implement the change using the project's conventions and patterns.
3. Fix any linter errors introduced by the change.

## Phase 2: Validate the implementation

After the code change is complete, run the appropriate validation steps. See [reference.md](reference.md) for full command details.

### Always run

```bash
npm run type-check
npm run lint
```

Fix any errors before proceeding.

### If the change touches testable logic

```bash
npm run test-unit
```

If tests fail, fix them. If existing tests need updating due to the change, update them.

### If the change touches a Go BFF

```bash
npm run test:contract
```

## Phase 3: Visual verification (UI changes only)

If the task involves a UI change (component, page, layout, styling, etc.), perform visual verification using a browser automation MCP.

### Step 1: Detect an available browser MCP

Look through the available MCP servers for one that provides browser automation capabilities (navigating to URLs, taking screenshots, inspecting page content). Common examples include `cursor-ide-browser`, `playwright-mcp`, `puppeteer-mcp`, `browser-use`, or similar.

**If no browser MCP is available:**
Tell the user:
> No browser automation MCP is connected. Connecting one (e.g. Playwright MCP, Puppeteer MCP, or a built-in browser MCP) would allow me to visually verify UI changes against the live dev server, catching layout and rendering issues that linting and type-checking cannot.

Then skip the rest of Phase 3.

### Step 2: Ensure the dev server is running

Check the terminals for a running `npm run dev` process. If it is not running, start it:

```bash
npm run dev
```

Wait for both the backend (port `4000`) and the frontend dev server (port `4010`) to be ready.

### Step 3: Navigate to the affected page

Use the browser MCP's navigation tool to open:

```text
http://localhost:4010/<path>
```

Determine the correct `<path>` based on the component or page that was changed.

### Step 4: Capture the page state

Use the browser MCP to capture the current state of the page. Depending on the MCP, this may involve:
- Taking a screenshot
- Getting a DOM snapshot or accessibility tree
- Extracting the page's visible text and structure

Capture as much visual context as the MCP supports.

### Step 5: Verify the change

Inspect the captured state to confirm:
- The change renders as expected.
- No visual regressions (broken layout, missing elements, wrong spacing).
- Interactive elements are present and appear correctly wired.

If something looks wrong, report it to the user with any captured screenshots and suggest fixes.

### Step 6: Clean up

If the browser MCP requires explicit cleanup (unlocking, closing tabs, etc.), do so now.

## Phase 4: Report

Summarize what was done:
1. What was implemented and which files were changed.
2. Validation results (type-check, lint, tests).
3. Visual verification results (if applicable), including any screenshots taken.

If any step surfaced issues that could not be auto-fixed, clearly list them for the user.
