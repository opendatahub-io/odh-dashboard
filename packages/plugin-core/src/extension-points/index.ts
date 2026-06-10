// Common — consumed by both RHOAI dashboard and RHAII distributions
export * from './areas';
export * from './navigation';
export * from './routes';
export * from './status-provider';
export * from './project-details';
export * from './overview-card';
export * from './tab-route';
export * from './tasks';

// RHAII app-shell — consumed by distributions/base only (convergence with RHOAI is a future goal)
export * from './masthead';

// Shared base property types — reusable building blocks for package-level extension points
export * from './detail-tabs';
export * from './actions';
export * from './detail-cards';
export * from './table-columns';

// Utilities
export * from './utils';

/**
 * ## Extension Point Definitions
 *
 * Each extension point should reside in its own dedicated file.
 * Within each file, ensure you export:
 * 1. One or more extension point type definitions (utilizing the `Extension` type).
 * 2. A corresponding type guard function (e.g., `isMyExtension`) to validate if an extension instance conforms to the defined type.
 *
 * ### Naming Convention
 *
 * Adhere to the following format for naming extension point types:
 * `namespace.section[/sub-section]`
 *
 * Components:
 * - `namespace`: Identifies the application or plugin context (e.g., `app`, `plugin-a`).
 * - `section`: Describes the main functional area of the extension (e.g., `nav`, `table`).
 * - `sub-section`: (Optional) Provides further classification for related extension points (e.g., `item`, `column`).
 *
 * **Example:**
 * `app.table/column` - Represents an extension point for adding columns to tables within the 'app' namespace.
 */

// eg. Extension point:
// export type TabExtension = Extension<
//   'app.tab',
//   {
//     title: string;
//     content: ComponentCodeRef<TabProps}>;
//   }
// >;
//
// export const isTabExtension = (extension: Extension): extension is TabExtension =>
//   extension.type === 'app.tab';
