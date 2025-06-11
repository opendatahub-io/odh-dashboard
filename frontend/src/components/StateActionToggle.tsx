import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { ModelServingState } from '#~/pages/modelServing/screens/types.ts';

type Props = {
  currentState: NotebookState | ModelServingState;
  onStart: () => void;
  onStop: () => void;
  isDisabled?: boolean;
};

const StateActionToggle: React.FC<Props> = ({ currentState, onStart, onStop, isDisabled }) => {
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
