import * as React from 'react';
import { Alert, Button, Form, Modal } from '@patternfly/react-core';
//import { useCreateServingRuntimeObject } from '../utils';
//import { ProjectDetailsContext } from '../../../../projects/ProjectDetailsContext';

type ManageInferenceServiceModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
};

const ManageInferenceServiceModal: React.FC<ManageInferenceServiceModalProps> = ({
  isOpen,
  onClose,
}) => {
  //const [createData, setCreateData, resetData, sizes] = useCreateServingRuntimeObject();
  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | undefined>();

  //const { currentProject } = React.useContext(ProjectDetailsContext);
  //const namespace = currentProject.metadata.name;

  const canCreate = !actionInProgress;

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    //resetData();
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    setTimeout(() => {
      setActionInProgress(false);
      onBeforeClose(true);
    }, 1000);
  };

  return (
    <Modal
      title="Deploy model"
      description="Configure properties for deploying your model"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-model" variant="primary" isDisabled={!canCreate} onClick={submit}>
          Configure
        </Button>,
        <Button key="cancel-model" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      ></Form>
      {error && (
        <Alert isInline variant="danger" title="Error creating model server">
          {error.message}
        </Alert>
      )}
    </Modal>
  );
};

export default ManageInferenceServiceModal;
