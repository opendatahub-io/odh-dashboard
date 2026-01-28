import { Alert } from '@patternfly/react-core';
import React from 'react';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import useFetchGuardrailsStatus from '~/app/hooks/useFetchGuardrailsStatus';

export const GuardrailsNotConfiguredAlert: () => JSX.Element | null = () => {
  // Gate all guardrails status warning functionality behind the guardrails feature flag
  const isGuardrailsFeatureEnabled = useGuardrailsEnabled();
  const { data: guardrailsStatus, loaded, isNotFound } = useFetchGuardrailsStatus();

  // When guardrails feature flag is disabled, no warning alerts should be displayed and guardrails UI should be hidden
  if (!isGuardrailsFeatureEnabled) {
    return null;
  }

  // Don't show alert while loading
  if (!loaded) {
    return null;
  }

  // Display a warning alert when guardrails status is not_found (404 response or no CR exists)
  if (isNotFound) {
    return (
      <Alert variant="warning" title="Guardrails unavailable">
        Guardrails are not configured for this cluster. You can continue with the playground
        configuration, but guardrails will be disabled. Contact a cluster administrator to add
        guardrails.
      </Alert>
    );
  }

  // Display a warning alert when guardrails status is Progressing (in progress)
  if (guardrailsStatus?.phase === 'Progressing') {
    return (
      <Alert variant="warning" title="Guardrails in progress">
        Guardrails are currently being configured for this cluster. You can continue with the
        playground configuration, but guardrails will be disabled until the configuration is
        complete.
      </Alert>
    );
  }

  // Display a warning alert when guardrails status is Failed
  if (guardrailsStatus?.phase === 'Failed') {
    return (
      <Alert variant="danger" title="Guardrails configuration failed">
        Guardrails configuration has failed for this cluster. You can continue with the playground
        configuration, but guardrails will be disabled. Contact a cluster administrator to resolve
        this issue.
      </Alert>
    );
  }

  // No warning when status is Ready or any other state
  return null;
};
