import type { PlaceholderRuntimeImageActionData } from './placeholder-types';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

// Duplicate target IDs are ambiguous; fail closed instead of selecting one arbitrarily.
export const getUniqueInstallTarget = (
  extensions: RuntimeImageInstallTargetExtension[],
  targetId: RuntimeImageInstallTargetId,
): RuntimeImageInstallTargetExtension | undefined => {
  const matches = extensions.filter((extension) => extension.properties.id === targetId);
  return matches.length === 1 && typeof matches[0].properties.component === 'function'
    ? matches[0]
    : undefined;
};

// Given the action data passed from the runtime library and the resolved extensions,
// return the install target extensions we have data for.
export const getAvailableInstallTargets = (
  data: PlaceholderRuntimeImageActionData,
  extensions: RuntimeImageInstallTargetExtension[],
): RuntimeImageInstallTargetExtension[] =>
  extensions.filter(
    (extension) =>
      data.deploymentResources[extension.properties.id] !== undefined &&
      getUniqueInstallTarget(extensions, extension.properties.id) === extension,
  );
