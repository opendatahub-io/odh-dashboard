import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const ImpersonateAlert: React.FC = () => {
  const { impersonatedUsername, setImpersonating } = React.useContext(NotebookControllerContext);

  if (!impersonatedUsername) return null;

  return (
    <Alert
      className="odh-notebook-controller__page-content"
      variant="info"
      title={`This notebook server is being created for "${impersonatedUsername}"`}
      isInline
    >
      <Button variant="link" onClick={() => setImpersonating()}>
        Return to administration view
      </Button>
    </Alert>
  );
};

export default ImpersonateAlert;
