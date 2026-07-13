import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import DashboardHelpTooltip from '@odh-dashboard/internal/concepts/dashboard/DashboardHelpTooltip.tsx';
import { ValidationContext } from '@odh-dashboard/ui-core/utilities/useValidation';
import { ManageHardwareProfileSectionID } from './types.ts';
import { ManageHardwareProfileSectionTitles } from '../const.tsx';
import {
  HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP,
  LOCAL_QUEUE_FIELD_DESCRIPTION,
  LOCAL_QUEUE_NAMES_CASE_SENSITIVE_HELPER,
} from '../nodeResource/const.ts';

type ManageLocalQueueFieldSectionProps = {
  localQueueName: string;
  disabled: boolean;
  setLocalQueueName: (updatedQueueName: string) => void;
};

const ManageLocalQueueFieldSection: React.FC<ManageLocalQueueFieldSectionProps> = ({
  localQueueName,
  setLocalQueueName,
  disabled,
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const localQueueNameIssues = getAllValidationIssues(['scheduling', 'kueue', 'localQueueName']);
  const validationError =
    localQueueNameIssues.length > 0 ? localQueueNameIssues[0].message : undefined;

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.LOCAL_QUEUE]}
      fieldId={ManageHardwareProfileSectionID.LOCAL_QUEUE}
      isRequired
      labelHelp={
        <DashboardHelpTooltip content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.localQueue} />
      }
    >
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{LOCAL_QUEUE_FIELD_DESCRIPTION}</HelperTextItem>
        </HelperText>
      </FormHelperText>
      <TextInput
        data-testid="local-queue-input"
        id="local-queue-input"
        value={localQueueName}
        onChange={(_, updatedQueueName) => {
          setLocalQueueName(updatedQueueName);
        }}
        isRequired
        isDisabled={disabled}
        validated={validationError ? 'error' : 'default'}
      />
      <FormHelperText>
        <HelperText>
          {validationError ? (
            <HelperTextItem variant="error" data-testid="local-queue-name-error">
              {validationError}
            </HelperTextItem>
          ) : (
            <HelperTextItem>{LOCAL_QUEUE_NAMES_CASE_SENSITIVE_HELPER}</HelperTextItem>
          )}
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ManageLocalQueueFieldSection;
