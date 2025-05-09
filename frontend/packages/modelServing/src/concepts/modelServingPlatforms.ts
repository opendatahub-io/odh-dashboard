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
  const [activePlatform, setTmpActivePlatform] = React.useState<
    ModelServingPlatform | null | undefined
  >(project.metadata.name && platforms ? getActiveServingPlatform(project, platforms) : undefined);
  const newPlatform = React.useRef<ModelServingPlatform | null | undefined>();

  React.useEffect(() => {
    if (!project.metadata.name || !platforms) {
      return;
    }
    // If an operation is "active" (newPlatform.current is a platform object or null), then bail.
    // This prevents the effect from overriding an optimistic update.
    if (newPlatform.current !== undefined) {
      return;
    }
    const p = getActiveServingPlatform(project, platforms);
    if (p?.properties.id !== activePlatform?.properties.id) {
      setTmpActivePlatform(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, platforms, activePlatform?.properties.id, newPlatform.current]);

  const setActivePlatform = React.useCallback(
    (platformToEnable: ModelServingPlatform) => {
      newPlatform.current = platformToEnable;
      platformToEnable.properties.manage.enable(project).finally(() => {
        if (newPlatform.current === platformToEnable) {
          newPlatform.current = undefined;
        }
      });
      setTmpActivePlatform(platformToEnable);
    },
    [project],
  );

  const resetActivePlatform = React.useCallback(() => {
    if (!activePlatform) {
      if (newPlatform.current === null) {
        return;
      }
    }
    newPlatform.current = null;

    const disablePromise = activePlatform
      ? activePlatform.properties.manage.disable(project)
      : Promise.resolve();

    disablePromise.finally(() => {
      if (newPlatform.current === null) {
        newPlatform.current = undefined;
      }
    });
    setTmpActivePlatform(null);
  }, [project, activePlatform]);

  return {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
  };
};
