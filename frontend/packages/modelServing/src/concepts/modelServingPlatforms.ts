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
  activePlatformLoading: boolean;
  activePlatformError: string | null;
} => {
  const [activePlatform, setTmpActivePlatform] = React.useState<
    ModelServingPlatform | null | undefined
  >(project.metadata.name && platforms ? getActiveServingPlatform(project, platforms) : undefined);
  const [activePlatformError, setActivePlatformError] = React.useState<string | null>(null);
  const newPlatformBeingSet = React.useRef<ModelServingPlatform | null | undefined>();

  React.useEffect(() => {
    if (!project.metadata.name || !platforms) {
      return;
    }
    // If an operation is "active" (newPlatform.current is a platform object or null), then bail.
    // This prevents the effect from overriding an optimistic update.
    if (newPlatformBeingSet.current !== undefined) {
      return;
    }
    const p = getActiveServingPlatform(project, platforms);
    if (p?.properties.id !== activePlatform?.properties.id) {
      setTmpActivePlatform(p);
    }
  }, [project, platforms, activePlatform?.properties.id]);

  const setActivePlatform = React.useCallback(
    (platformToEnable: ModelServingPlatform) => {
      newPlatformBeingSet.current = platformToEnable;
      setActivePlatformError(null);
      setTmpActivePlatform(platformToEnable);

      addSupportServingPlatformProject(
        project.metadata.name,
        platformToEnable.properties.manage.namespaceApplicationCase,
      )
        .catch((e) => {
          setActivePlatformError(e.message);
        })
        .finally(() => {
          if (newPlatformBeingSet.current?.properties.id === platformToEnable.properties.id) {
            newPlatformBeingSet.current = undefined;
          }
        });
    },
    [project],
  );

  const resetActivePlatform = React.useCallback(() => {
    newPlatformBeingSet.current = null;
    setActivePlatformError(null);
    setTmpActivePlatform(null);

    addSupportServingPlatformProject(
      project.metadata.name,
      NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
    )
      .catch((e) => {
        setActivePlatformError(e.message);
      })
      .finally(() => {
        if (newPlatformBeingSet.current === null) {
          newPlatformBeingSet.current = undefined;
        }
      });
  }, [project]);

  return {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
    activePlatformLoading: newPlatformBeingSet.current !== undefined,
    activePlatformError,
  };
};
