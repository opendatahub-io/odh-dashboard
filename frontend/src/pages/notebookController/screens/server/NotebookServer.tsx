import * as React from 'react';
import { Button, ActionList, ActionListItem } from '@patternfly/react-core';
import ApplicationsPage from '../../../ApplicationsPage';
import NotebookServerDetails from './NotebookServerDetails';
import { useWatchImages } from '../../../../utilities/useWatchImages';
import { useWatchNotebook } from 'utilities/useWatchNotebook';
import { deleteNotebook } from '../../../../services/notebookService';
import {
  checkNotebookRunning,
  generateNotebookNameFromUsername,
} from '../../../../utilities/notebookControllerUtils';
import { Redirect, useHistory } from 'react-router-dom';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import { useUser } from '../../../../redux/selectors';
import useNamespaces from '../../useNamespaces';

import '../../NotebookController.scss';

export const NotebookServer: React.FC = React.memo(() => {
  const history = useHistory();
  const { images } = useWatchImages();
  const { currentUserState, impersonatingUser } = React.useContext(NotebookControllerContext);
  const { username: stateUsername } = useUser();
  const username = currentUserState.user || stateUsername;
  const { notebookNamespace: projectName } = useNamespaces();
  const { notebook, loaded, loadError } = useWatchNotebook(projectName, username);

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
              <ActionListItem
                onClick={() => {
                  deleteNotebook(projectName, generateNotebookNameFromUsername(username))
                    .then(() => {
                      history.push(`/notebookController/spawner`);
                    })
                    .catch((e) => console.error(e));
                }}
              >
                <Button variant="primary">Stop notebook server</Button>
              </ActionListItem>
              <ActionListItem
                onClick={() => {
                  if (notebook?.metadata.annotations?.['opendatahub.io/link']) {
                    window.location.href = notebook.metadata.annotations['opendatahub.io/link'];
                  }
                }}
              >
                <Button variant="secondary">Return to server</Button>
              </ActionListItem>
            </ActionList>
            <NotebookServerDetails notebook={notebook} images={images} />
          </div>
        )}
      </ApplicationsPage>
    </>
  );
});

NotebookServer.displayName = 'NotebookController';

export default NotebookServer;
