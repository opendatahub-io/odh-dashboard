import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { createNotebook, createNotebookWithoutStarting } from '../../../../api';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { StartNotebookData, StorageData } from '../../types';
import { patchStartNotebookDataWithPvc } from './service';

type SpawnerFooterProps = {
  startNotebookData: StartNotebookData;
  storageData: StorageData;
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({ startNotebookData, storageData }) => {
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const isButtonDisabled =
    !checkRequiredFieldsForNotebookStart(startNotebookData, storageData) || createInProgress;

  const onCreateNotebook = async (action: 'stop' | 'start') => {
    setCreateInProgress(true);
    const newStartData = await patchStartNotebookDataWithPvc(startNotebookData, storageData);
    if (action === 'start') {
      await createNotebook(newStartData);
    } else if (action === 'stop') {
      await createNotebookWithoutStarting(newStartData);
    }
    setCreateInProgress(false);
    // TODO: navigate to `/projects/${projectName}` after Notebook List is implemented
    navigate('/projects');
  };

  return (
    <ActionList>
      <ActionListItem>
        <Button
          isDisabled={isButtonDisabled}
          variant="primary"
          id="create-button"
          onClick={() => onCreateNotebook('stop')}
        >
          Create
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          isDisabled={isButtonDisabled}
          variant="secondary"
          id="create-and-start-button"
          onClick={() => onCreateNotebook('start')}
        >
          Create and start
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          id="cancel-button"
          onClick={() => navigate(`/projects/${projectName}`)}
        >
          Cancel
        </Button>
      </ActionListItem>
    </ActionList>
  );
};

export default SpawnerFooter;
