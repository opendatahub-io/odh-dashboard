[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Extensibility]: ../../docs/extensibility.md
[Admin Settings]: admin-settings.md
[Projects]: projects.md

# Home / Applications

**Last Updated**: 2026-04-10 | **Template**: frontend-template v2

## Overview

Home / Applications is the dashboard entry surface: **Home** (projects, learning strip, admin
shortcuts), **Enabled Applications** (gallery of operator-enabled components), and **Learning
Center** (searchable docs and quick starts from `OdhDocument` / `OdhQuickStart` CRs). Scientists
land here; admins use “Enable your team” shortcuts into settings.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Home | `/` | `disableHome: false` (default) |
| Applications > Enabled | `/applications/enabled` | None |
| Applications > Explore | `/applications/explore` | None |
| Resources > Learning resources | `/learning-resources` | None |

When `disableHome` is true, `/` redirects to `/applications/enabled`. Legacy `/enabled` redirects
to `/applications/enabled` at the router.

## Design Intent

Home is a thin orchestrator: `useIsAreaAvailable` gates sections; section-specific hooks
(`useResourcesSection`, `useEnableTeamSection`, etc.) return ready-made nodes so the page stays
composable and tree-shakeable without deep prop drilling.

Enabled Applications splits an outer shell that polls `useWatchComponents(true)` from a memoized
inner renderer so Cypress can mount the inner piece with fixtures. Before paint, integration checks
confirm enabled state is live, not only what the last CR poll showed.

Learning Center builds a unified document model in `useDocResources` (backend docs + all components
for `docsLink` synthesis + PatternFly QuickStart context). Filters and sort sync to URL search
params (`useQueryFilters`) for shareable views. Polling (`useWatchComponents`, `useWatchDocs` on
`POLL_INTERVAL`) is timer-based, not watches; Redux `forceComponentsUpdate` forces an immediate
refetch after admin actions (e.g. enabling an app). Favorites and collapsible section state use
`localStorage` under namespaced keys.

`OdhAppCard` and `OdhDocCard` wrap PatternFly `Card` with ODH-specific badges and icons—they are
not PF primitives. Home sections use custom gallery helpers for layout.

## Key Concepts

| Term | Definition |
|------|-----------|
| **OdhApplication** | CR for an ODH component; `spec.isEnabled` / `spec.hidden` control gallery visibility. |
| **OdhDocument** | CR or virtual doc record: documentation, how-to, tutorial, quickstart. |
| **OdhQuickStart** | PF QuickStart CR; merged into the doc list shape via `useDocResources`. |
| **ApplicationTile** | Rendered enabled-app card (`OdhAppCard`); links internal or external. |
| **Integration check** | Per-component status request before the enabled gallery renders. |
| **docLink enrichment** | Virtual `OdhDocLink` per component `spec.docsLink` for Learning Center coverage. |
| **`disableHome`** | `OdhDashboardConfig` flag; skips Home and sends `/` to Enabled. |
| **POLL_INTERVAL** | `frontend/src/utilities/const.ts` — polling cadence for components and docs. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `GET /api/components?installed=true|false` | Backend Route | Enabled-only vs full list for gallery vs doc enrichment. |
| `GET /api/docs` | Backend Route | `OdhDocument` list. |
| `GET /api/config` | Backend Route | `disableHome` and area flags. |
| `ProjectsContext` | Frontend Area | Project list for Home project cards. |
| `useIsAreaAvailable` | Frontend Concept | Section visibility from dashboard config. |
| PatternFly QuickStarts | External | `QuickStartContext` input to `useDocResources`. |
| [Admin Settings] | Frontend Area | “Enable your team” destinations. |
| [Projects] | Frontend Area | Project creation and project routes from Home. |

Primary flow: poll components/docs → enrich into doc model → render galleries or filtered Learning
Center views; Redux nudge refreshes components when operators change enablement.

## Known Issues / Gotchas

- **Model Catalog**: `home/modelCatalog/` exists but is commented out in `Home.tsx` (RHOAIENG-34405);
  keep files and related mock tests until re-enabled.
- **Segment diff state**: `enabledComponents` in `EnabledApplications.tsx` is module-level for
  before/after diffs—does not survive HMR cleanly.
- **Polling vs watches**: Stale UI until next poll unless `forceComponentsUpdate` fires.
- **`useWatchComponents` boolean**: `true` = enabled apps only; `false` = all apps for doc linking.
  Swapping breaks which apps get doc cards.
- **Learning Center favorites**: Stored in `localStorage` (`FAVORITE_RESOURCES` in
  `learningCenter/const.ts`); clearing site data loses them.
- **Legacy `/enabled`**: Redirect is router-level—verify guards do not block bookmarked URLs.

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
- [Extensibility] — nav and routes via extensions
- [Admin Settings] — admin shortcut targets
- [Projects] — projects data for Home
