import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/k8s/projects';
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { ModelServingPlatformExtension } from '../../extension-points';

export type ModelServingPlatform = ModelServingPlatformExtension;

/**
 * Check the project labels and annotations to see if it matches any of the platforms.
 * First match is returned.
 */
export const getProjectServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatform[],
): ModelServingPlatform | null =>
  platforms.find(
    (p) =>
      (p.properties.manage.enabledProjectMetadata.labels &&
        Object.entries(p.properties.manage.enabledProjectMetadata.labels).every(
          ([key, value]) => project.metadata.labels?.[key] === value,
        )) ||
      (p.properties.manage.enabledProjectMetadata.annotations &&
        Object.entries(p.properties.manage.enabledProjectMetadata.annotations).every(
          ([key, value]) => project.metadata.annotations?.[key] === value,
        )),
  ) ?? null;

export const useProjectServingPlatform = (
  project: ProjectKind,
  platforms?: ModelServingPlatform[],
): {
  activePlatform?: ModelServingPlatform | null; // This includes preselecting a platform if there is only one
  projectPlatform?: ModelServingPlatform | null; // Platform saved on project
  setProjectPlatform: (platform: ModelServingPlatform) => void;
  resetProjectPlatform: () => void;
  newProjectPlatformLoading?: ModelServingPlatform | null;
  projectPlatformError: string | null;
} => {
  const [tmpProjectPlatform, setTmpProjectPlatform] = React.useState<
    ModelServingPlatform | null | undefined
  >(project.metadata.name && platforms ? getProjectServingPlatform(project, platforms) : undefined);
  const [projectPlatformError, setProjectPlatformError] = React.useState<string | null>(null);
  const [newProjectPlatformLoading, setNewProjectPlatformLoading] = React.useState<
    ModelServingPlatform | null | undefined
  >();

  React.useEffect(() => {
    if (!project.metadata.name || !platforms) {
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
      setNewProjectPlatformLoading(platformToEnable);
      setProjectPlatformError(null);

      addSupportServingPlatformProject(
        project.metadata.name,
        platformToEnable.properties.manage.namespaceApplicationCase,
      ).catch((e) => {
        setProjectPlatformError(e.message);
        setNewProjectPlatformLoading(undefined);
      });
    },
    [project, setNewProjectPlatformLoading],
  );

  const resetProjectPlatform = React.useCallback(() => {
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
  };
};
