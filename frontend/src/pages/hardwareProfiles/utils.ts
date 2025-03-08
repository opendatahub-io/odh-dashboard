import { HardwareProfileKind } from '~/k8sTypes';
import { Identifier } from '~/types';
import { HardwareProfileWarningType, WarningNotification } from '~/concepts/hardwareProfiles/types';
import { hardwareProfileWarningSchema } from '~/concepts/hardwareProfiles/validationUtils';
import { determineUnit, splitValueUnit } from '~/utilities/valueUnits';
import { HARDWARE_PROFILES_DEFAULT_WARNING_MESSAGE } from './nodeResource/const';
import { hasCPUandMemory } from './manage/ManageNodeResourceSection';

export enum HardwareProfileBannerWarningTitles {
  ALL_INVALID = 'All hardware profiles are invalid',
  ALL_DISABLED = 'All hardware profiles are disabled',
  SOME_INVALID = 'One or more hardware profiles are invalid',
  ALL_INCOMPLETE = 'All hardware profiles are incomplete',
  SOME_INCOMPLETE = 'One or more hardware profiles are incomplete',
}

const generateWarningTitle = (
  hasEnabled: boolean,
  allInvalid: boolean,
  hasInvalid: boolean,
  allIncomplete: boolean,
): string => {
  if (allInvalid) {
    return HardwareProfileBannerWarningTitles.ALL_INVALID;
  }
  if (!hasEnabled) {
    return HardwareProfileBannerWarningTitles.ALL_DISABLED;
  }
  if (hasInvalid) {
    return HardwareProfileBannerWarningTitles.SOME_INVALID;
  }
  if (allIncomplete) {
    return HardwareProfileBannerWarningTitles.ALL_INCOMPLETE;
  }
  return HardwareProfileBannerWarningTitles.SOME_INCOMPLETE;
};

const generateWarningMessage = (
  hasEnabled: boolean,
  allInvalid: boolean,
  hasInvalid: boolean,
  allIncomplete: boolean,
): string => {
  if (allInvalid) {
    return 'You must have at least one valid hardware profile enabled for users to create workbenches or deploy models. Take the appropriate actions below to re-validate your profiles.';
  }
  if (!hasEnabled) {
    return 'You must have at least one hardware profile enabled for users to create workbenches or deploy models. Enable one or more profiles in the table below.';
  }
  if (hasInvalid) {
    return 'One or more of your defined hardware profiles are invalid. Take the appropriate actions below to revalidate your profiles.';
  }
  if (allIncomplete) {
    return 'All of your defined hardware profiles are missing either CPU or Memory. This is not recommended.';
  }
  return 'One or more of your defined hardware profiles are missing either CPU or Memory. This is not recommended.';
};

export const generateWarningForHardwareProfiles = (
  hardwareProfiles: HardwareProfileKind[],
): WarningNotification | undefined => {
  const hasInvalid = hardwareProfiles.some((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some((warning) => warning.type === HardwareProfileWarningType.OTHER);
  });
  const hasEnabled = hardwareProfiles.some((profile) => profile.spec.enabled);
  const allInvalid = hardwareProfiles.every((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some((warning) => warning.type === HardwareProfileWarningType.OTHER);
  });
  const allIncomplete = hardwareProfiles.every((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type === HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });
  const someIncomplete = hardwareProfiles.some((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type === HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });
  if (hardwareProfiles.length === 0 || (!hasInvalid && !someIncomplete && hasEnabled)) {
    return undefined;
  }
  return {
    title: generateWarningTitle(hasEnabled, allInvalid, hasInvalid, allIncomplete),
    message: generateWarningMessage(hasEnabled, allInvalid, hasInvalid, allIncomplete),
  };
};

export const isHardwareProfileIdentifierValid = (identifier: Identifier): boolean => {
  try {
    if (
      identifier.minCount.toString().at(0) === '-' ||
      (identifier.maxCount && identifier.maxCount.toString().at(0) === '-') ||
      identifier.defaultCount.toString().at(0) === '-'
    ) {
      return false;
    }
    const [minCount] = splitValueUnit(
      identifier.minCount.toString(),
      determineUnit(identifier),
      true,
    );
    const [maxCount] = identifier.maxCount
      ? splitValueUnit(identifier.maxCount.toString(), determineUnit(identifier), true)
      : [undefined];
    const [defaultCount] = splitValueUnit(
      identifier.defaultCount.toString(),
      determineUnit(identifier),
      true,
    );
    if (
      !Number.isInteger(minCount) ||
      (maxCount !== undefined && !Number.isInteger(maxCount)) ||
      !Number.isInteger(defaultCount) ||
      (maxCount && minCount > maxCount) ||
      defaultCount < minCount ||
      (maxCount && defaultCount > maxCount)
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

type HardwareProfileWarning = {
  message: string;
  type: HardwareProfileWarningType;
};

export const createHardwareProfileWarningTitle = (hardwareProfile: HardwareProfileKind): string => {
  const complete = hasCPUandMemory(hardwareProfile.spec.identifiers ?? []);
  return `${complete ? 'Invalid' : 'Incomplete'} hardware profile`;
};

export const createIdentifierWarningMessage = (message: string, isDefault: boolean): string =>
  `${message} ${
    isDefault
      ? HARDWARE_PROFILES_DEFAULT_WARNING_MESSAGE
      : 'Edit the profile to make the profile valid.'
  }`;

export const validateProfileWarning = (
  hardwareProfile: HardwareProfileKind,
): HardwareProfileWarning[] => {
  const warningMessages: HardwareProfileWarning[] = [];
  const identifiers = hardwareProfile.spec.identifiers ?? [];
  const warnings = hardwareProfileWarningSchema.safeParse({ isDefault: false, value: identifiers });
  if (warnings.error) {
    warnings.error.issues.forEach((issue) => {
      if ('params' in issue && typeof issue.params !== 'undefined') {
        warningMessages.push({
          message: issue.message,
          type: issue.params.type,
        });
      }
    });
  }
  return warningMessages;
};

export const isHardwareProfileValid = (hardwareProfile: HardwareProfileKind): boolean => {
  const warnings = validateProfileWarning(hardwareProfile);
  return warnings.length === 0;
};
