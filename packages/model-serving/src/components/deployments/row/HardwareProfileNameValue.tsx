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
import useHardwareProfile from '@odh-dashboard/internal/pages/hardwareProfiles/useHardwareProfile';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';

const HardwareProfileNameValue = ({
  project,
  hardwareProfileConfig,
}: {
  project: string;
  hardwareProfileConfig: Parameters<typeof useHardwareProfileConfig>;
}): React.ReactNode => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const { dashboardNamespace } = useDashboardNamespace();
  const hardwareProfileName = hardwareProfileConfig[0];
  const hardwareProfileNamespace = hardwareProfileConfig[6];
  const [hardwareProfile, profileLoaded] = useHardwareProfile(
    hardwareProfileNamespace || dashboardNamespace,
    hardwareProfileName,
  );

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Hardware profile</DescriptionListTerm>
        <DescriptionListDescription data-testid="hardware-section">
          {!profileLoaded ? (
            'Loading...'
          ) : hardwareProfile ? (
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
          ) : (
            'No hardware profile selected'
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default HardwareProfileNameValue;
