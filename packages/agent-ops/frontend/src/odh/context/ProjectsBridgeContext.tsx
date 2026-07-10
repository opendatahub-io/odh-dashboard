import * as React from 'react';
import type { AgentOpsProjectRef } from '~/odh/extension-points';

type ProjectsBridgeContextType = {
  bridgeActive: boolean;
  projects: AgentOpsProjectRef[];
  preferredProject: AgentOpsProjectRef | null;
  updatePreferredProject: (project: AgentOpsProjectRef | null) => void;
  loaded: boolean;
  loadError: Error | null;
};

export const ProjectsBridgeContext = React.createContext<ProjectsBridgeContextType>({
  bridgeActive: false,
  projects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: null,
});

export const useProjectsBridge = (): ProjectsBridgeContextType =>
  React.useContext(ProjectsBridgeContext);
