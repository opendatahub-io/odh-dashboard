import type { AnyObject, CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';
import { DeterminePlatformFromProject, ModelServingExtension } from '~/packages/modelServing/types';

export type ComponentCodeRef<Props = AnyObject> = CodeRef<{ default: React.ComponentType<Props> }>;
export type UtilityCodeRef<FuncType> = CodeRef<FuncType>;

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

export type ServingID = ModelServingExtension<'id'>;
export const isServingID = (extension: Extension): extension is ServingID =>
  extension.type === 'model-serving.id';

export type ServingLabel = ModelServingExtension<
  'label',
  {
    text: string;
  }
>;
export const isServingLabel = (extension: Extension): extension is ServingLabel =>
  extension.type === 'model-serving.label';

export type ServingPlatformSelectionCard = ModelServingExtension<
  'selection-card',
  {
    title: string;
    description: string;
    promotionKey: number;
  }
>;
export const isServingPlatformSelectionCard = (
  extension: Extension,
): extension is ServingPlatformSelectionCard => extension.type === 'model-serving.selection-card';

export type ParseProjectForPlatform = ModelServingExtension<
  'project/parse-for-id',
  {
    content: UtilityCodeRef<DeterminePlatformFromProject>;
  }
>;
export const isParseProjectForPlatform = (
  extension: Extension,
): extension is ParseProjectForPlatform => extension.type === 'model-serving.project/parse-for-id';
