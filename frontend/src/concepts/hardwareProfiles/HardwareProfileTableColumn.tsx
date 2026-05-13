import { Button, Spinner, Flex, FlexItem, Popover, Tooltip } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { NotebookKind } from '#~/k8sTypes';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils';
import { resourceTypeOf } from '#~/concepts/hardwareProfiles/utils';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton.tsx';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import HardwareProfileBindingStateLabel from './HardwareProfileBindingStateLabel';
import { HardwareProfileBindingState } from './const';
import { HardwareProfileBindingStateInfo } from './types';

type HardwareProfileTableColumnProps = {
  namespace: string;
  resource: NotebookKind | ModelResourceType;
  isActive?: boolean;
  bindingState: {
    bindingStateInfo: HardwareProfileBindingStateInfo | null;
    bindingStateLoaded: boolean;
    loadError: Error | undefined;
  };
};

const HardwareProfileTableColumn: React.FC<HardwareProfileTableColumnProps> = ({
  namespace,
  resource,
  isActive = false,
  bindingState,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const { bindingStateInfo, bindingStateLoaded, loadError } = bindingState;
  const hardwareProfile = bindingStateInfo?.profile;

  if (loadError && bindingStateInfo?.state !== HardwareProfileBindingState.DELETED) {
    return (
      <Popover
        alertSeverityVariant="danger"
        headerContent="Error loading hardware profile"
        bodyContent={loadError.message || 'An error occurred while loading the hardware profile.'}
        triggerAction="hover"
        data-testid="hardware-profile-column-error-popover"
      >
        <DashboardPopupIconButton
          icon={
            <ExclamationCircleIcon color="red" data-testid="hardware-profile-column-error-icon" />
          }
          aria-label="Error info"
        />
      </Popover>
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
            {hardwareProfile ? (
              <HardwareProfileDetailsPopover
                hardwareProfile={hardwareProfile}
                tolerations={hardwareProfile.spec.scheduling?.node?.tolerations}
                nodeSelector={hardwareProfile.spec.scheduling?.node?.nodeSelector}
                localQueueName={hardwareProfile.spec.scheduling?.kueue?.localQueueName}
                priorityClass={hardwareProfile.spec.scheduling?.kueue?.priorityClass}
                tableView
              />
            ) : (
              <Tooltip
                content="No matching hardware profile found, using existing settings. Default, min, and max values are not available. Expand the row to view the current resource settings."
                data-testid="hardware-profile-custom-tooltip"
              >
                <Button isInline variant="plain" aria-label="Custom hardware profile">
                  <i>Custom</i>
                </Button>
              </Tooltip>
            )}
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
