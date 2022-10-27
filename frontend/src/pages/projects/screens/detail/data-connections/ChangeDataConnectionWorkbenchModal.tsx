import * as React from 'react';
import { Button, Form, Modal } from '@patternfly/react-core';
import { DataConnection } from '../../../types';
import SelectNotebookField from '../../../notebook/SelectNotebookField';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '../../../notebook/useRelatedNotebooks';
import { getDataConnectionResourceName } from './utils';
import useNonConnectedNotebooks from '../../../notebook/useNonConnectedNotebooks';
import { attachNotebookSecret, replaceNotebookSecret } from '../../../../../api';
import { getSecretsFromList, hasEnvFrom } from '../../../pvc/utils';
import ExistingConnectedNotebooks from '../storage/ExistingConnectedNotebooks';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

type ChangeDataConnectionWorkbenchModalProps = {
  dataConnection?: DataConnection;
  onClose: (successfulConnection: boolean) => void;
};

const ChangeDataConnectionWorkbenchModal: React.FC<ChangeDataConnectionWorkbenchModalProps> = ({
  dataConnection,
  onClose,
}) => {
  const [inProgress, setInProgress] = React.useState(false);
  const [selectedNotebook, setSelectedNotebook] = React.useState<string>('');
  const resourceName = dataConnection ? getDataConnectionResourceName(dataConnection) : '';
  const { notebooks: connectedNotebooks, loaded: connectedLoaded } = useRelatedNotebooks(
    ConnectedNotebookContext.DATA_CONNECTION,
    resourceName,
  );
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);
  const { notebooks: nonConnectedNotebooks, loaded: nonConnectedLoaded } = useNonConnectedNotebooks(
    ConnectedNotebookContext.DATA_CONNECTION,
    resourceName,
  );
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const noExistingConnections = connectedNotebooks.length === 0;
  const changedExistingConnections = removedNotebooks.length > 0;
  const canSubmit =
    !inProgress &&
    (noExistingConnections ? !!selectedNotebook : changedExistingConnections || !!selectedNotebook);

  const submit = () => {
    if (resourceName && namespace) {
      const promiseActions: Promise<K8sResourceCommon>[] = [];

      if (selectedNotebook) {
        const relatedNotebook = nonConnectedNotebooks.find(
          (notebook) => notebook.metadata.name === selectedNotebook,
        );
        if (relatedNotebook) {
          const hasExistingEnvFrom = hasEnvFrom(relatedNotebook);
          promiseActions.push(
            attachNotebookSecret(selectedNotebook, namespace, resourceName, hasExistingEnvFrom),
          );
        }
      }

      if (connectedNotebooks.length > 0) {
        const disconnectedNotebooks = connectedNotebooks.filter((notebook) =>
          removedNotebooks.includes(notebook.metadata.name),
        );
        if (disconnectedNotebooks.length > 0) {
          disconnectedNotebooks.forEach((notebook) => {
            const secretEnvFroms = getSecretsFromList(notebook);
            const newSecretEnvFroms = secretEnvFroms.filter(
              ({ secretRef: { name } }) => name !== resourceName,
            );
            if (secretEnvFroms.length === newSecretEnvFroms.length) {
              // nothing changed, ignore -- shouldn't happen but no sense in patching
              return;
            }

            promiseActions.push(
              replaceNotebookSecret(notebook.metadata.name, namespace, newSecretEnvFroms),
            );
          });
        }
      }

      if (promiseActions.length > 0) {
        setInProgress(true);
        Promise.all(promiseActions).then(() => {
          onBeforeClose(true);
        });
      }
    }
  };
  const onBeforeClose = (successfulConnection: boolean) => {
    onClose(successfulConnection);
    setSelectedNotebook('');
    setInProgress(false);
  };

  return (
    <Modal
      title="Update connected workbenches"
      variant="medium"
      isOpen={!!dataConnection}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-dc" variant="primary" isDisabled={!canSubmit} onClick={submit}>
          Update connected workbenches
        </Button>,
        <Button key="cancel-dc" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        {!noExistingConnections && (
          <ExistingConnectedNotebooks
            loaded={connectedLoaded}
            connectedNotebooks={connectedNotebooks}
            onNotebookRemove={(removedNotebook) =>
              setRemovedNotebooks([...removedNotebooks, removedNotebook.metadata.name])
            }
          />
        )}
        <SelectNotebookField
          loaded={nonConnectedLoaded}
          notebooks={nonConnectedNotebooks}
          isRequired={noExistingConnections}
          selection={selectedNotebook}
          onSelect={(selection) => setSelectedNotebook(selection || '')}
          selectionHelperText="Connect to an existing workbench that does not have this data connection"
        />
      </Form>
    </Modal>
  );
};

export default ChangeDataConnectionWorkbenchModal;
