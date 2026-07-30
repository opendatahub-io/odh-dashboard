import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  getMultiProjectServingPlatforms,
  type ModelServingPlatform,
} from './useProjectServingPlatform';

export const resolvePlatformOverride = <T extends { properties: { platform: string } }>(
  activePlatform: { properties: { id: string } } | null | undefined,
  extensions: T[],
): T | undefined =>
  activePlatform
    ? extensions.find((ext) => ext.properties.platform === activePlatform.properties.id)
    : undefined;

export const resolveMultiProjectPlatformOverride = <T extends { properties: { platform: string } }>(
  projects: ProjectKind[],
  availablePlatforms: ModelServingPlatform[],
  extensions: T[],
): T | undefined => {
  const platforms = getMultiProjectServingPlatforms(projects, availablePlatforms);
  for (const platform of platforms) {
    const ext = extensions.find((e) => e.properties.platform === platform.properties.id);
    if (ext) {
      return ext;
    }
  }
  return undefined;
};
