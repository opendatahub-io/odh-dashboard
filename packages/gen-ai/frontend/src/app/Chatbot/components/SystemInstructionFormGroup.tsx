import * as React from 'react';
import { TextArea, Stack } from '@patternfly/react-core';
import {
  fireSimpleTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

interface SystemInstructionFormGroupProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const SystemInstructionFormGroup: React.FunctionComponent<SystemInstructionFormGroupProps> = ({
  systemInstruction,
  onSystemInstructionChange,
}) => {
  const [hasTrackedModification, setHasTrackedModification] = React.useState(false);

  return (
    <Stack hasGutter>
      <TextArea
        id="system-instructions-input"
        type="text"
        value={systemInstruction}
        onFocus={() => {
          fireSimpleTrackingEvent('Playground Prompt Area Selected');
        }}
        onChange={(_event, value) => {
          onSystemInstructionChange(value);
          // Only track once per session when user actually modifies the instructions
          if (!hasTrackedModification && value !== systemInstruction) {
            fireMiscTrackingEvent('Playground System Instructions Modified', {
              instructionsLength: value.length,
              hasInstructions: value.length > 0,
            });
            setHasTrackedModification(true);
          }
        }}
        aria-label="System instructions input"
        rows={8}
        data-testid="system-instructions-input"
      />
    </Stack>
  );
};

export default SystemInstructionFormGroup;
