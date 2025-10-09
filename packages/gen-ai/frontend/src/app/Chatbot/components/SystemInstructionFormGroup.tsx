import * as React from 'react';
import { TextArea, Stack } from '@patternfly/react-core';
import { fireSimpleTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

interface SystemInstructionFormGroupProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const SystemInstructionFormGroup: React.FunctionComponent<SystemInstructionFormGroupProps> = ({
  systemInstruction,
  onSystemInstructionChange,
}) => (
  <Stack hasGutter>
    <TextArea
      id="system-instructions-input"
      type="text"
      value={systemInstruction}
      onFocus={() => {
        fireSimpleTrackingEvent('Playground Prompt Area Selected');
      }}
      onChange={(_event, value) => onSystemInstructionChange(value)}
      aria-label="System instructions input"
      rows={8}
    />
  </Stack>
);

export default SystemInstructionFormGroup;
