import { useTrackEvent } from '@odh-dashboard/analytics/react';
import * as React from 'react';
import { TextArea, Stack } from '@patternfly/react-core';

interface SystemInstructionFormGroupProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
  isDisabled?: boolean;
}

const SystemInstructionFormGroup: React.FunctionComponent<SystemInstructionFormGroupProps> = ({
  systemInstruction,
  onSystemInstructionChange,
  isDisabled = false,
}) => {
  const trackEvent = useTrackEvent();
  return (
    <Stack hasGutter>
      <TextArea
        id="system-instructions-input"
        type="text"
        value={systemInstruction}
        onFocus={() => {
          trackEvent('Playground Prompt Area Selected', {});
        }}
        onChange={(_event, value) => onSystemInstructionChange(value)}
        aria-label="System instructions input"
        rows={12}
        data-testid="system-instructions-input"
        isDisabled={isDisabled}
      />
    </Stack>
  );
};

export default SystemInstructionFormGroup;
