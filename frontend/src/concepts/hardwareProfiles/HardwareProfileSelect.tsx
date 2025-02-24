import {
  Flex,
  FlexItem,
  HelperTextItem,
  HelperText,
  Label,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import * as React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { HardwareProfileKind, HardwareProfileVisibleIn } from '~/k8sTypes';
import { useHardwareProfilesByArea } from '~/pages/hardwareProfiles/migration/useHardwareProfilesByArea';
import { ValidationContext } from '~/utilities/useValidation';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { NotebookPodSpecOptions } from './useNotebookPodSpecOptionsState';

type HardwareProfileSelectProps = {
  initialHardwareProfile?: HardwareProfileKind;
  allowExistingSettings: boolean;
  podSpecOptions: NotebookPodSpecOptions;
  hardwareProfileConfig: HardwareProfileConfig;
  isHardwareProfileSupported: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
  visibleIn?: HardwareProfileVisibleIn[];
};

const EXISTING_SETTINGS_KEY = '.existing';

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  initialHardwareProfile,
  allowExistingSettings = false,
  podSpecOptions,
  hardwareProfileConfig,
  isHardwareProfileSupported,
  onChange,
  visibleIn = [],
}) => {
  const [hardwareProfiles, loaded, error] = useHardwareProfilesByArea(visibleIn);

  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const validationIssues = getAllValidationIssues(['']);

  const options = React.useMemo(() => {
    const enabledProfiles = hardwareProfiles.filter((hp) => hp.spec.enabled);

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
        description: profile.spec.description,
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
                : error
                ? 'Error loading hardware profiles'
                : 'No enabled or valid hardware profiles are available. Contact your administrator.'
            }
            isFullWidth
            isSkeleton={!loaded && !error}
          />
        </FlexItem>
        <FlexItem>
          {options.length > 0 && (
            <HardwareProfileDetailsPopover
              hardwareProfile={hardwareProfileConfig.selectedProfile}
              tolerations={podSpecOptions.tolerations}
              nodeSelector={podSpecOptions.nodeSelector}
              resources={podSpecOptions.resources}
            />
          )}
        </FlexItem>
      </Flex>
      {error ? (
        <HelperText isLiveRegion>
          <HelperTextItem variant="error">Error loading hardware profiles</HelperTextItem>
        </HelperText>
      ) : loaded && validationIssues.length > 0 ? (
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
