import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

/**
 * What the caller may do to the deployments in one project, when the host
 * knows it (RHAII on xKS). `false` denies an action; an unset field allows it,
 * so a host that predates a field keeps today's behaviour.
 */
export type ProjectDeploymentActions = {
  /** Update the project's deployments from the wizard. */
  canEdit?: boolean;
  /** Start and stop the project's deployments. */
  canStartStop?: boolean;
  canDelete?: boolean;
  /** Set up token authentication on a new deployment. */
  canCreateTokenAuth?: boolean;
  /** Manage the tokens of an existing deployment. */
  canManageTokenAuth?: boolean;
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
  /**
   * Set while the host cannot list every project the caller may use and
   * offers no other way to enter one (RHAII when namespace discovery is
   * unavailable): looks a project up by name and, when the caller may browse
   * it, adds it and makes it preferred. A project the caller may only deploy
   * to is added as a deployment target, and the call rejects with a message
   * saying so. Rejects, with a message to show, when the caller may not use it.
   */
  findProject?: (projectName: string) => Promise<ProjectKind>;

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
