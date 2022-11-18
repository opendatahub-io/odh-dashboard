import * as React from 'react';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { NotebookKind } from '../../../k8sTypes';
import { getNotebookDisplayName } from '../utils';
import AddExistingStorageField from '../screens/spawner/storage/AddExistingStorageField';
import { useExistingStorageDataObjectForNotebook } from '../screens/spawner/storage/utils';
import MountPathField from './MountPathField';
import { getNotebookMountPaths } from '../notebook/utils';
import { attachNotebookPVC } from '../../../api';

type AddNotebookStorageProps = {
  notebook?: NotebookKind;
  onClose: (submitted: boolean) => void;
};

const AddNotebookStorage: React.FC<AddNotebookStorageProps> = ({ notebook, onClose }) => {
  const [existingData, setExistingData, resetDefaults] = useExistingStorageDataObjectForNotebook();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const notebookDisplayName = notebook ? getNotebookDisplayName(notebook) : 'this notebook';
  const inUseMountPaths = getNotebookMountPaths(notebook);

  const canSubmit =
    !isSubmitting &&
    !!existingData.name &&
    !!existingData.mountPath.value &&
    !existingData.mountPath.error;

  const beforeClose = (submitted: boolean) => {
    resetDefaults();
    onClose(submitted);
    setIsSubmitting(false);
  };

  const submit = () => {
    if (notebook) {
      setIsSubmitting(true);
      attachNotebookPVC(
        notebook.metadata.name,
        notebook.metadata.namespace,
        existingData.name,
        existingData.mountPath.value,
      )
        .then(() => {
          beforeClose(true);
        })
        .catch((e) => {
          setError(e);
          setIsSubmitting(false);
        });
    }
  };

  return (
    <Modal
      variant="small"
      title={`Add storage to ${notebookDisplayName}`}
      isOpen={!!notebook}
      onClose={() => beforeClose(false)}
      actions={[
        <Button key="submit" variant="primary" isDisabled={!canSubmit} onClick={submit}>
          Attach storage
        </Button>,
        <Button key="cancel" variant="secondary" onClick={() => beforeClose(false)}>
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
            <AddExistingStorageField
              data={{ storage: existingData.name }}
              setData={({ storage }) => setExistingData('name', storage)}
            />
            <MountPathField
              inUseMountPaths={inUseMountPaths}
              mountPath={existingData.mountPath}
              setMountPath={(mountPath) => setExistingData('mountPath', mountPath)}
            />
          </Form>
        </StackItem>
        {error && (
          <StackItem>
            <Alert isInline variant="danger" title="Error attaching storage">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default AddNotebookStorage;
