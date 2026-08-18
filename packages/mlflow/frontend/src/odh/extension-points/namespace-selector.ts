import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';

/**
 * Props for the project selector used by Register MCP server (and similar forms).
 * Host provides a component that runs in the host React tree so it sees the real
 * ProjectsContext (ui-core deep imports are not reliably singleton-shared under MF).
 */
export type ProjectSelectorFieldProps = {
  namespace: string;
  onSelection: (namespace: string) => void;
  placeholder?: string;
  isFullWidth?: boolean;
  appendTo?: 'inline' | (() => HTMLElement) | HTMLElement;
};

/**
 * Extension point for a project selector that uses the host ProjectsContext.
 * Replaces direct ui-core ProjectSelector usage in the mlflow remote, which
 * otherwise reads a second (empty) ProjectsContext instance.
 */
export type ProjectSelectorExtension = Extension<
  'mlflow.project/selector',
  {
    component: ComponentCodeRef<ProjectSelectorFieldProps>;
  }
>;

export const isProjectSelectorExtension =
  createExtensionGuard<ProjectSelectorExtension>('mlflow.project/selector');
