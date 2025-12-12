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
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';
import type { UseAssignHardwareProfileResult } from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import type { ModelResourceType } from 'extension-points';

const HardwareProfileNameValue = ({
  project,
  hardwareProfile: hardwareProfileResult,
}: {
  project: string;
  hardwareProfile: UseAssignHardwareProfileResult<ModelResourceType>;
}): React.ReactNode => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const hardwareProfile =
    hardwareProfileResult.podSpecOptionsState.hardwareProfile.formData.selectedProfile;
  const { profilesLoaded, profilesLoadError } =
    hardwareProfileResult.podSpecOptionsState.hardwareProfile;

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Hardware profile</DescriptionListTerm>
        <DescriptionListDescription data-testid="hardware-section">
          {!hardwareProfile || profilesLoadError ? (
            'Unknown'
          ) : !profilesLoaded ? (
            'Loading...'
          ) : (
            <Flex gap={{ default: 'gapSm' }}>
              <FlexItem>{getHardwareProfileDisplayName(hardwareProfile)}</FlexItem>
              <FlexItem>
                {isProjectScopedAvailable && hardwareProfile.metadata.namespace === project && (
                  <ScopedLabel isProject color="blue" isCompact>
                    {ScopedType.Project}
                  </ScopedLabel>
                )}
              </FlexItem>
              <Flex>{!isHardwareProfileEnabled(hardwareProfile) ? '(disabled)' : ''}</Flex>
            </Flex>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default HardwareProfileNameValue;
