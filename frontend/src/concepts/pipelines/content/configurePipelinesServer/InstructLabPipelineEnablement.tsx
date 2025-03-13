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
    description="The InstructLab pipeline contains the steps and instructions that make up LAB-tuning runs."
  />
);

export default InstructLabPipelineEnablement;
