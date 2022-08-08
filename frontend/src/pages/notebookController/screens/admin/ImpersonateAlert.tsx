import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const ImpersonateAlert: React.FC = () => {
  const { currentUserState, setImpersonatingUsername } =
    React.useContext(NotebookControllerContext);

  return (
    <Alert
      className="odh-notebook-controller__page-content"
      variant="info"
      title={`This notebook server is being created for "${currentUserState.user}"`}
      isInline
    >
      <Button variant="link" onClick={() => setImpersonatingUsername(null)}>
        Return to administration view
      </Button>
    </Alert>
  );
};

export default ImpersonateAlert;
