[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Extensibility]: ../../docs/extensibility.md
[Admin Settings]: admin-settings.md
[Projects]: projects.md

# Home / Applications

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Home / Applications area is the entry point to the ODH Dashboard. It comprises three
distinct pages: the **Home** landing page (quick-access project cards, learning resources,
and admin shortcuts), the **Enabled Applications** gallery (tiles for every ODH component
the cluster operator has enabled), and the **Learning Center** (searchable documentation,
tutorials, and quick starts derived from `OdhDocument` and `OdhQuickStart` CRs). Data
scientists use Home and Enabled Applications to reach their tools; administrators use the
"Enable your team" section on Home to jump to key settings.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Home | `/` | `disableHome: false` (enabled by default) |
| Applications > Enabled | `/applications/enabled` | None |
| Applications > Explore | `/applications/explore` | None |
| Resources > Learning resources | `/learning-resources` | None |

The left navigation exposes "Home" as the root item. When `disableHome` is `true` in
`OdhDashboardConfig`, visiting `/` redirects directly to `/applications/enabled`. The
legacy route `/enabled` (v2) performs a client-side redirect to `/applications/enabled`.

## Architecture

```text
frontend/src/pages/
├── home/
│   ├── Home.tsx                          # Root page component; composes sections
│   ├── HomeHint.tsx                      # Contextual hint banner
│   ├── useEnableTeamSection.tsx          # Admin-only "Enable your team" section hook
│   ├── projects/
│   │   ├── ProjectsSection.tsx           # Responsive gallery of AI project cards
│   │   ├── ProjectCard.tsx               # Individual project summary card
│   │   ├── CreateProjectCard.tsx         # Inline "create project" prompt card
│   │   ├── EmptyProjectsCard.tsx         # Empty state when no projects exist
│   │   ├── ProjectsLoading.tsx           # Skeleton loader for project cards
│   │   └── ProjectsSectionHeader.tsx     # Section title + overflow create button
│   ├── modelCatalog/                     # Temporarily disabled (RHOAIENG-34405)
│   └── resources/
│       ├── useResourcesSection.tsx       # Hook returning the learning resources node
│       └── useSpecifiedResources.tsx     # Fetches a named subset of OdhDocuments
├── enabledApplications/
│   └── EnabledApplications.tsx           # Enabled apps gallery page
└── learningCenter/
    ├── LearningCenter.tsx                # Full learning resources page
    ├── LearningCenterToolbar.tsx         # Sort controls, view toggle, filter toggle
    ├── LearningCenterFilters.tsx         # Collapsible left-panel filter set
    ├── LearningCenterDataView.tsx        # Card / list view renderer
    ├── useDocFilterer.ts                 # Pure filter function built from active filters
    ├── useQueryFilters.ts                # Syncs filter state to URL search params
    └── const.ts                          # Sort keys, view type keys, storage keys

frontend/src/concepts/docResources/
├── useDocResources.tsx                   # Merges OdhDocs + component docsLinks + QuickStarts
└── docUtils.ts                           # Helpers: getQuickStartDocs, updateDocToComponent

frontend/src/utilities/
├── useWatchComponents.tsx                # Polls GET /api/components on POLL_INTERVAL
├── useWatchDocs.tsx                      # Polls GET /api/docs on POLL_INTERVAL
└── useWatchIntegrationComponents.tsx     # Checks integration status per component
```

`Home.tsx` is a thin orchestrator: it calls `useIsAreaAvailable` for each supported area,
delegates data fetching to purpose-built hooks (`useResourcesSection`,
`useEnableTeamSection`), and renders the resulting React nodes. This avoids prop-drilling
and keeps each home section independently tree-shakeable.

`EnabledApplications.tsx` splits into an outer component that owns data fetching
(`useWatchComponents(true)`) and a memoized inner component (`EnabledApplicationsInner`)
that owns rendering. This lets Cypress tests mount the inner component in isolation with
mock data.

The Learning Center uses URL search params (via `useQueryFilters`) to store the active
sort and filter state, making filtered views shareable by URL.

## State Management

**Contexts used**:
- [`ProjectsContext`](../src/concepts/projects/ProjectsContext.tsx) — holds the full list
  of OpenShift projects; `ProjectsSection` reads from it via `React.useContext`

**Key hooks**:
- `useWatchComponents(installed: boolean)` in `frontend/src/utilities/useWatchComponents.tsx`
  — polls `GET /api/components?installed=<bool>` on `POLL_INTERVAL`; returns
  `{ components, loaded, loadError }`. Pass `true` for the Enabled page, `false` for
  Learning Center (needs all components for doc enrichment).
- `useWatchDocs()` in `frontend/src/utilities/useWatchDocs.tsx` — polls
  `GET /api/docs`; returns raw `OdhDocument[]`.
- `useDocResources()` in `frontend/src/concepts/docResources/useDocResources.tsx` —
  combines `useWatchDocs` + `useWatchComponents(false)` + PatternFly QuickStart context
  to produce the full enriched document list used by the Learning Center.
- `useSpecifiedResources(cards)` in `frontend/src/pages/home/resources/useSpecifiedResources.tsx`
  — filters the full doc list to a named allowlist; used by the Home page resources section.
- `useWatchIntegrationComponents(components)` in `frontend/src/utilities/useWatchIntegrationComponents.tsx`
  — fires integration-check requests for each component before the Enabled gallery renders.
- `useDocFilterer(favorites)` in `frontend/src/pages/learningCenter/useDocFilterer.ts`
  — builds a pure filter function from active sidebar filters; consumed in
  `LearningCenter.tsx` via `useEffect` on `[docs, docFilterer, sortOrder, sortType]`.
- `useEnableTeamSection()` in `frontend/src/pages/home/useEnableTeamSection.tsx` — returns
  `null` for non-admins; otherwise returns the "Enable your team" `PageSection` node.

**Data flow**: `useWatchComponents` / `useWatchDocs` → raw CR arrays → enrichment hooks
(`useDocResources`, `useSpecifiedResources`) → component state → rendered gallery or card
list. Favorites are persisted to `localStorage` via `useBrowserStorage`; section
collapse/expand state is similarly persisted under namespaced keys
(`odh.home.learning-resources.open`, `odh.home.admin.open`).

The Redux store holds a `forceComponentsUpdate` counter; incrementing it (e.g., after an
admin enables an application) triggers an immediate out-of-band `fetchComponents` call
inside `useWatchComponents` without waiting for the next poll cycle.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Gallery` / `GalleryItem` | Enabled Applications grid; max card width 330 px |
| `EvenlySpacedGallery` | Home page projects section; width calculated with `react-cool-dimensions` |
| `ScrolledGallery` | Home page learning resources strip; horizontally scrollable |
| `DividedGallery` | "Enable your team" admin section; bordered, rounded container |
| `Card` / `CardTitle` / `CardBody` | `OdhAppCard` (enabled apps), `OdhDocCard` (doc resources), `ProjectCard` |
| `PageSection` | Wraps each Home section; uses `variant="secondary"` for visual separation |
| `SearchInput` | Learning Center toolbar search field |
| `EmptyState` | Zero-project state, load-error state, zero-enabled-apps state |
| `CollapsibleSection` | Wraps learning resources and admin sections on Home; state in `localStorage` |

`OdhAppCard` and `OdhDocCard` are shared components under `frontend/src/components/`
rather than PatternFly primitives. They compose PF `Card` with ODH-specific badge,
provider label, and icon rendering.

## Key Concepts

| Term | Definition |
|------|-----------|
| **OdhApplication** | A Kubernetes CR (`kind: OdhApplication`) describing an ODH component. `spec.isEnabled` indicates the operator has enabled it; `spec.hidden` hides it from the gallery even when enabled. |
| **OdhDocument** | A Kubernetes CR (`kind: OdhDocument`) or derived virtual record representing a tutorial, how-to guide, or documentation link. Type is one of `documentation`, `how-to`, `tutorial`, `quickstart`. |
| **OdhQuickStart** | A PatternFly QuickStart CR loaded via the QuickStart context. `useDocResources` converts these into `OdhDocument`-shaped objects for uniform rendering in the Learning Center. |
| **ApplicationTile** | The rendered `OdhAppCard` card in the Enabled Applications gallery. Each tile links to the app's external URL or an internal route (e.g., notebook spawner). |
| **Integration check** | `useWatchIntegrationComponents` fires a per-component status request before the gallery renders, ensuring `spec.isEnabled` reflects live state rather than only the cached CR value. |
| **docLink enrichment** | `useDocResources` synthesizes an `OdhDocLink` virtual record for every component that has `spec.docsLink` set, giving every app automatic documentation coverage in the Learning Center. |
| **`disableHome` flag** | A field on `OdhDashboardConfig` that hides the Home landing page and redirects `/` to `/applications/enabled`. |
| **POLL_INTERVAL** | Constant defined in `frontend/src/utilities/const.ts`; governs how frequently `useWatchComponents` and `useWatchDocs` re-fetch from the backend. |

## Quick Start

```bash
# Log in and start the frontend dev server
cd frontend
oc login <cluster-url>
npm run start:dev:ext
# Open http://localhost:4010/ for Home
# Open http://localhost:4010/applications/enabled for the Enabled gallery
# Open http://localhost:4010/learning-resources for the Learning Center
```

To exercise the `disableHome` flag locally, patch the `OdhDashboardConfig` CR on your
cluster:

```bash
oc patch odhdashboardconfig odh-dashboard-config -n redhat-ods-applications \
  --type=merge -p '{"spec":{"dashboardConfig":{"disableHome":true}}}'
```

To see the admin "Enable your team" section, ensure your user has cluster-admin or
`odh-dashboard-config` edit rights and reload the Home page.

## Testing

### Unit Tests

No dedicated unit test directory exists under `frontend/src/pages/home/` or
`frontend/src/pages/enabledApplications/` at this time. Filter logic in
`useDocFilterer.ts` is exercised through the Cypress mock suite rather than
isolated unit tests.

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/home/` and
`packages/cypress/cypress/tests/mocked/applications/`

```bash
# Run all Home and Applications mock tests
npm run test:cypress-ci -- --spec "**/mocked/home/**" --spec "**/mocked/applications/**"
```

### Cypress E2E Tests

No dedicated E2E tests target the Home or Applications area at this time. E2E coverage
for project creation flows (triggered from the Home page) lives in the Projects E2E suite.

## Cypress Test Coverage

**`mocked/home/home.cy.ts`** — verifies the page renders by default and that setting
`disableHome: true` suppresses it, falling back to the Enabled page.

**`mocked/home/homeProjects.cy.ts`** — covers the projects section: hidden when
`disableProjects` is set; empty-state card when no projects exist; create-project modal
opens and cancels correctly; project cards link to the right routes.

**`mocked/home/homeResources.cy.ts`** — covers the learning resources strip: renders
named resource cards; section collapses and expands; "Go to Learning resources" link
navigates correctly.

**`mocked/home/homeAdmin.cy.ts`** — covers the "Enable your team" section: hidden for
non-admin users; shows correct shortcut tiles for available areas (BYON, serving runtimes,
cluster settings, user management).

**`mocked/home/homeModelCatalog.cy.ts`** — tests for the Model Catalog section that is
currently commented out in `Home.tsx`; tests are retained for when the section is
re-enabled (tracked in RHOAIENG-34405).

**`mocked/applications/enabled.cy.ts`** — verifies card details (brand image, title,
badge, tooltip); Jupyter card navigates to the notebook spawner; MLflow card visibility
controlled by the `mlflow` feature flag; legacy `/enabled` route redirects to
`/applications/enabled`.

**`mocked/applications/explore.cy.ts`**, **`administration.cy.ts`**,
**`application.cy.ts`**, **`externalRedirects.cy.ts`**, **`notebookServer.cy.ts`** —
cover the Explore page, admin application management, individual app detail pages,
external link handling, and notebook server launch respectively.

Gaps: the Learning Center filter and sort interactions, favorites persistence, and
view-type toggle (card vs list) are not covered by automated tests.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `GET /api/components?installed=true` | Backend Route | Returns enabled `OdhApplication` CRs; called by `useWatchComponents(true)` |
| `GET /api/components?installed=false` | Backend Route | Returns all `OdhApplication` CRs; called by `useWatchComponents(false)` for doc enrichment |
| `GET /api/docs` | Backend Route | Returns `OdhDocument` CRs; called by `useWatchDocs` |
| `GET /api/config` | Backend Route | Returns `OdhDashboardConfig`; `disableHome` flag read here |
| `ProjectsContext` | Frontend Area | Provided by the Projects area (`concepts/projects/`); consumed by `ProjectsSection` |
| `useIsAreaAvailable` | Frontend Concept | Reads `OdhDashboardConfig` feature flags to conditionally render each Home section |
| PatternFly QuickStarts | External Package | `@patternfly/quickstarts` provides `QuickStartContext`; `useDocResources` reads `allQuickStarts` from it |
| Segment.io / analytics | Internal Concept | `fireMiscTrackingEvent('Application Enabled', ...)` fired in `EnabledApplications` when the enabled app set changes; `fireLinkTrackingEvent('HomeCardClicked', ...)` fired from the admin section |
| [Admin Settings] | Frontend Area | "Enable your team" cards navigate to routes within the Admin Settings area |
| [Projects] | Frontend Area | "Go to Projects" link and project-card clicks navigate into the Projects area |

## Known Issues / Gotchas

- The Model Catalog section (`home/modelCatalog/`) is implemented but commented out in
  `Home.tsx` pending RHOAIENG-34405. Do not remove the files; the Cypress tests for this
  section are also retained. Re-enable by uncommenting the import and JSX block.
- `enabledComponents` in `EnabledApplications.tsx` is a module-level variable (not React
  state) used to diff the previous vs current enabled set for Segment tracking. This
  means the diff comparison does not survive hot-module replacement during development.
- `useWatchComponents` and `useWatchDocs` use `setTimeout`-based polling rather than a
  Kubernetes watch/WebSocket. Stale data can persist until the next poll cycle unless
  `forceComponentsUpdate` is incremented in Redux.
- The `installed` parameter to `useWatchComponents` is a boolean that controls the
  `?installed=` query param. Passing `false` returns all components (enabled and
  disabled), which is what the Learning Center needs for doc-link enrichment. Passing
  `true` returns only enabled components. Mixing up the boolean produces subtle gaps
  where doc cards appear for disabled apps or vice versa.
- Favorites in the Learning Center are stored in `localStorage` under the key defined by
  `FAVORITE_RESOURCES` in `learningCenter/const.ts`. Clearing site data removes them
  with no recovery path.
- The legacy `/enabled` route redirect is implemented at the router level, not in
  `EnabledApplications.tsx`. If you add route-level guards, verify that the redirect
  still fires for users with bookmarked old URLs.

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
- [Extensibility] — how nav items and routes are registered via the extension system
- [Admin Settings] — destination for "Enable your team" admin shortcut links
- [Projects] — data source for the Home page projects section
