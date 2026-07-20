# Step 5: Split into ticket proposals

## Splitting heuristic

**Layer 1 — Feature area:** Each URL route or top-level page with independent functionality → one or more tickets.

**Layer 2 — Interactive flow:** Within each area, identify distinct interactive units:

| Unit type | Ticket pattern |
|---|---|
| CRUD form (create/edit) | One Story — include validation + success/error states |
| Table or list with actions | One Story — row actions, sorting, filtering |
| Modal or drawer | Include with the flow that opens it, unless shared across flows |
| Wizard (multi-step) | One Story if ≤5 steps; split by step group if larger |
| Detail/view page | One Story per detail page |
| Dashboard / overview section | One Story per distinct card group or KPI section |
| Chart or data visualization | One Story — include data fetching + empty/error states |
| Read-only detail or summary view | One Story per distinct view |
| Shared types + hooks + API layer | One Task for infrastructure that ≥2 stories depend on |
| New navigation or routing setup | Include with first story, or Task if complex |

**Layer 3 — Size calibration:**
- **Too small** (1-2 scenarios, <3 components) → merge with related flow
- **Right size** (3-8 scenarios, testable ACs) → one ticket
- **Too large** (9+ scenarios, >15 components) → split by sub-flow

## Generating acceptance criteria

**From scenarios** — each scenario label → one AC:
- `"Default state"` → "Display [resource] list/page with [key elements]"
- `"Empty state"` → "Show empty state with [message] when no [resources] exist"
- `"Error state"` → "Display error alert when [API call] fails"
- `"Loading"` → "Show loading skeleton while [data] loads"
- `"Validation error"` → "[Field] shows validation error when [condition]"

**From form validation** — each rule → one AC:
- `isRequired` → "[Field] is required and shows error when empty"
- Pattern validation → "[Field] validates against [pattern/format]"
- Character limits → "[Field] enforces max length of [N] characters"

**From interactive behavior:**
- "Clicking [button] opens [modal/drawer] with [content]"
- "Selecting [option] filters [table/list]"
- "Submitting [form] creates [resource] and navigates to [page]"
- "Deleting [resource] shows confirmation modal"

**Standard ACs** — always append to Stories:
- "Add/Update Cypress mocked tests."
- "Add/Update unit tests for hooks/functions."

## Ticket format

**Stories:**

```markdown
## Description of the enhancement
[2-3 sentences. Reference the prototype page.]

## Acceptance Criteria
- [AC 1 — testable, specific]
...
- Add/Update Cypress mocked tests.
- Add/Update unit tests for hooks/functions.

## Additional info
- Prototype files: [TSX files]
- Prototype scenarios: [scenario labels]
- odh-dashboard target area: [path]
- Dependencies: [ticket numbers]
- Prototype URL: [url]
- Fork: [ssh-url] (branch: [branch], commit: [SHA])
```

**Tasks:**

```markdown
## Description of the task
[2-3 sentences.]

## Acceptance Criteria
- [AC 1]
...
- Add/Update unit tests for logic/functions.

## Additional info
- Prototype files: [files]
- odh-dashboard target area: [path]
- Dependencies: [none or tickets]
- Fork: [ssh-url] (branch: [branch], commit: [SHA])
```

## Ordering and dependencies

1. **Infrastructure tasks** first — types, API layer, shared hooks
2. **Core stories** — primary UI flows
3. **Secondary stories** — supporting flows, edge cases
4. **Polish stories** — empty states, error handling, accessibility

Note explicit dependencies: "Story 3 depends on Task 1."
