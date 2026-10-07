import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getModelTypesFromTemplate,
  getServingRuntimeNameFromTemplate,
  type ServingRuntimeModelType,
} from '../../shared';
import { isUnsupportedUnaccepted } from '../versions';

/**
 * Merge global and project-scoped serving runtime templates.
 * When namespaces differ, project-scoped templates win on ServingRuntime name collisions.
 */
export const mergeProjectAndGlobalTemplates = (
  globalTemplates: TemplateKind[],
  projectTemplates: TemplateKind[],
  hasDistinctProjectNamespace: boolean,
): TemplateKind[] => {
  if (!hasDistinctProjectNamespace) {
    return globalTemplates;
  }

  const seen = new Set<string>();
  const merged: TemplateKind[] = [];
  for (const t of projectTemplates) {
    const name = getServingRuntimeNameFromTemplate(t);
    seen.add(name);
    merged.push(t);
  }
  for (const t of globalTemplates) {
    const name = getServingRuntimeNameFromTemplate(t);
    if (!seen.has(name)) {
      seen.add(name);
      merged.push(t);
    }
  }
  return merged;
};

/**
 * Filter templates by model type annotation, dropping unsupported-unaccepted templates.
 * Templates with no model-type annotation remain visible for compatibility.
 */
export const filterTemplatesByModelType = (
  templates: TemplateKind[],
  modelType?: ServingRuntimeModelType | string,
): TemplateKind[] =>
  templates.filter((template) => {
    if (isUnsupportedUnaccepted(template)) {
      return false;
    }
    const templateModelTypes = getModelTypesFromTemplate(template);
    if (templateModelTypes.length === 0) {
      return true;
    }
    if (!modelType) {
      return true;
    }
    return templateModelTypes.some((type) => type === modelType);
  });

/**
 * Find a Template matching a model-server selection (by template name, and namespace when set).
 */
export const findTemplateForSelection = (
  templates: TemplateKind[],
  selection: { name?: string; namespace?: string },
): TemplateKind | undefined =>
  templates.find(
    (template) =>
      template.metadata.name === selection.name &&
      (selection.namespace == null || template.metadata.namespace === selection.namespace),
  );
