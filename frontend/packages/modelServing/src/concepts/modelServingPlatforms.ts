import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatformExtension } from '../extension-points';

export type ModelServingPlatform = ResolvedExtension<ModelServingPlatformExtension>;

export const getActiveServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatform[],
): ModelServingPlatform | null =>
  platforms.find((p) => p.properties.manage.isEnabled(project)) ?? null;

export const useActiveServingPlatform = (
  project: ProjectKind,
  platforms?: ModelServingPlatform[],
): {
  activePlatform?: ModelServingPlatform | null;
  setActivePlatform: (platform: ModelServingPlatform) => void;
  resetActivePlatform: () => void;
} => {
  const [tmpActivePlatform, setTmpActivePlatform] = React.useState<ModelServingPlatform | null>();

  const activePlatform = React.useMemo(
    () =>
      tmpActivePlatform === undefined
        ? platforms
          ? getActiveServingPlatform(project, platforms)
          : undefined
        : tmpActivePlatform,
    [tmpActivePlatform, project, platforms],
  );

  const setActivePlatform = React.useCallback(
    (platform: ModelServingPlatform) => {
      platform.properties.manage.enable(project);
      setTmpActivePlatform(platform);
    },
    [project, setTmpActivePlatform],
  );

  const resetActivePlatform = React.useCallback(() => {
    setTmpActivePlatform(null);
    activePlatform?.properties.manage.disable(project);
  }, [project, activePlatform]);

  return {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
  };
};
