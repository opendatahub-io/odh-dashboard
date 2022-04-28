import { Container, Notebook, StatefulSet, StatefulSetList } from '../types';
import { ANNOTATION_NOTEBOOK_STARTED, ANNOTATION_NOTEBOOK_STOPPED } from './const';

export const getNotebookContainer = (
  notebook: Notebook | undefined | null,
): Container | undefined => {
  if (!notebook) {
    return;
  }
  const containers: Container[] = notebook.spec?.template?.spec?.containers || [];
  return containers.find((container) => container.name === notebook.metadata.name);
};

export const getNotebookStatefulSet = (
  notebook: Notebook | undefined | null,
  statefulSetList: StatefulSetList | undefined | null,
): StatefulSet | undefined => {
  if (!notebook) {
    return;
  }
  const retval = statefulSetList?.items.find((ss) => {
    return ss.metadata.ownerReferences.find((owner) => notebook.metadata.uid === owner.uid);
  });
  return retval;
};

export const getNotebookStatus = (
  notebook: Notebook | undefined | null,
  statefulSet: StatefulSet | undefined | null,
): string | undefined => {
  if (notebook?.metadata?.annotations?.[ANNOTATION_NOTEBOOK_STOPPED]) {
    if (statefulSet?.status?.currentReplicas > 0) {
      return 'Stopping';
    } else {
      return 'Stopped';
    }
  }

  if (notebook?.metadata?.annotations?.[ANNOTATION_NOTEBOOK_STARTED]) {
    if (statefulSet?.status?.readyReplicas > 0) {
      return 'Running';
    } else {
      return 'Starting';
    }
  }

  return 'Waiting';
};
