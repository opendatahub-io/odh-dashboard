import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ReactNode } from 'react';

export type AgentOpsProjectRef = {
  name: string;
  displayName?: string;
};

export type ProjectsBridgeData = {
  projects: AgentOpsProjectRef[];
  preferredProject: AgentOpsProjectRef | null;
  updatePreferredProject: (project: AgentOpsProjectRef | null) => void;
  loaded: boolean;
  loadError: Error | null;
};

export type ProjectsBridgeProviderProps = {
  children: (data: ProjectsBridgeData) => ReactNode;
};

/**
 * Host-side bridge: reads ProjectsContext in the host bundle and passes filtered
 * Active project data into the federated agent-ops UI.
 */
export type ProjectsBridgeProviderExtension = Extension<
  'agent-ops.projects/bridge-provider',
  {
    component: ComponentCodeRef<ProjectsBridgeProviderProps>;
  }
>;

export const isProjectsBridgeProviderExtension = (
  extension: Extension,
): extension is ProjectsBridgeProviderExtension =>
  extension.type === 'agent-ops.projects/bridge-provider';
