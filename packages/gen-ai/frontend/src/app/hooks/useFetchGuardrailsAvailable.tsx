import React from 'react';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';

// Returns true only when guardrails feature flag is enabled AND status is 'Ready'
const useFetchGuardrailsAvailable = (): { guardrailsAvailable: boolean } => {
  const guardrailsEnabled = useGuardrailsEnabled();
  const { api, apiAvailable } = useGenAiAPI();
  const [guardrailsAvailable, setGuardrailsAvailable] = React.useState(false);

  React.useEffect(() => {
    if (!guardrailsEnabled || !apiAvailable) {
      setGuardrailsAvailable(false);
    } else {
      api
        .getGuardrailsStatus()
        .then((data) => setGuardrailsAvailable(data.phase === 'Ready'))
        .catch(() => setGuardrailsAvailable(false));
    }
  }, [api, apiAvailable, guardrailsEnabled]);

  return { guardrailsAvailable };
};

export default useFetchGuardrailsAvailable;
