import { Spinner, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { DashboardPopupIconButton, ScopedLabel } from '@odh-dashboard/ui-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { NotebookKind } from '@odh-dashboard/internal/k8sTypes';
import { getHardwareProfileDisplayName } from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/internal/concepts/kueue/index';
import type { HardwareProfileResource } from './types';
import { resourceTypeOf } from './utils';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import HardwareProfileBindingStateLabel from './HardwareProfileBindingStateLabel';
import { HardwareProfileBindingState } from './const';
import { HardwareProfileBindingStateInfo } from './types';

type HardwareProfileTableColumnProps = {
  namespace: string;
  resource: NotebookKind | HardwareProfileResource;
  isActive?: boolean;
  bindingState: {
    bindingStateInfo: HardwareProfileBindingStateInfo | null;
    bindingStateLoaded: boolean;
    loadError: Error | undefined;
  };
  onExpandRow?: () => void;
};

const HardwareProfileTableColumn: React.FC<HardwareProfileTableColumnProps> = ({
  namespace,
  resource,
  isActive = false,
  bindingState,
  onExpandRow,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const { bindingStateInfo, bindingStateLoaded, loadError } = bindingState;
  const hardwareProfile = bindingStateInfo?.profile;
  const directQueueName = resource.metadata.labels?.[KUEUE_QUEUE_LABEL];

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
            {/* When a hardware profile is matched it is authoritative — directQueueName on
                the notebook is intentionally ignored even if the HP has no kueue config. */}
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
              <HardwareProfileDetailsPopover
                localQueueName={directQueueName}
                onExpandRow={onExpandRow}
                tableView
              />
            )}
          </FlexItem>
        )}
        {isProjectScoped && hardwareProfile?.metadata.namespace === namespace && (
          <FlexItem>
            <ScopedLabel isProject color="blue" isCompact>
              Project-scoped
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
