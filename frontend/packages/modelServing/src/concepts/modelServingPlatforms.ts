import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import type { ModelServingPlatform } from '../extension-points';

export const getActiveServingPlatform = (
  project: ProjectKind,
  platforms: ModelServingPlatform[],
): ModelServingPlatform | null => platforms.find((p) => p.properties.isEnabled(project)) ?? null;
