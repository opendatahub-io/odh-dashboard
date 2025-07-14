import { FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import { HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP } from '#~/pages/hardwareProfiles/nodeResource/const.ts';

type ManageLocalQueueFieldSectionProps = {
  localQueueName: string;
  disabled: boolean;
  setLocalQueueName: (updatedQueueName: string) => void;
};

const ManageLocalQueueFieldSection: React.FC<ManageLocalQueueFieldSectionProps> = ({
  localQueueName,
  setLocalQueueName,
  disabled,
}) => (
  <FormGroup
    label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.LOCAL_QUEUE]}
    fieldId={ManageHardwareProfileSectionID.LOCAL_QUEUE}
    isRequired
    labelHelp={
      <DashboardHelpTooltip content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.localQueue} />
    }
  >
    <TextInput
      data-testid="local-queue-input"
      id="local-queue-input"
      value={localQueueName}
      onChange={(_, updatedQueueName) => {
        setLocalQueueName(updatedQueueName);
      }}
      isRequired
      isDisabled={disabled}
    />
  </FormGroup>
);

export default ManageLocalQueueFieldSection;
