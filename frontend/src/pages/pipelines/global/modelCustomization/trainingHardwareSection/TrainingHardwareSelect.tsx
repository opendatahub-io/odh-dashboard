import { Alert, AlertVariant, Flex, FlexItem, Split, SplitItem } from '@patternfly/react-core';
import * as React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { HardwareProfileKind } from '~/k8sTypes';
import useHardwareProfiles from '~/pages/hardwareProfiles/useHardwareProfiles';
import { useDashboardNamespace } from '~/redux/selectors';
import { filterHardwareProfilesForTraining } from '~/pages/pipelines/global/modelCustomization/utils';
import { HardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileDetailsPopover from '~/concepts/hardwareProfiles/HardwareProfileDetailsPopover';

type TrainingHardwareProfileSelectProps = {
  hardwareProfileConfig: HardwareProfileConfig;
  onChange: (profile: HardwareProfileKind | undefined) => void;
};

const TrainingHardwareProfileSelect: React.FC<TrainingHardwareProfileSelectProps> = ({
  hardwareProfileConfig,
  onChange,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles, loaded, error] = useHardwareProfiles(dashboardNamespace);

  const filteredHardwareProfiles = filterHardwareProfilesForTraining(hardwareProfiles);

  const options = React.useMemo(() => {
    const enabledProfiles = filteredHardwareProfiles.filter((hp) => hp.spec.enabled);

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${profile.spec.displayName}${
        !profile.spec.enabled ? ' (disabled)' : ''
      }`;
      const identifierDescriptions = profile.spec.identifiers
        ?.map((identifier) => {
          const { defaultCount } = identifier;

          return `${identifier.identifier}: Request=${defaultCount}, Limit=${defaultCount}`;
        })
        .join('; ');

      const tolerationDescriptions = profile.spec.tolerations
        ?.map(({ key, value }) => `${key}:${value ?? 'null'}`)
        .join('; ');

      // Format nodeSelector information
      const nodeSelectorDescriptions = Object.entries(profile.spec.nodeSelector ?? {})
        .map(([key, value]) => `${key}:${value}`)
        .join('; ');

      return {
        key: profile.metadata.name,
        label: displayName,
        description: (
          <Split>
            <SplitItem>{identifierDescriptions}</SplitItem>
            <SplitItem>
              {tolerationDescriptions && `tolerations: ${tolerationDescriptions}`}
            </SplitItem>
            <SplitItem>
              {Object.keys(profile.spec.nodeSelector ?? {}).length
                ? `nodeSelector: ${nodeSelectorDescriptions}`
                : ''}
            </SplitItem>
          </Split>
        ),
      };
    });

    return formattedOptions;
  }, [filteredHardwareProfiles]);

  return (
    <>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          <SimpleSelect
            dataTestId="hardware-profile-select"
            previewDescription={false}
            options={options}
            value={hardwareProfileConfig.selectedProfile?.metadata.name}
            onChange={(key) => {
              const profile = filteredHardwareProfiles.find((hp) => hp.metadata.name === key);
              if (profile) {
                onChange(profile);
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

export default TrainingHardwareProfileSelect;
