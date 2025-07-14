import * as React from 'react';
import { Button } from '@patternfly/react-core';

export type ToggleState = {
  isStarting?: boolean;
  isStopping?: boolean;
  isRunning: boolean;
  isStopped: boolean;
};

// Make the component generic, constrained to ToggleState
export type StateActionToggleProps<T extends ToggleState> = {
  currentState: T;
  onStart: () => void;
  onStop: () => void;
  isDisabled?: boolean;
  isDisabledWhileStarting?: boolean;
};

const StateActionToggle = <T extends ToggleState>({
  currentState,
  onStart,
  onStop,
  isDisabled,
  isDisabledWhileStarting = true,
}: StateActionToggleProps<T>): React.ReactElement => {
  const { isStarting, isRunning, isStopping } = currentState;
  const actionDisabled = isDisabled || isStopping || (isStarting && isDisabledWhileStarting);
  const runningState = isRunning || isStarting;
  return (
    <Button
      data-testid="state-action-toggle"
      variant="link"
      isDisabled={actionDisabled}
      onClick={runningState ? onStop : onStart}
      isInline
    >
      {runningState ? 'Stop' : 'Start'}
    </Button>
  );
};

export default StateActionToggle;
