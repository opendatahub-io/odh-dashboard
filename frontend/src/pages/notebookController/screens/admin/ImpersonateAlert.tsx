import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';

const ImpersonateAlert: React.FC = () => {
  const { impersonatedUsername, setImpersonating } = React.useContext(NotebookControllerContext);

  if (!impersonatedUsername) {
    return null;
  }

  return (
    <Alert
      variant="info"
      title={`This workbench is being created for "${impersonatedUsername}"`}
      isInline
      data-testid="impersonate-alert"
    >
      <Button
        data-id="return-admin-view-button"
        data-testid="return-admin-view-button"
        variant="link"
        onClick={() => setImpersonating()}
      >
        Return to administration view
      </Button>
    </Alert>
  );
};

export default ImpersonateAlert;
