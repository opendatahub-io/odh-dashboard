import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { createNotebook, updateNotebook } from '../../../../api';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { StartNotebookData, StorageData, EnvVariable } from '../../types';
import { createPvcDataForNotebook, createConfigMapsAndSecretsForNotebook } from './service';
import { useUser } from '../../../../redux/selectors';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { NotebookKind } from '../../../../k8sTypes';

type SpawnerFooterProps = {
  editNotebook?: NotebookKind;
  startNotebookData: StartNotebookData;
  storageData: StorageData;
  envVariables: EnvVariable[];
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({
  editNotebook,
  startNotebookData,
  storageData,
  envVariables,
}) => {
  const [errorMessage, setErrorMessage] = React.useState('');
  const { refreshAllProjectData } = React.useContext(ProjectDetailsContext);
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const isButtonDisabled =
    createInProgress ||
    !checkRequiredFieldsForNotebookStart(startNotebookData, storageData, envVariables);
  const { username } = useUser();

  const redirect = () => {
    refreshAllProjectData();
    navigate(`/projects/${projectName}`);
  };
  const handleError = (e) => {
    setErrorMessage(e.message || 'Error creating workbench');
    setCreateInProgress(false);
  };
  const handleStart = () => {
    setErrorMessage('');
    setCreateInProgress(true);
  };

  const onUpdateNotebook = async () => {
    handleStart();
    if (editNotebook) {
      updateNotebook(editNotebook, startNotebookData, username).then(redirect);
    }
  };

  const onCreateNotebook = async () => {
    handleStart();

    const pvcDetails = await createPvcDataForNotebook(projectName, storageData).catch(handleError);
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, envVariables).catch(
      handleError,
    );

    if (!pvcDetails || !envFrom) {
      // Error happened, let the error code handle it
      return;
    }

    const { volumes, volumeMounts } = pvcDetails;
    const newStartData = { ...startNotebookData, volumes, volumeMounts, envFrom };

    createNotebook(newStartData, username).then(redirect).catch(handleError);
  };

  return (
    <Stack hasGutter>
      {errorMessage && (
        <StackItem>
          <Alert isInline variant="danger" title="Error creating workbench">
            {errorMessage}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isButtonDisabled}
              variant="primary"
              id="create-button"
              onClick={editNotebook ? onUpdateNotebook : onCreateNotebook}
            >
              {editNotebook ? 'Update' : 'Create'} workbench
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
      </StackItem>
    </Stack>
  );
};

export default SpawnerFooter;
