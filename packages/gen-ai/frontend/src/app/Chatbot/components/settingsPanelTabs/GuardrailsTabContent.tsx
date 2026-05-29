import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import SupportIconDark from '~/app/bgimages/support-icon-dark.svg';
import SupportIconLight from '~/app/bgimages/support-icon-light.svg';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import TabContentWrapper from './TabContentWrapper';

interface GuardrailsTabContentProps {
  configId: string;
}

const GuardrailsTabContent: React.FunctionComponent<GuardrailsTabContentProps> = ({ configId }) => {
  const isDarkMode = useDarkMode();
  const {
    nemoGuardrailsStatus: nemoStatus,
    nemoGuardrailsStatusLoaded: loaded,
    nemoGuardrailsStatusError: error,
  } = React.useContext(ChatbotContext);

  if (error) {
    const isNotFound = error.message.toLowerCase().includes('not found');

    if (isNotFound) {
      return (
        <EmptyState
          titleText="No guardrail configuration found"
          icon={() => (
            <img
              src={isDarkMode ? SupportIconLight : SupportIconDark}
              alt="Support icon"
              style={{ width: '56px', height: '56px' }}
            />
          )}
          variant="sm"
          data-testid="guardrails-empty-state"
        >
          <EmptyStateBody>
            This playground does not have a guardrail configuration. Contact a cluster administrator
            to add guardrails.
          </EmptyStateBody>
        </EmptyState>
      );
    }

    return (
      <EmptyState
        titleText="Failed to load guardrails"
        icon={() => (
          <img
            src={isDarkMode ? SupportIconLight : SupportIconDark}
            alt="Support icon"
            style={{ width: '56px', height: '56px' }}
          />
        )}
        variant="sm"
        data-testid="guardrails-error-state"
      >
        <EmptyStateBody>
          Unable to load guardrail configuration. Please try again later.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading guardrails status" />
      </Bullseye>
    );
  }

  if (!nemoStatus) {
    return (
      <EmptyState
        titleText="No guardrail configuration found"
        icon={() => (
          <img
            src={isDarkMode ? SupportIconLight : SupportIconDark}
            alt="Support icon"
            style={{ width: '56px', height: '56px' }}
          />
        )}
        variant="sm"
        data-testid="guardrails-empty-state"
      >
        <EmptyStateBody>
          This playground does not have a guardrail configuration. Contact a cluster administrator
          to add guardrails.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <TabContentWrapper title="Guardrails" titleTestId="guardrails-section-title">
      <GuardrailsPanel configId={configId} />
    </TabContentWrapper>
  );
};

export default GuardrailsTabContent;
