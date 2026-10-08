import type { PlaceholderRuntimeImageActionData } from './placeholder-types';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

export const getMatchingInstallTarget = (
  extensions: RuntimeImageInstallTargetExtension[],
  targetId: RuntimeImageInstallTargetId,
): RuntimeImageInstallTargetExtension | undefined =>
  extensions.find(
    (extension) =>
      extension.properties.id === targetId && typeof extension.properties.component === 'function',
  );

// Given the action data passed from the runtime library and the resolved extensions,
// return the install target extensions we have data for (first match per target).
export const getAvailableInstallTargets = (
  data: PlaceholderRuntimeImageActionData,
  extensions: RuntimeImageInstallTargetExtension[],
): RuntimeImageInstallTargetExtension[] =>
  Array.from(new Set(extensions.map((extension) => extension.properties.id))).flatMap(
    (targetId) => {
      const target = getMatchingInstallTarget(extensions, targetId);
      return target && data.deploymentResources[targetId] !== undefined ? [target] : [];
    },
  );
