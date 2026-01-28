import { Alert } from '@patternfly/react-core';
import React from 'react';

export const GuardrailsNotConfiguredAlert: () => JSX.Element = () => (
  <Alert variant="warning" title="Guardrails unavailable">
    Guardrails are not configured for this cluster. You can continue with the playground
    configuration, but guardrails will be disabled. Contact a cluster administrator to add
    guardrails.
  </Alert>
);
