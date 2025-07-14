import { HardwareProfileKind } from '#~/k8sTypes';
import { DisplayNameAnnotation, Identifier, IdentifierResourceType } from '#~/types';
import {
  HardwareProfileWarningType,
  WarningNotification,
} from '#~/concepts/hardwareProfiles/types';
import {
  CPU_UNITS,
  MEMORY_UNITS_FOR_SELECTION,
  OTHER,
  splitValueUnit,
  UnitOption,
} from '#~/utilities/valueUnits';
import { DEFAULT_CPU_IDENTIFIER, DEFAULT_MEMORY_IDENTIFIER } from './nodeResource/const';
import { hasCPUandMemory } from './manage/ManageNodeResourceSection';
import { createHardwareProfileWarningSchema } from './manage/validationUtils';

export enum HardwareProfileBannerWarningTitles {
  ALL_INVALID = 'All hardware profiles are invalid',
  ALL_DISABLED = 'All hardware profiles are disabled',
  SOME_INVALID = 'One or more hardware profiles are invalid',
  ALL_INCOMPLETE = 'All hardware profiles are incomplete',
  SOME_INCOMPLETE = 'One or more hardware profiles are incomplete',
}

export const determineIdentifierUnit = (nodeResource: Identifier): UnitOption[] => {
  if (
    nodeResource.resourceType === IdentifierResourceType.CPU ||
    nodeResource.identifier === DEFAULT_CPU_IDENTIFIER
  ) {
    return CPU_UNITS;
  }
  if (
    nodeResource.resourceType === IdentifierResourceType.MEMORY ||
    nodeResource.identifier === DEFAULT_MEMORY_IDENTIFIER
  ) {
    return MEMORY_UNITS_FOR_SELECTION;
  }
  return OTHER;
};

const generateWarningTitle = (
  hasEnabled: boolean,
  allInvalid: boolean,
  hasInvalid: boolean,
  allIncompleteCPUorMemory: boolean,
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
  if (allIncompleteCPUorMemory) {
    return HardwareProfileBannerWarningTitles.ALL_INCOMPLETE;
  }
  return HardwareProfileBannerWarningTitles.SOME_INCOMPLETE;
};

const generateWarningMessage = (
  hasEnabled: boolean,
  allInvalid: boolean,
  hasInvalid: boolean,
  allIncompleteCPUorMemory: boolean,
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
  if (allIncompleteCPUorMemory) {
    return 'All of your defined hardware profiles are missing either CPU or Memory. This is not recommended.';
  }
  return 'One or more of your defined hardware profiles are missing either CPU or Memory. This is not recommended.';
};

export const generateWarningForHardwareProfiles = (
  hardwareProfiles: HardwareProfileKind[],
): WarningNotification | undefined => {
  const hasInvalid = hardwareProfiles.some((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type !== HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });
  const hasEnabled = hardwareProfiles.some((profile) => isHardwareProfileEnabled(profile));
  const allInvalid = hardwareProfiles.every((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type !== HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });
  const allIncompleteCPUorMemory = hardwareProfiles.every((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type === HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });

  const someIncompleteCPUorMemory = hardwareProfiles.some((profile) => {
    const warnings = validateProfileWarning(profile);
    return warnings.some(
      (warning) => warning.type === HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
    );
  });

  if (hardwareProfiles.length === 0 || (!hasInvalid && !someIncompleteCPUorMemory && hasEnabled)) {
    return undefined;
  }

  return {
    title: generateWarningTitle(hasEnabled, allInvalid, hasInvalid, allIncompleteCPUorMemory),
    message: generateWarningMessage(hasEnabled, allInvalid, hasInvalid, allIncompleteCPUorMemory),
  };
};

export const isHardwareProfileIdentifierValid = (identifier: Identifier): boolean => {
  try {
    if (
      identifier.minCount.toString().charAt(0) === '-' ||
      (identifier.maxCount && identifier.maxCount.toString().charAt(0) === '-') ||
      identifier.defaultCount.toString().charAt(0) === '-'
    ) {
      return false;
    }
    const minCount = splitValueUnit(
      identifier.minCount.toString(),
      determineIdentifierUnit(identifier),
      true,
    )[0];
    const [maxCount] = identifier.maxCount
      ? splitValueUnit(identifier.maxCount.toString(), determineIdentifierUnit(identifier), true)
      : [undefined];
    const defaultCount = splitValueUnit(
      identifier.defaultCount.toString(),
      determineIdentifierUnit(identifier),
      true,
    )[0];
    if (
      !Number.isInteger(minCount) ||
      (maxCount !== undefined && !Number.isInteger(maxCount)) ||
      !Number.isInteger(defaultCount) ||
      (maxCount && minCount !== undefined && minCount > maxCount) ||
      (defaultCount !== undefined && minCount !== undefined && defaultCount < minCount) ||
      (maxCount && defaultCount !== undefined && defaultCount > maxCount)
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
  type: string | number;
};

export const createHardwareProfileWarningTitle = (hardwareProfile: HardwareProfileKind): string => {
  const complete = hasCPUandMemory(hardwareProfile.spec.identifiers ?? []);
  return `${complete ? 'Invalid' : 'Incomplete'} hardware profile`;
};

export const createIdentifierWarningMessage = (message: string): string =>
  `${message} Edit the profile to make the profile valid.`;

export const validateProfileWarning = (
  hardwareProfile: HardwareProfileKind,
): HardwareProfileWarning[] => {
  const warningMessages: HardwareProfileWarning[] = [];
  const identifiers = hardwareProfile.spec.identifiers ?? [];
  const schema = createHardwareProfileWarningSchema(hardwareProfile.metadata.name);
  const warnings = schema.safeParse(identifiers);

  if (warnings.error) {
    warnings.error.issues.forEach((issue) => {
      warningMessages.push({
        message: issue.message,
        type: 'params' in issue ? issue.params?.code : HardwareProfileWarningType.OTHER,
      });
    });
  }
  return warningMessages;
};

export const isHardwareProfileValid = (hardwareProfile: HardwareProfileKind): boolean => {
  const warnings = validateProfileWarning(hardwareProfile);
  return warnings.length === 0;
};

export const getHardwareProfileDisplayName = (hardwareProfile: HardwareProfileKind): string =>
  hardwareProfile.metadata.annotations?.[DisplayNameAnnotation.ODH_DISP_NAME] ||
  hardwareProfile.metadata.name;

export const getHardwareProfileDescription = (
  hardwareProfile: HardwareProfileKind,
): string | undefined => hardwareProfile.metadata.annotations?.[DisplayNameAnnotation.ODH_DESC];

export const isHardwareProfileEnabled = (hardwareProfile: HardwareProfileKind): boolean =>
  hardwareProfile.metadata.annotations?.['opendatahub.io/disabled'] === 'false' ||
  hardwareProfile.metadata.annotations?.['opendatahub.io/disabled'] === undefined;
