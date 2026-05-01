import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';

type ProjectRef = {
  name: string;
};

export type ProjectsBridgeData = {
  projects: ProjectRef[];
  preferredProject: ProjectRef | null;
  updatePreferredProject: (project: ProjectRef | null) => void;
  loaded: boolean;
  loadError: Error | null;
};

export type ProjectsBridgeProviderProps = {
  children: (data: ProjectsBridgeData) => React.ReactNode;
};

/**
 * Extension point for providing project data from the host app's ProjectsContext
 * to the upstream ProjectsBridgeContext. Uses a render-prop pattern so that the
 * downstream component never needs to import the upstream context object — it
 * passes data back via the render prop, and the upstream wrapper provides it
 * to ProjectsBridgeContext.Provider.
 */
export type ProjectsBridgeProviderExtension = Extension<
  'model-registry.projects/bridge-provider',
  {
    component: ComponentCodeRef<ProjectsBridgeProviderProps>;
  }
>;

export const isProjectsBridgeProviderExtension = (
  extension: Extension,
): extension is ProjectsBridgeProviderExtension =>
  extension.type === 'model-registry.projects/bridge-provider';
