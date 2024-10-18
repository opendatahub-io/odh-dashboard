import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import useNotebookImage from '~/pages/projects/screens/detail/notebooks/useNotebookImage';
import { NotebookState } from './types';

type Props = {
  notebookState: NotebookState;
  onStart: () => void;
  onStop: () => void;
  isDisabled?: boolean;
};

const NotebookStateAction: React.FC<Props> = ({ notebookState, onStart, onStop, isDisabled }) => {
  const { notebook, isStarting, isRunning, isStopping } = notebookState;
  const [notebookImage] = useNotebookImage(notebook);

  const actionDisabled =
    isDisabled ||
    isStopping ||
    (notebookImage?.imageAvailability === NotebookImageAvailability.DELETED && !isRunning);

  return isStarting || isRunning ? (
    <Button
      data-testid="notebook-stop-action"
      variant="link"
      isInline
      isDisabled={actionDisabled}
      onClick={onStop}
    >
      Stop
    </Button>
  ) : (
    <Button
      data-testid="notebook-start-action"
      variant="link"
      isInline
      isDisabled={actionDisabled}
      onClick={onStart}
    >
      Start
    </Button>
  );
};

export default NotebookStateAction;
