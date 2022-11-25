import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  createPvcDataForNotebook,
  createConfigMapsAndSecretsForNotebook,
  replaceRootVolumesForNotebook,
  updateConfigMapsAndSecretsForNotebook,
} from './service';
import { useUser } from '../../../../redux/selectors';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';

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
  const [errorMessage, setErrorMessage] = React.useState('');
  const {
    notebooks: { data },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);
  const { notebookName } = useParams();
  const notebookState = data.find(
    (notebookState) => notebookState.notebook.metadata.name === notebookName,
  );
  const editNotebook = notebookState?.notebook;
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState(false);
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
      const pvcDetails = await replaceRootVolumesForNotebook(
        projectName,
        editNotebook,
        storageData,
      ).catch(handleError);
      const envFrom = await updateConfigMapsAndSecretsForNotebook(
        projectName,
        editNotebook,
        envVariables,
      ).catch(handleError);

      if (!pvcDetails || !envFrom) {
        return;
      }
      const { volumes, volumeMounts } = pvcDetails;
      const newStartNotebookData = { ...startNotebookData, volumes, volumeMounts, envFrom };
      updateNotebook(editNotebook, newStartNotebookData, username)
        .then(redirect)
        .catch(handleError);
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
