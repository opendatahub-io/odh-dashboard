import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

/**
 * What the caller may do to the deployments in one project, when the host
 * knows it (RHAII on xKS).
 */
export type ProjectDeploymentActions = {
  canEdit: boolean;
  canDelete: boolean;
};

export type ProjectsContextType = {
  projects: ProjectKind[];
  modelServingProjects: ProjectKind[];
  /** eg. Terminating state, etc */
  nonActiveProjects: ProjectKind[];
  /**
   * The projects a new deployment may target, when the host knows the caller's
   * deploy permission (RHAII on xKS). Unset means every project in `projects`.
   * `projects` stays the full collection for browsing.
   */
  deploymentTargetProjects?: ProjectKind[];
  /**
   * The caller's deployment actions in a project, when the host knows them.
   * Unset, or undefined for a project, means every action is offered.
   */
  getProjectDeploymentActions?: (projectName: string) => ProjectDeploymentActions | undefined;

  /** Some component set this value, you should use this instead of projects[0] */
  preferredProject: ProjectKind | null;
  /**
   * Allows for navigation to be unimpeded by project selection
   * @see useSyncPreferredProject
   */
  updatePreferredProject: (project: ProjectKind | null) => void;
  waitForProject: (projectName: string) => Promise<void>;

  loaded: boolean;
  loadError: Error | undefined;
};

export const ProjectsContext = React.createContext<ProjectsContextType>({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: new Error('Not in project provider'),
  waitForProject: () => Promise.resolve(),
});
