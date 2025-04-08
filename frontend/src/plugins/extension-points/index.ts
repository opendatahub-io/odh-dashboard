import type { AnyObject, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type ComponentCodeRef<Props = AnyObject> = CodeRef<{ default: React.ComponentType<Props> }>;

/**
 * Create individual files in this directory to declare extension points.
 *
 * Each file should export one or more extension point types and a boolean function
 * that checks if an extension is of a given type.
 *
 * Re-export all extension point types and functions in this file.
/**
 * Extension Point Naming Convention
 * 
 * When creating a new extension point, follow this format:
 * `namespace.section/sub-section`
 * 
 * Where:
 * - namespace: The application or plugin context identifier
 * - section: Describes the primary purpose of the extension point
 * - sub-section: Optional additional categorization for like extension points
 * 
 * Example:
 * `app.table/column` - Add a table column
 */

// eg. Extension point:
// export type TabExtension = Extension<
//   'app.tab',
//   {
//     label: string;
//     content: ComponentCodeRef;
//   }
// >;
// export const isTabExtension = (extension: Extension): extension is TabExtension =>
//   extension.type === 'app.tab';
