import * as React from 'react';
import { NotebookState } from '~/pages/projects/notebook/types';
import NotebookStatusToggle from '~/pages/projects/notebook/NotebookStatusToggle';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import useNotebookImage from '~/pages/projects/screens/detail/notebooks/useNotebookImage';

type NotebookStateColumnProps = {
  enablePipelines: boolean;
  notebookState: NotebookState;
};

const NotebookStateColumn: React.FC<NotebookStateColumnProps> = ({
  notebookState,
  enablePipelines,
}) => {
  const [notebookImage] = useNotebookImage(notebookState.notebook);

  return (
    <NotebookStatusToggle
      notebookState={notebookState}
      doListen={false}
      enablePipelines={enablePipelines}
      isDisabled={
        notebookImage?.imageAvailability === NotebookImageAvailability.DELETED &&
        !notebookState.isRunning
      }
    />
  );
};

export default NotebookStateColumn;
