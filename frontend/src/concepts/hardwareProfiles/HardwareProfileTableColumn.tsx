import { HelperText, HelperTextItem, Spinner, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { HardwareProfileKind, NotebookKind, InferenceServiceKind } from '#~/k8sTypes';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils.ts';
import { extractContainerResources, resourceTypeOf } from '#~/concepts/hardwareProfiles/utils.ts';
import { useHardwareProfileBindingState } from './useHardwareProfileBindingState.ts';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import HardwareProfileBindingStateLabel from './HardwareProfileBindingStateLabel.tsx';

type HardwareProfileTableColumnProps = {
  namespace: string;
  resource: NotebookKind | InferenceServiceKind;
  hardwareProfile?: HardwareProfileKind;
  loaded: boolean;
  loadError?: Error;
  isRunning?: boolean;
};

const HardwareProfileTableColumn: React.FC<HardwareProfileTableColumnProps> = ({
  namespace,
  resource,
  hardwareProfile,
  loaded,
  loadError,
  isRunning = false,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [bindingStateInfo, bindingStateLoaded] = useHardwareProfileBindingState(resource);
  const containerResources = extractContainerResources(resource);

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="error">Custom</HelperTextItem>
      </HelperText>
    );
  }
  if (!loaded) {
    return <Spinner size="md" />;
  }
  const displayName = hardwareProfile ? getHardwareProfileDisplayName(hardwareProfile) : 'Custom';
  const resourceType = resourceTypeOf(resource);
  return (
    <>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
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
        {isProjectScoped && hardwareProfile?.metadata.namespace === namespace && (
          <FlexItem>
            <ScopedLabel isProject color="blue" isCompact>
              {ScopedType.Project}
            </ScopedLabel>
          </FlexItem>
        )}
        {bindingStateLoaded && bindingStateInfo && bindingStateInfo.state && (
          <FlexItem>
            <HardwareProfileBindingStateLabel
              hardwareProfileBindingState={bindingStateInfo.state}
              hardwareProfileName={displayName}
              resourceType={resourceType}
              isRunning={isRunning}
            />
          </FlexItem>
        )}
      </Flex>
    </>
  );
};

export default HardwareProfileTableColumn;
