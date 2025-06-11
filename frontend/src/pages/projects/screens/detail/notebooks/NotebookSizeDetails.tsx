import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Icon,
  Popover,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { NotebookSize } from '#~/types';
import { formatMemory } from '#~/utilities/valueUnits';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import useAcceleratorCountWarning from '#~/pages/notebookController/screens/server/useAcceleratorCountWarning';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { AcceleratorResources } from './utils';

type NotebookSizeDetailsProps = {
  notebookSize: NotebookSize;
  acceleratorResources: AcceleratorResources;
};

const NotebookSizeDetails: React.FC<NotebookSizeDetailsProps> = ({
  notebookSize,
  acceleratorResources,
}) => {
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const {
    resources: { requests, limits },
  } = notebookSize;

  const acceleratorCountWarning = useAcceleratorCountWarning(
    acceleratorResources.requests,
    acceleratorResources.identifier,
  );

  const renderAcceleratorResource = (resourceValue?: number | string) => {
    if (!resourceValue) {
      return null;
    }

    return (
      <>
        , {resourceValue} accelerator{Number(resourceValue) > 1 ? 's' : ''}
        <Popover
          position="right"
          headerContent="Accelerator details"
          bodyContent={
            <Stack hasGutter>
              <StackItem>
                Accelerator details are used by Kubernetes to schedule the workload pod on the
                accelerator nodes.
              </StackItem>
              <StackItem>
                <DescriptionList isCompact isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Identifier</DescriptionListTerm>
                    <DescriptionListDescription>
                      {acceleratorResources.identifier && (
                        <ClipboardCopy
                          hoverTip="Copy"
                          clickTip="Copied"
                          variant="inline-compact"
                          data-testid="identifier-clipboard-copy"
                        >
                          {acceleratorResources.identifier}
                        </ClipboardCopy>
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
            </Stack>
          }
        >
          <>
            <DashboardPopupIconButton
              data-testid="accelerator-details-icon-button"
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
              style={{ paddingTop: 0, paddingBottom: 0 }}
            />
            {acceleratorCountWarning && (
              <Tooltip content={acceleratorCountWarning}>
                <Icon status="warning">
                  <ExclamationTriangleIcon />
                </Icon>
              </Tooltip>
            )}
          </>
        </Popover>
      </>
    );
  };

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>Limits</DescriptionListTerm>
        <DescriptionListDescription>
          {limits?.cpu ?? 'Unknown'} CPU, {formatMemory(limits?.memory) || 'Unknown'} Memory listed
          {!isHardwareProfileAvailable && renderAcceleratorResource(acceleratorResources.limits)}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Requests</DescriptionListTerm>
        <DescriptionListDescription>
          {requests?.cpu ?? 'Unknown'} CPU, {formatMemory(requests?.memory) || 'Unknown'} Memory
          requested
          {!isHardwareProfileAvailable && renderAcceleratorResource(acceleratorResources.requests)}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default NotebookSizeDetails;
