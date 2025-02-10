import React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';

export const NoAuthAlert: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Alert
    id="no-authorino-installed-alert"
    className="pf-v6-u-mb-md"
    data-testid="no-authorino-installed-alert"
    isExpandable
    isInline
    variant="warning"
    title="Token authentication service not installed"
    actionClose={<AlertActionCloseButton onClose={() => onClose()} />}
  >
    <p>
      The single model serving platform used by this project allows deployed models to be accessible
      via external routes. It is recommended that token authentication be enabled to protect these
      routes. The serving platform requires the Authorino operator be installed on the cluster for
      token authentication. Contact a cluster administrator to install the operator.
    </p>
  </Alert>
);
