import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

/**
 * Spec deviations (approved by PM during implementation):
 *
 * - `Workflow Selected` and `Search Used` were consolidated into
 *   `Shortcut Clicked` with a `viewContext` discriminator (`search` /
 *   `search-filtered`). Navigation context is captured via page visits.
 * - `workflow` / `previousWorkflow` properties were dropped; `taskName`
 *   identifies the selected item and `viewContext` captures the surface.
 * - `Search Aborted` was added to track dropdown abandonment (not in
 *   original spec).
 */
export const TASK_SHORTCUTS_EVENTS = {
  SHORTCUT_CLICKED: 'Home Task Shortcut Clicked',
  SEARCH_ABORTED: 'Home Task Shortcuts Search Aborted',
  SECTION_TOGGLED: 'Home Task Shortcuts Section Toggled',
  // P2 deferred -- UI not yet built:
  // VIEW_ALL_SELECTED: 'Home Task Shortcuts View All Selected',
  // OVERFLOW_MENU_OPENED: 'Home Task Shortcuts Overflow Menu Opened',
} as const;

/**
 * Category values use the extension-point group `id` (e.g. 'ai-hub',
 * 'gen-ai-studio', 'develop-and-train'). The approved tracking spec uses
 * slightly different names ('develop-train', 'observe-monitor'); PM will
 * align the spec with the canonical code values.
 *
 * viewContext values:
 *   'default-row'        -- clicked from a category card in the expanded section
 *   'search'             -- selected from the "Looking for another task?" dropdown
 *   'search-filtered'    -- selected from the dropdown after typing a filter query
 *   P2 deferred:
 *   'collapsed-label'    -- clicked from a pill in collapsed state (UI not built)
 *   'all-cards'          -- clicked from the "View All" cards view (UI not built)
 *   'overflow-menu'      -- clicked from the overflow "X more" menu (UI not built)
 */
export type ShortcutClickedProperties = {
  taskName: string;
  category: string;
  destination: string;
  viewContext: 'default-row' | 'search' | 'search-filtered';
};

export type SectionToggledProperties = {
  isExpanded: boolean;
  category?: string;
};

export type SearchAbortedProperties = {
  filtered: boolean;
};

// P2 deferred types -- uncomment when UI ships:
// export type ViewAllSelectedProperties = { sourceView: 'default-row' };
// export type OverflowMenuOpenedProperties = { hiddenTaskCount: number };

export const fireShortcutClicked = (properties: ShortcutClickedProperties): void => {
  fireMiscTrackingEvent(TASK_SHORTCUTS_EVENTS.SHORTCUT_CLICKED, properties);
};

export const fireSearchAborted = (properties: SearchAbortedProperties): void => {
  fireMiscTrackingEvent(TASK_SHORTCUTS_EVENTS.SEARCH_ABORTED, properties);
};

export const fireSectionToggled = (properties: SectionToggledProperties): void => {
  fireMiscTrackingEvent(TASK_SHORTCUTS_EVENTS.SECTION_TOGGLED, properties);
};
