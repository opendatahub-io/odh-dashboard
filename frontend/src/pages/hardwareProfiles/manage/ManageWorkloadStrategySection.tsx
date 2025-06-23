import * as React from 'react';
import {
  Alert,
  FormGroup,
  List,
  ListItem,
  Radio,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { SchedulingType } from '#~/types.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';

type ManageWorkloadStrategySectionProps = {
  schedulingType: SchedulingType | undefined;
  setSchedulingType: (type: SchedulingType) => void;
  kueueAvailable: boolean;
  queueRadioDisabled: boolean;
};

const ManageWorkloadStrategySection: React.FC<ManageWorkloadStrategySectionProps> = ({
  schedulingType,
  setSchedulingType,
  kueueAvailable,
  queueRadioDisabled,
}) => {
  const renderLocalQueueRadio = () => {
    const radio = (
      <Radio
        id="local-queue"
        name="allocation-strategy"
        data-testid="local-queue-radio-input"
        label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.LOCAL_QUEUE]}
        isChecked={schedulingType === SchedulingType.QUEUE}
        isDisabled={queueRadioDisabled}
        onChange={() => setSchedulingType(SchedulingType.QUEUE)}
      />
    );
    return queueRadioDisabled ? (
      <Tooltip
        data-testid="kueue-disabled-tooltip"
        content="This Kueue feature flag is disabled. Enable it to configure Kueue again."
      >
        {radio}
      </Tooltip>
    ) : (
      radio
    );
  };

  return (
    <>
      <FormGroup
        label={
          ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.ALLOCATION_STRATEGY]
        }
        fieldId="allocation-strategy"
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
                  <List>
                    <ListItem>
                      <b>Local queue</b> uses Kueue to automatically queue jobs and manage resources
                      based on workload priority.
                    </ListItem>
                    <ListItem>
                      <b>Node selectors and tolerations</b> are manually added by administrators,
                      and are best for more fine-grained scheduling of workloads.
                    </ListItem>
                  </List>
                </StackItem>
              </Stack>
            }
          />
        }
      >
        {renderLocalQueueRadio()}
        <Radio
          id="node-strategy"
          name="allocation-strategy"
          data-testid="node-strategy-radio-input"
          label="Node Selectors and tolerations"
          isChecked={schedulingType === SchedulingType.NODE}
          onChange={() => setSchedulingType(SchedulingType.NODE)}
        />
      </FormGroup>
      {!kueueAvailable && schedulingType === SchedulingType.QUEUE && (
        <Alert
          variant="info"
          title="The kueue feature flag is disabled. You will not be able to edit the local queue and workload priority. Enable it to configure Kueue again."
          isInline
          data-testid="kueue-disabled-alert"
        />
      )}
    </>
  );
};
export default ManageWorkloadStrategySection;
