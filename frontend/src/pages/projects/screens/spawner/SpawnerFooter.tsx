import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { createNotebook, createNotebookWithoutStarting } from '../../../../api';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { StartNotebookData, StorageData, EnvVariable } from '../../types';
import { createPvcDataForNotebook, createConfigMapsAndSecretsForNotebook } from './service';

type SpawnerFooterProps = {
  startNotebookData: StartNotebookData;
  storageData: StorageData;
  envVariables: EnvVariable[];
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({
  startNotebookData,
  storageData,
  envVariables,
}) => {
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const isButtonDisabled =
    !checkRequiredFieldsForNotebookStart(startNotebookData, storageData) || createInProgress;

  const onCreateNotebook = async (action: 'stop' | 'start') => {
    setCreateInProgress(true);
    const { volumes, volumeMounts } = await createPvcDataForNotebook(projectName, storageData);
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, envVariables);
    const newStartData = { ...startNotebookData, volumes, volumeMounts, envFrom };
    action === 'start'
      ? await createNotebook(newStartData)
      : await createNotebookWithoutStarting(newStartData);
    // TODO: patch annotation of PVCs and AWS Secrets for related notebook
    setCreateInProgress(false);
    navigate(`/projects/${projectName}`);
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
