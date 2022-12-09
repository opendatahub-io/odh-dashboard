import * as React from 'react';
import * as _ from 'lodash';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import AWSField from '../../../dataConnections/AWSField';
import { DataConnection, EnvVariableDataEntry } from '../../../types';
import { EMPTY_AWS_SECRET_DATA } from '../../../dataConnections/const';
import { isAWSValid } from '../../spawner/spawnerUtils';
import {
  assembleSecret,
  attachNotebookSecret,
  createSecret,
  replaceNotebookSecret,
  replaceSecret,
} from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { convertAWSSecretData } from './utils';
import ConnectedNotebookField from '../../../notebook/ConnectedNotebookField';
import useSelectedNotebooks from './useSelectedNotebooks';
import { getSecretsFromList, hasEnvFrom } from '../../../pvc/utils';

type ManageDataConnectionModalProps = {
  existingData?: DataConnection;
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
};

const ManageDataConnectionModal: React.FC<ManageDataConnectionModalProps> = ({
  isOpen,
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

    const promiseActions: Promise<K8sResourceCommon>[] = [];
    const secretName = assembledSecret.metadata.name;

    if (existingData) {
      if (AWSDataChanged) {
        promiseActions.push(replaceSecret(assembledSecret));
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
          ),
        ),
      );
    } else {
      promiseActions.push(createSecret(assembledSecret));
    }

    const notebooksToConnect = allAvailableNotebooks.filter((notebook) =>
      addedConnections.includes(notebook.metadata.name),
    );

    promiseActions.push(
      ...notebooksToConnect.map((notebook) =>
        attachNotebookSecret(notebook.metadata.name, projectName, secretName, hasEnvFrom(notebook)),
      ),
    );

    if (promiseActions.length > 0) {
      setErrorMessage('');
      setIsProgress(true);
      Promise.all(promiseActions)
        .then(() => onBeforeClose(true))
        .catch((e) => {
          setErrorMessage(e.message || 'An unknown error occurred');
          setIsProgress(false);
        });
    } else {
      onBeforeClose(false);
    }
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
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-dc" variant="primary" isDisabled={isDisabled} onClick={submit}>
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
              isRequired
              isMultiSelect
              selections={selectedNotebooks}
              onSelect={(selectionItems) => {
                setSelectedNotebooks(selectionItems);
              }}
              selectionHelperText="Connect to workbenches that do not already have a data connection"
            />
          </Form>
        </StackItem>
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
