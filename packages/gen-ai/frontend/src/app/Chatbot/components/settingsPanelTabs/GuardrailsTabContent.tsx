import * as React from 'react';
import { EmptyState, EmptyStateBody, Spinner, Bullseye } from '@patternfly/react-core';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import SupportIcon from '~/app/bgimages/support-icon.svg';
import TabContentWrapper from './TabContentWrapper';

interface GuardrailsTabContentProps {
  configId: string;
  guardrailModels: string[];
  guardrailModelsLoaded: boolean;
  guardrailModelsError?: Error;
}

const GuardrailsTabContent: React.FunctionComponent<GuardrailsTabContentProps> = ({
  configId,
  guardrailModels,
  guardrailModelsLoaded,
  guardrailModelsError,
}) => {
  if (guardrailModelsLoaded && guardrailModels.length === 0) {
    return (
      <EmptyState
        titleText="No guardrail configuration found"
        icon={() => (
          <img src={SupportIcon} alt="Support icon" style={{ width: '56px', height: '56px' }} />
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

  if (guardrailModelsError) {
    return (
      <EmptyState
        titleText="Failed to load guardrails"
        icon={() => (
          <img src={SupportIcon} alt="Support icon" style={{ width: '56px', height: '56px' }} />
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

  // Loading or has models: show title with content
  return (
    <TabContentWrapper title="Guardrails" titleTestId="guardrails-section-title">
      {!guardrailModelsLoaded ? (
        <Bullseye>
          <Spinner size="lg" aria-label="Loading guardrail models" />
        </Bullseye>
      ) : (
        <GuardrailsPanel configId={configId} availableModels={guardrailModels} />
      )}
    </TabContentWrapper>
  );
};

export default GuardrailsTabContent;
