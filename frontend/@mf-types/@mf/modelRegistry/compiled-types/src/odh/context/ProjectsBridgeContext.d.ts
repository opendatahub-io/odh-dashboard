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
export declare const ProjectsBridgeContext: React.Context<ProjectsBridgeContextType>;
export declare const useProjectsBridge: () => ProjectsBridgeContextType;
export {};
