import * as React from 'react';

type ProjectRef = {
  name: string;
};

type ProjectsBridgeContextType = {
  projects: ProjectRef[];
  preferredProject: ProjectRef | null;
  updatePreferredProject: (project: ProjectRef | null) => void;
  loaded: boolean;
  loadError: Error | null;
};

export const ProjectsBridgeContext = React.createContext<ProjectsBridgeContextType>({
  projects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: null,
});

export const useProjectsBridge = (): ProjectsBridgeContextType =>
  React.useContext(ProjectsBridgeContext);
