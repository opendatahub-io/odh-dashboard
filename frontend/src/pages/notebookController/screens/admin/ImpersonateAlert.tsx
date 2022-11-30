import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const ImpersonateAlert: React.FC = () => {
  const { impersonatedUsername, setImpersonating } = React.useContext(NotebookControllerContext);

  if (!impersonatedUsername) return null;

  return (
    <Alert
      variant="info"
      title={`This notebook server is being created for "${impersonatedUsername}"`}
      isInline
    >
      <Button data-id="return-admin-view-button" variant="link" onClick={() => setImpersonating()}>
        Return to administration view
      </Button>
    </Alert>
  );
};

export default ImpersonateAlert;
