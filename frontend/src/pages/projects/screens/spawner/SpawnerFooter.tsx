import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import {
  createNotebook,
  createNotebookWithoutStarting,
  patchPVCForNotebook,
} from '../../../../api';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { StartNotebookData, StorageData, EnvVariable } from '../../types';
import { createPvcDataForNotebook, createConfigMapsAndSecretsForNotebook } from './service';
import { useUser } from '../../../../redux/selectors';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

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
    createInProgress || !checkRequiredFieldsForNotebookStart(startNotebookData, storageData);
  const { username } = useUser();

  const onCreateNotebook = async (action: 'stop' | 'start') => {
    setCreateInProgress(true);
    const { volumes, volumeMounts, associatedPVCName } = await createPvcDataForNotebook(
      projectName,
      storageData,
    );
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, envVariables);
    const newStartData = { ...startNotebookData, volumes, volumeMounts, envFrom };
    const promise =
      action === 'start'
        ? createNotebook(newStartData, username)
        : createNotebookWithoutStarting(newStartData, username);

    await promise.then((notebook) => {
      const actions: Promise<K8sResourceCommon>[] = [];
      if (associatedPVCName) {
        actions.push(patchPVCForNotebook(associatedPVCName, projectName, notebook.metadata.name));
      }
      // TODO: do AWS Secrets

      const doNavigate = () => navigate(`/projects/${projectName}`);
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
