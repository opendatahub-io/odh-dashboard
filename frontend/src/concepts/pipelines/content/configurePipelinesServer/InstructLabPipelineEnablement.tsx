import React from 'react';
import { Checkbox } from '@patternfly/react-core';

type InstructLabPipelineEnablementProps = {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const InstructLabPipelineEnablement: React.FC<InstructLabPipelineEnablementProps> = ({
  isEnabled,
  setEnabled,
}) => (
  // TODO: add description for the instruct lab pipeline
  <Checkbox
    label="InstructLab pipeline"
    isChecked={isEnabled}
    onChange={(_, checked) => {
      setEnabled(checked);
    }}
    aria-label="instructLabEnabledCheckbox"
    id="instructlab-enabled-checkbox"
    data-testid="instructlab-enabled-checkbox"
    name="instructLabEnabledCheckbox"
  />
);

export default InstructLabPipelineEnablement;
