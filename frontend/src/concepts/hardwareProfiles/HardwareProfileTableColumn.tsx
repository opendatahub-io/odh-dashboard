import { HelperText, HelperTextItem, Spinner, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { NotebookKind } from '#~/k8sTypes';
import { ContainerResources } from '#~/types';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils';
import { resourceTypeOf } from '#~/concepts/hardwareProfiles/utils';
import { useHardwareProfileBindingState } from './useHardwareProfileBindingState';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import HardwareProfileBindingStateLabel from './HardwareProfileBindingStateLabel';
import { HardwareProfileBindingState } from './const';

type HardwareProfileTableColumnProps = {
  namespace: string;
  resource: NotebookKind | ModelResourceType;
  containerResources: ContainerResources | undefined;
  isActive?: boolean;
};

const HardwareProfileTableColumn: React.FC<HardwareProfileTableColumnProps> = ({
  namespace,
  resource,
  containerResources,
  isActive = false,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [bindingStateInfo, bindingStateLoaded, loadError] =
    useHardwareProfileBindingState(resource);

  const hardwareProfile = bindingStateInfo?.profile;

  if (loadError && bindingStateInfo?.state !== HardwareProfileBindingState.DELETED) {
    return (
      <HelperText>
        <HelperTextItem variant="error">Custom</HelperTextItem>
      </HelperText>
    );
  }
  if (!bindingStateLoaded) {
    return <Spinner size="md" />;
  }
  const displayName = hardwareProfile ? getHardwareProfileDisplayName(hardwareProfile) : 'Custom';
  const resourceType = resourceTypeOf(resource);
  return (
    <>
      <Flex
        spaceItems={{ default: 'spaceItemsSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
        data-testid="hardware-profile-table-column"
      >
        {bindingStateInfo?.state !== HardwareProfileBindingState.DELETED && (
          <FlexItem>
            <HardwareProfileDetailsPopover
              hardwareProfile={hardwareProfile}
              resources={containerResources}
              tolerations={hardwareProfile?.spec.scheduling?.node?.tolerations}
              nodeSelector={hardwareProfile?.spec.scheduling?.node?.nodeSelector}
              localQueueName={hardwareProfile?.spec.scheduling?.kueue?.localQueueName}
              priorityClass={hardwareProfile?.spec.scheduling?.kueue?.priorityClass}
              tableView={true}
            />
          </FlexItem>
        )}
        {isProjectScoped && hardwareProfile?.metadata.namespace === namespace && (
          <FlexItem>
            <ScopedLabel isProject color="blue" isCompact>
              {ScopedType.Project}
            </ScopedLabel>
          </FlexItem>
        )}
        {bindingStateInfo?.state && (
          <FlexItem>
            <HardwareProfileBindingStateLabel
              hardwareProfileBindingState={bindingStateInfo.state}
              hardwareProfileName={displayName}
              resourceType={resourceType}
              isRunning={isActive}
            />
          </FlexItem>
        )}
      </Flex>
    </>
  );
};

export default HardwareProfileTableColumn;
