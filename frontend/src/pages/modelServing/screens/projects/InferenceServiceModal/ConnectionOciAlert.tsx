import { Alert } from '@patternfly/react-core';
import React from 'react';

export const ConnectionOciAlert: () => JSX.Element = () => (
  <Alert
    variant="warning"
    style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}
    title="Model requirement for OCI connections"
  >
    OCI connections can be used to deploy only models packaged as ModelCars. Deploying models
    packaged in different formats will result in failure.
  </Alert>
);
