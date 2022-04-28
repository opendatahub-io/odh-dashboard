import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { patchDataProjectNotebook } from '../../../services/notebookService';
import { Notebook, StatefulSet } from '../../../types';
import { useDispatch } from 'react-redux';
import { addNotification } from 'redux/actions/actions';

import '../DataProjects.scss';
import { getNotebookStatefulSet, getNotebookStatus } from '../../../utilities/notebookUtils';

type NotebookStatusSwitchProps = {
  notebook: Notebook;
  statefulSet: StatefulSet | undefined;
  loadNotebooks: () => void;
  watchNotebookStatus: () => { start: () => void; stop: () => void };
  updateInProgress: boolean;
  setUpdateInProgress: (updateInProgress: boolean) => void;
};

const NotebookStatusSwitch: React.FC<NotebookStatusSwitchProps> = React.memo(
  ({
    notebook,
    statefulSet,
    loadNotebooks,
    watchNotebookStatus,
    updateInProgress,
    setUpdateInProgress,
  }) => {
    const dispatch = useDispatch();
    const status = getNotebookStatus(notebook, statefulSet);
    const disabled = updateInProgress || (status !== 'Running' && status !== 'Stopped');

    React.useEffect(() => {
      watchNotebookStatus().start();
    }, []);

    const handleNotebookRunningChange = (isChecked: boolean) => {
      const updateData = isChecked ? { stopped: false } : { stopped: true };
      setUpdateInProgress(true);
      patchDataProjectNotebook(notebook.metadata.namespace, notebook.metadata.name, updateData)
        .then(() => {
          loadNotebooks();
          setUpdateInProgress(false);
          // setTimeout(watchNotebookStatus().start, 50);  // make sure the operator add 'notebooks.kubeflow.org/last-activity' to the notebook then fetch the data
        })
        .catch((e) => {
          dispatch(
            addNotification({
              status: 'danger',
              title: `Error switching notebook ${notebook.metadata.name} status.`,
              message: e.message,
              timestamp: new Date(),
            }),
          );
          setUpdateInProgress(false);
        });
    };

    return (
      <Switch
        id={`${notebook.metadata.name}-status-switch`}
        className="odh-data-projects__notebook-switch"
        label={status}
        isChecked={status === 'Running' || status === 'Starting'}
        onChange={handleNotebookRunningChange}
        isDisabled={disabled}
      />
    );
  },
);

NotebookStatusSwitch.displayName = 'NotebookStatusSwitch';

export default NotebookStatusSwitch;
