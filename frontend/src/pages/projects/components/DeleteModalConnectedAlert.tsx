import * as React from 'react';
import { NotebookKind } from '../../../k8sTypes';
import { Alert } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';

type DeleteModalConnectedAlertProps = {
  loaded: boolean;
  error?: Error;
  connectedNotebooks: NotebookKind[];
};

const DeleteModalConnectedAlert: React.FC<DeleteModalConnectedAlertProps> = ({
  loaded,
  error,
  connectedNotebooks,
}) => {
  const warning = 'This action cannot be undone.';
  if (!loaded) {
    return <>{warning}</>;
  }
  if (error) {
    <Alert variant="warning" isInline title="Cannot fetch connected workbenches">
      {error.message}
    </Alert>;
  }
  return connectedNotebooks.length !== 0 ? (
    <Alert
      variant="warning"
      isInline
      title={
        <>
          This resource is connected to{' '}
          {connectedNotebooks.map((notebook) => getNotebookDisplayName(notebook)).join(', ')}
        </>
      }
    >
      {`${warning} It will restart the workbenches it connects to.`}
    </Alert>
  ) : (
    <>{warning}</>
  );
};

export default DeleteModalConnectedAlert;
