import * as React from 'react';
import * as _ from 'lodash-es';
import { Alert, Button, Form, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { DataConnection, EnvVariableDataEntry } from '~/pages/projects/types';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import {
  assembleSecret,
  attachNotebookSecret,
  createSecret,
  replaceNotebookSecret,
  replaceSecret,
} from '~/api';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ConnectedNotebookField from '~/pages/projects/notebook/ConnectedNotebookField';
import { getSecretsFromList, hasEnvFrom } from '~/pages/projects/pvc/utils';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import useSelectedNotebooks from './useSelectedNotebooks';
import { convertAWSSecretData } from './utils';

type ManageDataConnectionModalProps = {
  existingData?: DataConnection;
  onClose: (submitted: boolean) => void;
};

const ManageDataConnectionModal: React.FC<ManageDataConnectionModalProps> = ({
  onClose,
  existingData,
}) => {
  const [isProgress, setIsProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [awsData, setAWSData] = React.useState<EnvVariableDataEntry[]>(EMPTY_AWS_SECRET_DATA);
  const [
    notebooksLoaded,
    selectedNotebooks,
    setSelectedNotebooks,
    allAvailableNotebooks,
    connectedNotebooks,
  ] = useSelectedNotebooks(existingData);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;

  const removedConnections = _.difference(connectedNotebooks, selectedNotebooks);
  const addedConnections = _.difference(selectedNotebooks, connectedNotebooks);

  const restartNotebooks = useWillNotebooksRestart([...removedConnections, ...addedConnections]);

  const connectionChanged = removedConnections.length !== 0 || addedConnections.length !== 0;

  const AWSDataChanged = existingData
    ? !_.isEqual(convertAWSSecretData(existingData), awsData)
    : true;

  const isDisabled =
    isProgress || !isAWSValid(awsData) || (existingData && !AWSDataChanged && !connectionChanged);

  React.useEffect(() => {
    if (existingData) {
      setAWSData(convertAWSSecretData(existingData));
    }
  }, [existingData]);

  const submit = () => {
    const assembledSecret = assembleSecret(
      projectName,
      awsData.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      ),
      'aws',
      existingData?.data.metadata.name,
    );

    const secretName = assembledSecret.metadata.name;

    const runPromiseActions = async (dryRun: boolean) => {
      const promiseActions: Promise<K8sResourceCommon>[] = [];

      if (existingData) {
        if (AWSDataChanged) {
          promiseActions.push(replaceSecret(assembledSecret, { dryRun }));
        }

        const notebooksToDisconnect = allAvailableNotebooks.filter((notebook) =>
          removedConnections.includes(notebook.metadata.name),
        );

        promiseActions.push(
          ...notebooksToDisconnect.map((notebook) =>
            replaceNotebookSecret(
              notebook.metadata.name,
              projectName,
              getSecretsFromList(notebook).filter(({ secretRef: { name } }) => name !== secretName),
              { dryRun },
            ),
          ),
        );
      } else {
        promiseActions.push(createSecret(assembledSecret, { dryRun }));
      }

      const notebooksToConnect = allAvailableNotebooks.filter((notebook) =>
        addedConnections.includes(notebook.metadata.name),
      );

      promiseActions.push(
        ...notebooksToConnect.map((notebook) =>
          attachNotebookSecret(
            notebook.metadata.name,
            projectName,
            secretName,
            hasEnvFrom(notebook),
            { dryRun },
          ),
        ),
      );

      if (promiseActions.length > 0) {
        setErrorMessage('');
        setIsProgress(true);
        return Promise.all(promiseActions)
          .then(() => Promise.resolve())
          .catch((e) => {
            setErrorMessage(e.message || 'An unknown error occurred');
            setIsProgress(false);
            return Promise.reject();
          });
      }
      return Promise.reject();
    };

    runPromiseActions(true).then(() => runPromiseActions(false).then(() => onBeforeClose(true)));
  };

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setIsProgress(false);
    setErrorMessage('');
    setAWSData(EMPTY_AWS_SECRET_DATA);
    setSelectedNotebooks([]);
  };

  return (
    <Modal
      title={existingData ? 'Edit data connection' : 'Add data connection'}
      variant="medium"
      isOpen
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button
          data-testid="data-connection-submit-button"
          key="submit-dc"
          variant="primary"
          isDisabled={isDisabled}
          onClick={submit}
        >
          {existingData ? 'Update' : 'Add'} data connection
        </Button>,
        <Button key="cancel-dc" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <AWSField values={awsData} onUpdate={(data) => setAWSData(data)} />
            <ConnectedNotebookField
              loaded={notebooksLoaded}
              notebooks={allAvailableNotebooks}
              isMultiSelect
              selections={selectedNotebooks}
              onSelect={(selectionItems) => {
                setSelectedNotebooks(selectionItems);
              }}
              selectionHelperText="Connect to workbenches that do not already have a data connection"
            />
          </Form>
        </StackItem>
        {restartNotebooks.length !== 0 && (
          <StackItem>
            <NotebookRestartAlert notebooks={restartNotebooks} />
          </StackItem>
        )}
        {errorMessage && (
          <StackItem>
            <Alert isInline variant="danger" title="Error creating data connection">
              {errorMessage}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default ManageDataConnectionModal;
