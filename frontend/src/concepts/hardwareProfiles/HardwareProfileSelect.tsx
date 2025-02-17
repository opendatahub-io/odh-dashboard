import {
  Alert,
  AlertVariant,
  Flex,
  FlexItem,
  Label,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import * as React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { HardwareProfileKind } from '~/k8sTypes';
import useHardwareProfiles from '~/pages/hardwareProfiles/useHardwareProfiles';
import { useDashboardNamespace } from '~/redux/selectors';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import { HardwareProfileConfig } from './useHardwareProfileConfig';

type HardwareProfileSelectProps = {
  hardwareProfileConfig: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  allowExistingSettings: boolean;
  isHardwareProfileSupported: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
};

const EXISTING_SETTINGS_KEY = '.existing';

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  hardwareProfileConfig,
  initialHardwareProfile,
  allowExistingSettings = false,
  isHardwareProfileSupported,
  onChange,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles, loaded, error] = useHardwareProfiles(dashboardNamespace);

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
                : 'No enabled or valid hardware profiles are available. Contact your administrator.'
            }
            isFullWidth
            isSkeleton={!loaded && !error}
          />
        </FlexItem>
        {hardwareProfileConfig.selectedProfile && (
          <FlexItem>
            <HardwareProfileDetailsPopover hardwareProfileConfig={hardwareProfileConfig} />
          </FlexItem>
        )}
      </Flex>
      {error && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          isPlain
          title="Error loading hardware profiles"
        />
      )}
    </>
  );
};

export default HardwareProfileSelect;
