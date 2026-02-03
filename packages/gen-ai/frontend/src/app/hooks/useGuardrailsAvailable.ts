import React from 'react';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import useGuardrailsStatus from './useGuardrailsStatus';

// Returns true only when guardrails feature flag is enabled AND status is 'Ready'
const useGuardrailsAvailable = (): { guardrailsAvailable: boolean } => {
  const guardrailsEnabled = useGuardrailsEnabled();
  const guardrailsStatus = useGuardrailsStatus();

  return React.useMemo(
    () => ({
      guardrailsAvailable: guardrailsEnabled && guardrailsStatus.data.phase === 'Ready',
    }),
    [guardrailsEnabled, guardrailsStatus.data.phase],
  );
};

export default useGuardrailsAvailable;
