import * as React from 'react';
import { Button } from '@patternfly/react-core';

export type StateActionToggleProps = {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  isLoading?: boolean;
};

const StateActionToggle: React.FC<StateActionToggleProps> = ({
  isPaused,
  onPause,
  onResume,
  isLoading = false,
}) => {
  return (
    <Button
      data-testid="state-action-toggle"
      variant="link"
      onClick={isPaused ? onResume : onPause}
      isInline
      isDisabled={isLoading}
      isLoading={isLoading}
    >
      {isPaused ? 'Resume' : 'Pause'}
    </Button>
  );
};

export default StateActionToggle;
