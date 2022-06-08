import * as React from 'react';
import { Button, ActionList, ActionListItem } from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import SpawnerPage from './SpawnerPage';
import NotebookServerDetails from './NotebookServerDetails';
import AppContext from 'app/AppContext';

export const NotebookController: React.FC = () => {
  const isEmpty = false;
  const { setIsNavOpen } = React.useContext(AppContext);

  React.useEffect(() => {
    setIsNavOpen(false);
  }, [setIsNavOpen]);

  return (
    <ApplicationsPage
      title={isEmpty ? 'Start a Notebook server' : 'Notebook server control panel'}
      description={isEmpty ? 'Select options for your Notebook server.' : null}
      loaded={true}
      empty={isEmpty}
      emptyStatePage={<SpawnerPage imageStreams={[]} odhConfig={null} />}
    >
      <div className="odh-notebook-controller__page">
        <ActionList>
          <ActionListItem>
            <Button variant="primary">Stop notebook server</Button>
          </ActionListItem>
          <ActionListItem>
            <Button variant="secondary">Return to server</Button>
          </ActionListItem>
        </ActionList>
        <NotebookServerDetails />
      </div>
    </ApplicationsPage>
  );
};
NotebookController.displayName = 'NotebookController';

export default NotebookController;
