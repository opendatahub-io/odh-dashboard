import * as React from 'react';
import { Button } from '@patternfly/react-core';

// Define a minimal interface for the required state fields
export interface ToggleState {
  isStarting: boolean;
  isStopping: boolean;
  isRunning: boolean;
  isStopped: boolean;
}

// Make the component generic, constrained to ToggleState
export type StateActionToggleProps<T extends ToggleState> = {
  currentState: T;
  onStart: () => void;
  onStop: () => void;
  isDisabled?: boolean;
};

const StateActionToggle = <T extends ToggleState>({
  currentState,
  onStart,
  onStop,
  isDisabled,
}: StateActionToggleProps<T>): React.ReactElement => {
  const { isStarting, isRunning, isStopping } = currentState;
  const actionDisabled = isDisabled || isStopping || isStarting;

  return isStarting || isRunning ? (
    <Button
      data-testid="stop-action-toggle"
      variant="link"
      isDisabled={actionDisabled}
      onClick={onStop}
      style={{ paddingTop: 0, paddingBottom: 0 }}
    >
      Stop
    </Button>
  ) : (
    <Button
      data-testid="start-action-toggle"
      variant="link"
      isDisabled={actionDisabled}
      onClick={onStart}
      style={{ paddingTop: 0, paddingBottom: 0 }}
    >
      Start
    </Button>
  );
};

export default StateActionToggle;
