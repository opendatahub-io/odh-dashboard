import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/k8s/projects';
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { ModelServingPlatformExtension } from '../../extension-points';

export type ModelServingPlatform = ModelServingPlatformExtension;

const isPlatformEnabled = (platform: ModelServingPlatform, project: ProjectKind): boolean => {
  const requirements = platform.properties.manage.projectRequirements;

  const labelsMatch =
    !requirements.labels ||
    Object.entries(requirements.labels).every(
      ([key, value]) => project.metadata.labels?.[key] === value,
    );

  const annotationsMatch =
    !requirements.annotations ||
    Object.entries(requirements.annotations).every(
      ([key, value]) => project.metadata.annotations?.[key] === value,
    );

  return labelsMatch && annotationsMatch;
};

/**
 * Check the project labels and annotations to see if it matches any of the platforms.
 * Returns the platform with the highest priority if there are multiple matches.
 */
export const getProjectServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatform[],
  defaultIfNoMatch = false,
): ModelServingPlatform | null => {
  const enabledPlatforms = platforms.filter(
    (p) => isPlatformEnabled(p, project) || (defaultIfNoMatch && p.properties.manage.default),
  );
  const sortedEnabledPlatforms = enabledPlatforms.toSorted(
    (a, b) => (b.properties.manage.priority ?? 0) - (a.properties.manage.priority ?? 0),
  );
  return sortedEnabledPlatforms[0] ?? null;
};

export const getMultiProjectServingPlatforms = (
  projects: ProjectKind[],
  platforms: ModelServingPlatform[],
): ModelServingPlatform[] => {
  const result = [];
  for (const project of projects) {
    const platform = getProjectServingPlatform(project, platforms);
    if (platform) {
      result.push(platform);
    }
  }
  return result;
};

export const useProjectServingPlatform = (
  project?: ProjectKind,
  platforms?: ModelServingPlatform[],
): {
  activePlatform?: ModelServingPlatform | null; // This includes preselecting a platform if there is only one
  projectPlatform?: ModelServingPlatform | null; // Platform saved on project
  setProjectPlatform: (platform: ModelServingPlatform) => void;
  resetProjectPlatform: () => void;
  newProjectPlatformLoading?: ModelServingPlatform | null;
  projectPlatformError: Error | null;
  clearProjectPlatformError: () => void;
} => {
  const [tmpProjectPlatform, setTmpProjectPlatform] = React.useState<
    ModelServingPlatform | null | undefined
  >(project && platforms ? getProjectServingPlatform(project, platforms) : undefined);
  const [projectPlatformError, setProjectPlatformError] = React.useState<Error | null>(null);
  const [newProjectPlatformLoading, setNewProjectPlatformLoading] = React.useState<
    ModelServingPlatform | null | undefined
  >();

  React.useEffect(() => {
    if (!project || !platforms) {
      return;
    }
    const p = getProjectServingPlatform(project, platforms);
    if (p?.properties.id !== tmpProjectPlatform?.properties.id) {
      setTmpProjectPlatform(p);
      setNewProjectPlatformLoading(undefined);
    }
  }, [project, platforms, tmpProjectPlatform?.properties.id, setNewProjectPlatformLoading]);

  const setProjectPlatform = React.useCallback(
    (platformToEnable: ModelServingPlatform) => {
      if (!project) {
        return;
      }
      setNewProjectPlatformLoading(platformToEnable);
      setProjectPlatformError(null);

      addSupportServingPlatformProject(
        project.metadata.name,
        platformToEnable.properties.manage.namespaceApplicationCase,
      ).catch((e) => {
        if (e instanceof Error) {
          setProjectPlatformError(e);
        } else {
          setProjectPlatformError(new Error('Error selecting platform'));
        }
        setNewProjectPlatformLoading(undefined);
      });
    },
    [project, setNewProjectPlatformLoading],
  );

  const resetProjectPlatform = React.useCallback(() => {
    if (!project) {
      return;
    }
    setNewProjectPlatformLoading(null);
    setProjectPlatformError(null);

    addSupportServingPlatformProject(
      project.metadata.name,
      NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
    ).catch((e) => {
      setProjectPlatformError(e.message);
      setNewProjectPlatformLoading(undefined);
    });
  }, [project]);

  const activePlatform = React.useMemo(
    () =>
      !tmpProjectPlatform && platforms && platforms.length === 1
        ? platforms[0]
        : tmpProjectPlatform,
    [tmpProjectPlatform, platforms],
  );

  return {
    activePlatform,
    projectPlatform: tmpProjectPlatform,
    setProjectPlatform,
    resetProjectPlatform,
    newProjectPlatformLoading,
    projectPlatformError,
    clearProjectPlatformError: () => setProjectPlatformError(null),
  };
};
