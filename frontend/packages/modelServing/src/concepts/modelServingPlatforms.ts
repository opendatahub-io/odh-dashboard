import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { addSupportServingPlatformProject } from '@odh-dashboard/internal/api/k8s/projects';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { ModelServingPlatformExtension } from '../../extension-points';

export type ModelServingPlatform = ResolvedExtension<ModelServingPlatformExtension>;

export const getActiveServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatform[],
): ModelServingPlatform | null =>
  platforms.find(
    (p) =>
      project.metadata.labels?.[p.properties.manage.enabledLabel] ===
      p.properties.manage.enabledLabelValue,
  ) ?? null;

export const useActiveServingPlatform = (
  project: ProjectKind,
  platforms?: ModelServingPlatform[],
): {
  activePlatform?: ModelServingPlatform | null;
  setActivePlatform: (platform: ModelServingPlatform) => void;
  resetActivePlatform: () => void;
  newPlatformLoading?: ModelServingPlatform | null;
  activePlatformError: string | null;
} => {
  const [activePlatform, setTmpActivePlatform] = React.useState<
    ModelServingPlatform | null | undefined
  >(project.metadata.name && platforms ? getActiveServingPlatform(project, platforms) : undefined);
  const [activePlatformError, setActivePlatformError] = React.useState<string | null>(null);
  const [newPlatformLoading, setNewPlatformLoading] = React.useState<
    ModelServingPlatform | null | undefined
  >();

  React.useEffect(() => {
    if (!project.metadata.name || !platforms) {
      return;
    }
    const p = getActiveServingPlatform(project, platforms);
    if (p?.properties.id !== activePlatform?.properties.id) {
      setTmpActivePlatform(p);
      setNewPlatformLoading(undefined);
    }
  }, [project, platforms, activePlatform?.properties.id, setNewPlatformLoading]);

  const setActivePlatform = React.useCallback(
    (platformToEnable: ModelServingPlatform) => {
      setNewPlatformLoading(platformToEnable);
      setActivePlatformError(null);

      addSupportServingPlatformProject(
        project.metadata.name,
        platformToEnable.properties.manage.namespaceApplicationCase,
      ).catch((e) => {
        setActivePlatformError(e.message);
        setNewPlatformLoading(undefined);
      });
    },
    [project, setNewPlatformLoading],
  );

  const resetActivePlatform = React.useCallback(() => {
    setNewPlatformLoading(null);
    setActivePlatformError(null);

    addSupportServingPlatformProject(
      project.metadata.name,
      NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
    ).catch((e) => {
      setActivePlatformError(e.message);
      setNewPlatformLoading(undefined);
    });
  }, [project]);

  return {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
    newPlatformLoading,
    activePlatformError,
  };
};
