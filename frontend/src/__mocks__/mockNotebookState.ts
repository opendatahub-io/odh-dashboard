import * as _ from 'lodash-es';
import { NotebookKind } from '#~/k8sTypes';
import { NotebookState, NotebookRefresh } from '#~/pages/projects/notebook/types';

type MockConfigType = {
  isStarting?: boolean;
  isRunning?: boolean;
  isStopping?: boolean;
  isStopped?: boolean;
  runningPodUid?: string;
  refresh?: NotebookRefresh;
};

export const mockNotebookState = (
  notebook: NotebookKind,
  mockConfig?: MockConfigType,
): NotebookState => ({
  notebook,
  ..._.merge(
    {
      isStarting: false,
      isRunning: false,
      isStopping: false,
      isStopped: false,
      runningPodUid: '',
      refresh: () => Promise.resolve(),
    },
    mockConfig,
  ),
});
