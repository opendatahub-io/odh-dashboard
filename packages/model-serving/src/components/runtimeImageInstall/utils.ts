import type { RuntimeImageInstallActionData } from '@mf/modelRegistry/extension-points';
import { RUNTIME_IMAGE_LIBRARY_PATH } from './const';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

export const getRuntimeImageInstallRoute = (runtimeId: string): string =>
  `${RUNTIME_IMAGE_LIBRARY_PATH}/${encodeURIComponent(runtimeId)}/install`;

export const getMatchingInstallTarget = (
  extensions: RuntimeImageInstallTargetExtension[],
  targetId: RuntimeImageInstallTargetId,
): RuntimeImageInstallTargetExtension | undefined =>
  extensions.find(
    (extension) =>
      extension.properties.id === targetId && typeof extension.properties.component === 'function',
  );

// Resolve the first valid contribution per target, independently of resource availability.
export const getInstallTargets = (
  extensions: RuntimeImageInstallTargetExtension[],
): RuntimeImageInstallTargetExtension[] =>
  Array.from(new Set(extensions.map((extension) => extension.properties.id))).flatMap(
    (targetId) => {
      const target = getMatchingInstallTarget(extensions, targetId);
      return target ? [target] : [];
    },
  );

export const getAvailableInstallTargets = (
  data: RuntimeImageInstallActionData,
  extensions: RuntimeImageInstallTargetExtension[],
): RuntimeImageInstallTargetExtension[] =>
  getInstallTargets(extensions).filter(
    (target) => data.deploymentResources[target.properties.id] !== undefined,
  );
