import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import type { ModelServingPlatformExtension } from '../extension-points';

export const getActiveServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatformExtension[],
): ModelServingPlatformExtension | null => platforms.find((p) => p.properties.isEnabled(project)) ?? null;
