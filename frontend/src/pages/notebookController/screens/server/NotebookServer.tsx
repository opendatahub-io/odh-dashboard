import * as React from 'react';
import { Button, ActionList, ActionListItem } from '@patternfly/react-core';
import ApplicationsPage from '../../../ApplicationsPage';
import NotebookServerDetails from './NotebookServerDetails';
import { useWatchImages } from '../../../../utilities/useWatchImages';
import { useWatchNotebook } from '../../../../utilities/useWatchNotebook';
import { checkNotebookRunning } from '../../../../utilities/notebookControllerUtils';
import { Redirect, useHistory } from 'react-router-dom';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import useNamespaces from '../../useNamespaces';
import StopServerModal from './StopServerModal';
import useCurrentUser from '../../useCurrentUser';
import { Notebook } from '../../../../types';

import '../../NotebookController.scss';

export const NotebookServer: React.FC = () => {
  const history = useHistory();
  const { images } = useWatchImages();
  const { impersonatingUser } = React.useContext(NotebookControllerContext);
  const username = useCurrentUser();
  const { notebookNamespace: projectName } = useNamespaces();
  const { notebook, loaded, loadError } = useWatchNotebook(projectName, username);

  const [notebooksToStop, setNotebooksToStop] = React.useState<Notebook[]>([]);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean) => {
      setNotebooksToStop([]);
      if (didStop) {
        history.push(`/notebookController/spawner`);
      }
    },
    [setNotebooksToStop, history],
  );

  return (
    <>
      {impersonatingUser && <ImpersonateAlert />}
      <ApplicationsPage
        title="Notebook server control panel"
        description={null}
        loaded={loaded}
        loadError={loadError}
        empty={loaded && !checkNotebookRunning(notebook)}
        emptyStatePage={<Redirect to={`/notebookController/spawner`} />}
      >
        {notebook && (
          <div className="odh-notebook-controller__page">
            <ActionList>
              <ActionListItem onClick={() => setNotebooksToStop([notebook])}>
                <Button variant="primary">Stop notebook server</Button>
              </ActionListItem>
              <ActionListItem
                onClick={() => {
                  if (notebook.metadata.annotations?.['opendatahub.io/link']) {
                    window.location.href = notebook.metadata.annotations['opendatahub.io/link'];
                  }
                }}
              >
                <Button variant="secondary">Return to server</Button>
              </ActionListItem>
            </ActionList>
            <NotebookServerDetails notebook={notebook} images={images} />
            <StopServerModal notebooksToStop={notebooksToStop} onNotebooksStop={onNotebooksStop} />
          </div>
        )}
      </ApplicationsPage>
    </>
  );
};

NotebookServer.displayName = 'NotebookController';

export default NotebookServer;
