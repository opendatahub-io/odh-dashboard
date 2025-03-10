import {
  Flex,
  FlexItem,
  HelperTextItem,
  HelperText,
  Label,
  Split,
  SplitItem,
  Truncate,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { HardwareProfileKind } from '~/k8sTypes';
import { ValidationContext } from '~/utilities/useValidation';
import { IdentifierResourceType } from '~/types';
import { splitValueUnit, CPU_UNITS, MEMORY_UNITS_FOR_PARSING } from '~/utilities/valueUnits';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { formatResource } from './utils';

type HardwareProfileSelectProps = {
  initialHardwareProfile?: HardwareProfileKind;
  previewDescription?: boolean;
  hardwareProfiles: HardwareProfileKind[];
  hardwareProfilesLoaded: boolean;
  hardwareProfilesError: Error | undefined;
  allowExistingSettings: boolean;
  hardwareProfileConfig: HardwareProfileConfig;
  isHardwareProfileSupported: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
};

const EXISTING_SETTINGS_KEY = '.existing';

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  initialHardwareProfile,
  previewDescription = false,
  hardwareProfiles,
  hardwareProfilesLoaded,
  hardwareProfilesError,
  allowExistingSettings = false,
  hardwareProfileConfig,
  isHardwareProfileSupported,
  onChange,
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const validationIssues = getAllValidationIssues(['']);

  const options = React.useMemo(() => {
    const enabledProfiles = hardwareProfiles
      .filter((hp) => hp.spec.enabled)
      .toSorted((a, b) => {
        const getProfileScore = (profile: HardwareProfileKind) => {
          const { identifiers } = profile.spec;
          if (!identifiers?.length) {
            return 0;
          }

          // Check if profile has any unlimited resources (no maxValue)
          const hasUnlimitedResources = identifiers.some((identifier) => !identifier.maxCount);
          // Profiles with unlimited resources should sort towards bottom
          if (hasUnlimitedResources) {
            return Number.MAX_SAFE_INTEGER;
          }

          let score = 0;

          // Add up normalized scores for each identifier
          identifiers.forEach((identifier) => {
            const maxValue = identifier.maxCount;
            if (!maxValue) {
              return;
            }

            if (identifier.resourceType === IdentifierResourceType.CPU) {
              // Convert CPU to smallest unit for comparison
              const [value, unit] = splitValueUnit(maxValue.toString(), CPU_UNITS);
              score += value * unit.weight;
            } else if (identifier.resourceType === IdentifierResourceType.MEMORY) {
              // Convert memory to smallest unit for comparison
              const [value, unit] = splitValueUnit(maxValue.toString(), MEMORY_UNITS_FOR_PARSING);
              score += value * unit.weight;
            } else {
              score += Number(maxValue);
            }
          });

          return score;
        };
        // First compare by whether they have extra resources
        const aHasExtra = (a.spec.identifiers ?? []).length > 2;
        const bHasExtra = (b.spec.identifiers ?? []).length > 2;

        // If one has extra resources and the other doesn't, sort the extra resources one later
        if (aHasExtra !== bHasExtra) {
          return aHasExtra ? 1 : -1;
        }

        // If they're the same (both have or both don't have extra resources),
        // then sort by their score
        return getProfileScore(a) - getProfileScore(b);
      });

    // allow continued use of already selected profile if it is disabled
    if (initialHardwareProfile && !initialHardwareProfile.spec.enabled) {
      enabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${profile.spec.displayName}${
        !profile.spec.enabled ? ' (disabled)' : ''
      }`;

      return {
        key: profile.metadata.name,
        label: displayName,
        description: (
          <Stack>
            {profile.spec.description && (
              <StackItem>
                <Truncate content={profile.spec.description} />
              </StackItem>
            )}
            {profile.spec.identifiers && (
              <StackItem>
                <Truncate
                  content={profile.spec.identifiers
                    .map((identifier) =>
                      formatResource(
                        identifier.displayName,
                        identifier.defaultCount.toString(),
                        identifier.defaultCount.toString(),
                      ),
                    )
                    .join('; ')}
                />
              </StackItem>
            )}
          </Stack>
        ),
        dropdownLabel: (
          <Split>
            <SplitItem>{displayName}</SplitItem>
            <SplitItem isFilled />
            <SplitItem>
              {isHardwareProfileSupported(profile) && <Label color="blue">Compatible</Label>}
            </SplitItem>
          </Split>
        ),
      };
    });

    // allow usage of existing settings if no hardware profile is found
    if (allowExistingSettings) {
      formattedOptions.push({
        key: EXISTING_SETTINGS_KEY,
        label: 'Use existing settings',
        description: 'Use existing resource requests/limits, tolerations, and node selectors.',
      });
    }

    return formattedOptions;
  }, [hardwareProfiles, initialHardwareProfile, allowExistingSettings, isHardwareProfileSupported]);

  return (
    <>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          <SimpleSelect
            dataTestId="hardware-profile-select"
            previewDescription={previewDescription}
            options={options}
            value={
              hardwareProfileConfig.selectedProfile?.metadata.name ??
              (hardwareProfileConfig.useExistingSettings ? EXISTING_SETTINGS_KEY : undefined)
            }
            onChange={(key) => {
              if (key === EXISTING_SETTINGS_KEY) {
                onChange(undefined);
              } else {
                const profile = hardwareProfiles.find((hp) => hp.metadata.name === key);
                if (profile) {
                  onChange(profile);
                }
              }
            }}
            placeholder={
              options.length > 0
                ? 'Select hardware profile...'
                : hardwareProfilesError
                ? 'Error loading hardware profiles'
                : 'No enabled or valid hardware profiles are available. Contact your administrator.'
            }
            isFullWidth
            isSkeleton={!hardwareProfilesLoaded && !hardwareProfilesError}
            isScrollable
          />
        </FlexItem>
        <FlexItem>
          {options.length > 0 && (
            <HardwareProfileDetailsPopover
              hardwareProfile={hardwareProfileConfig.selectedProfile}
              tolerations={hardwareProfileConfig.selectedProfile?.spec.tolerations}
              nodeSelector={hardwareProfileConfig.selectedProfile?.spec.nodeSelector}
              resources={hardwareProfileConfig.resources}
            />
          )}
        </FlexItem>
      </Flex>
      {hardwareProfilesError ? (
        <HelperText isLiveRegion>
          <HelperTextItem variant="error">Error loading hardware profiles</HelperTextItem>
        </HelperText>
      ) : hardwareProfilesLoaded && validationIssues.length > 0 ? (
        validationIssues.map((issue) => (
          <HelperText isLiveRegion key={issue.message}>
            <HelperTextItem variant="error">{issue.message}</HelperTextItem>
          </HelperText>
        ))
      ) : null}
    </>
  );
};

export default HardwareProfileSelect;
