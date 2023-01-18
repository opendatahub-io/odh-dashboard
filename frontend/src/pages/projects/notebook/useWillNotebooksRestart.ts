import * as React from 'react';
import { ProjectDetailsContext } from '../ProjectDetailsContext';
import { NotebookState } from './types';

const useWillNotebooksRestart = (notebookNames: string[]): NotebookState[] => {
  const {
    notebooks: { data: notebookStates },
  } = React.useContext(ProjectDetailsContext);

  const notebookList = notebookNames.reduce<NotebookState[]>(
    (prev: NotebookState[], curr: string) => {
      const notebookState = notebookStates.find((state) => state.notebook.metadata.name === curr);
      if (notebookState?.isRunning || notebookState?.isStarting) {
        prev.push(notebookState);
      }
      return prev;
    },
    [],
  );

  return notebookList;
};

export default useWillNotebooksRestart;
