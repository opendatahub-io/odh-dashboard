import * as React from 'react';
import { Button } from '@patternfly/react-core';

export type StateActionToggleProps = {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
};

const StateActionToggle: React.FC<StateActionToggleProps> = ({
  isPaused,
  onPause,
  onResume,
  isLoading = false,
  isDisabled = false,
}) => {
  return (
    <Button
      data-testid="state-action-toggle"
      variant="link"
      onClick={isPaused ? onResume : onPause}
      isInline
      isDisabled={isLoading || isDisabled}
      isLoading={isLoading}
    >
      {isPaused ? 'Resume' : 'Pause'}
    </Button>
  );
};

export default StateActionToggle;
