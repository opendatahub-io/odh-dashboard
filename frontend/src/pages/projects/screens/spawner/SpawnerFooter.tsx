import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
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

  const onUpdateNotebook = async () => {
    if (editNotebook) {
      updateNotebook(editNotebook, startNotebookData, username).then(redirect);
    }
  };

  const onCreateNotebook = async () => {
    setCreateInProgress(true);
    const { volumes, volumeMounts } = await createPvcDataForNotebook(projectName, storageData);
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, envVariables);
    const newStartData = { ...startNotebookData, volumes, volumeMounts, envFrom };

    createNotebook(newStartData, username).then(redirect);
  };

  return (
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
  );
};

export default SpawnerFooter;
