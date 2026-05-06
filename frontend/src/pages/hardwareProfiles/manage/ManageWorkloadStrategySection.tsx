import * as React from 'react';
import { Alert, FormGroup, List, ListItem, Radio, Stack, StackItem } from '@patternfly/react-core';
import { SchedulingType } from '#~/types.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import {
  LOCAL_QUEUE_WORKLOAD_ALLOCATION_STRATEGY_RADIO_LABEL,
  ManageHardwareProfileSectionTitles,
} from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';
import {
  HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP,
  NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_LABEL,
  NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_POPOVER_NAME,
} from '#~/pages/hardwareProfiles/nodeResource/const.ts';

type ManageWorkloadStrategySectionProps = {
  schedulingType: SchedulingType | undefined;
  setSchedulingType: (type: SchedulingType) => void;
  hideQueueOption: boolean;
  disableQueueOption: boolean;
};

const ManageWorkloadStrategySection: React.FC<ManageWorkloadStrategySectionProps> = ({
  schedulingType,
  setSchedulingType,
  hideQueueOption,
  disableQueueOption,
}) => (
  <>
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.ALLOCATION_STRATEGY]}
      fieldId={ManageHardwareProfileSectionID.ALLOCATION_STRATEGY}
      isInline
      labelHelp={
        <DashboardHelpTooltip
          content={
            <Stack hasGutter={hideQueueOption}>
              <StackItem>
                The selected workload allocation strategy defines how workloads are assigned to
                nodes.
              </StackItem>
              <StackItem>
                {!hideQueueOption ? (
                  <List>
                    <ListItem>
                      <b>
                        {
                          ManageHardwareProfileSectionTitles[
                            ManageHardwareProfileSectionID.LOCAL_QUEUE
                          ]
                        }
                      </b>{' '}
                      uses Kueue to automatically queue jobs and manage resources based on workload
                      priority.
                    </ListItem>
                    <ListItem>
                      <>
                        <b>{NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_POPOVER_NAME}</b> are manually
                        added by administrators, and are best for more fine-grained scheduling of
                        workloads.
                      </>
                    </ListItem>
                  </List>
                ) : (
                  <StackItem>
                    <>
                      <b>{NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_POPOVER_NAME}</b> are manually
                      added by administrators, and are best for more fine-grained scheduling of
                      workloads.
                    </>
                  </StackItem>
                )}
              </StackItem>
            </Stack>
          }
        />
      }
    >
      {!hideQueueOption ? (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Radio
              id="local-queue"
              name={ManageHardwareProfileSectionID.ALLOCATION_STRATEGY}
              data-testid="local-queue-radio-input"
              label={LOCAL_QUEUE_WORKLOAD_ALLOCATION_STRATEGY_RADIO_LABEL}
              isChecked={schedulingType === SchedulingType.QUEUE}
              onChange={() => setSchedulingType(SchedulingType.QUEUE)}
            />
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Radio
              id="node-strategy"
              name={ManageHardwareProfileSectionID.ALLOCATION_STRATEGY}
              data-testid="node-strategy-radio-input"
              label={NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_LABEL}
              isChecked={schedulingType === SchedulingType.NODE}
              onChange={() => setSchedulingType(SchedulingType.NODE)}
            />
            <DashboardHelpTooltip
              content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.nodeSelectorsAndTolerations}
            />
          </span>
        </>
      ) : (
        <>
          {NODE_SELECTORS_AND_TOLERATIONS_STRATEGY_LABEL}{' '}
          <DashboardHelpTooltip
            content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.nodeSelectorsAndTolerations}
          />
        </>
      )}
    </FormGroup>
    {disableQueueOption && (
      <Alert
        variant="info"
        title="The kueue feature flag is disabled. You will not be able to edit the local queue and workload priority. Enable it to configure Kueue again."
        isInline
        data-testid="kueue-disabled-alert"
      />
    )}
  </>
);
export default ManageWorkloadStrategySection;
