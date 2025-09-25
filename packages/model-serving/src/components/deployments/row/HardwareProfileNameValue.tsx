import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  isHardwareProfileEnabled,
  getHardwareProfileDisplayName,
} from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import ScopedLabel from '@odh-dashboard/internal/components/ScopedLabel';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';

const HardwareProfileNameValue = ({
  hardwareProfileConfig,
}: {
  hardwareProfileConfig: Parameters<typeof useHardwareProfileConfig>;
}): React.ReactNode => {
  const hardwareProfile = useHardwareProfileConfig(...hardwareProfileConfig);
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const project = hardwareProfile.initialHardwareProfile?.metadata.namespace;

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Hardware profile</DescriptionListTerm>
        <DescriptionListDescription data-testid="hardware-section">
          {!hardwareProfile.profilesLoaded ? (
            'Loading...'
          ) : hardwareProfile.initialHardwareProfile ? (
            <Flex gap={{ default: 'gapSm' }}>
              <FlexItem>
                {getHardwareProfileDisplayName(hardwareProfile.initialHardwareProfile)}
              </FlexItem>
              <FlexItem>
                {isProjectScopedAvailable &&
                  hardwareProfile.initialHardwareProfile.metadata.namespace === project && (
                    <ScopedLabel isProject color="blue" isCompact>
                      {ScopedType.Project}
                    </ScopedLabel>
                  )}
              </FlexItem>
              <Flex>
                {!isHardwareProfileEnabled(hardwareProfile.initialHardwareProfile)
                  ? '(disabled)'
                  : ''}
              </Flex>
            </Flex>
          ) : hardwareProfile.formData.useExistingSettings ? (
            'Unknown'
          ) : (
            'No hardware profile selected'
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default HardwareProfileNameValue;
