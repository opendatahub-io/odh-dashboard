import * as React from 'react';
import { Alert, FormGroup, List, ListItem, Radio, Stack, StackItem } from '@patternfly/react-core';
import { SchedulingType } from '#~/types.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';

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
            <Stack>
              <StackItem>
                The selected workload allocation strategy defines how workloads are assigned to
                nodes.
              </StackItem>
              <StackItem>
                {!hideQueueOption ? (
                  <List>
                    <ListItem>
                      <b>Local queue</b> uses Kueue to automatically queue jobs and manage resources
                      based on workload priority.
                    </ListItem>
                    <ListItem>
                      <>
                        <b>Node selectors and tolerations</b> are manually added by administrators,
                        and are best for more fine-grained scheduling of workloads.
                      </>
                    </ListItem>
                  </List>
                ) : (
                  <StackItem>
                    <>
                      <b>Node selectors and tolerations</b> are manually added by administrators,
                      and are best for more fine-grained scheduling of workloads.
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
          <Radio
            id="local-queue"
            name={ManageHardwareProfileSectionID.ALLOCATION_STRATEGY}
            data-testid="local-queue-radio-input"
            label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.LOCAL_QUEUE]}
            isChecked={schedulingType === SchedulingType.QUEUE}
            onChange={() => setSchedulingType(SchedulingType.QUEUE)}
          />
          <Radio
            id="node-strategy"
            name={ManageHardwareProfileSectionID.ALLOCATION_STRATEGY}
            data-testid="node-strategy-radio-input"
            label="Node Selectors and tolerations"
            isChecked={schedulingType === SchedulingType.NODE}
            onChange={() => setSchedulingType(SchedulingType.NODE)}
          />
        </>
      ) : (
        <>Node selectors and tolerations</>
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
