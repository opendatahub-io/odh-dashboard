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

type ConnectDataConnectionExistingWorkbenchModalProps = {
  dataConnection?: DataConnection;
  onClose: (successfulConnection: boolean) => void;
};

const ConnectDataConnectionExistingWorkbenchModal: React.FC<
  ConnectDataConnectionExistingWorkbenchModalProps
> = ({ dataConnection, onClose }) => {
  const [selectedNotebook, setSelectedNotebook] = React.useState<string>('');
  const canCreate = !!selectedNotebook;
  const { notebooks: nonConnectedNotebooks, loaded } = useNonConnectedNotebooks(
    ConnectedNotebookContext.DATA_CONNECTION,
    dataConnection ? getDataConnectionResourceName(dataConnection) : '',
  );

  const submit = () => {
    // get notebook
    // patch envForm
    // close
  };
  const onBeforeClose = (successfulConnection: boolean) => {
    onClose(successfulConnection);
  };

  return (
    <Modal
      title="Connect to existing workbench"
      variant="medium"
      isOpen={!!dataConnection}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-dc" variant="primary" isDisabled={!canCreate} onClick={submit}>
          Attach data connection
        </Button>,
        <Button key="cancel-dc" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        <SelectNotebookField
          loaded={loaded}
          notebooks={nonConnectedNotebooks}
          isRequired
          selection={selectedNotebook}
          onSelect={(selection) => setSelectedNotebook(selection || '')}
        />
      </Form>
    </Modal>
  );
};

export default ConnectDataConnectionExistingWorkbenchModal;
