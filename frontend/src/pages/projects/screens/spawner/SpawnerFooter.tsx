import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { createNotebook } from '../../../../api';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { StartNotebookData, StorageData, EnvVariable } from '../../types';
import { createPvcDataForNotebook, createConfigMapsAndSecretsForNotebook } from './service';
import { useUser } from '../../../../redux/selectors';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
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
  const { refreshAllProjectData } = React.useContext(ProjectDetailsContext);
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
  const isButtonDisabled =
    createInProgress ||
    !checkRequiredFieldsForNotebookStart(startNotebookData, storageData, envVariables);
  const { username } = useUser();

  const onCreateNotebook = async () => {
    setCreateInProgress(true);
    const { volumes, volumeMounts } = await createPvcDataForNotebook(projectName, storageData);
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, envVariables);
    const newStartData = { ...startNotebookData, volumes, volumeMounts, envFrom };

    createNotebook(newStartData, username).then(() => {
      const actions: Promise<K8sResourceCommon>[] = [];
      // TODO: do AWS Secrets

      const doNavigate = () => {
        refreshAllProjectData();
        navigate(`/projects/${projectName}`);
      };
      if (actions.length === 0) {
        doNavigate();
      }

      Promise.all(actions).then(doNavigate);
    });
  };

  return (
    <ActionList>
      <ActionListItem>
        <Button
          isDisabled={isButtonDisabled}
          variant="primary"
          id="create-button"
          onClick={onCreateNotebook}
        >
          Create workbench
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
