import * as React from 'react';
import { NotebookState } from '~/pages/projects/notebook/types';
import NotebookStatusToggle from '~/pages/projects/notebook/NotebookStatusToggle';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import useNotebookImage from '~/pages/projects/screens/detail/notebooks/useNotebookImage';

type NotebookStateStatusProps = {
  enablePipelines: boolean;
  notebookState: NotebookState;
};

const NotebookStateStatus: React.FC<NotebookStateStatusProps> = ({
  notebookState,
  enablePipelines,
}) => {
  const [notebookImage] = useNotebookImage(notebookState.notebook);

  return (
    <NotebookStatusToggle
      notebookState={notebookState}
      doListen
      enablePipelines={enablePipelines}
      isDisabled={
        notebookImage?.imageAvailability === NotebookImageAvailability.DELETED &&
        !notebookState.isRunning
      }
    />
  );
};

export default NotebookStateStatus;
