import * as React from 'react';
import { EmptyState, EmptyStateBody, Spinner, Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import TabContentWrapper from './TabContentWrapper';

interface GuardrailsTabContentProps {
  configId: string;
  guardrailModels: string[];
  guardrailModelsLoaded: boolean;
}

const GuardrailsTabContent: React.FunctionComponent<GuardrailsTabContentProps> = ({
  configId,
  guardrailModels,
  guardrailModelsLoaded,
}) => {
  const hasGuardrailModels = guardrailModelsLoaded && guardrailModels.length > 0;
  const isLoading = !guardrailModelsLoaded;

  const renderContent = () => {
    if (isLoading) {
      return (
        <Bullseye>
          <Spinner size="lg" aria-label="Loading guardrail models" />
        </Bullseye>
      );
    }

    if (!hasGuardrailModels) {
      return (
        <EmptyState
          titleText="No guardrail configuration found"
          icon={CogIcon}
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

    return <GuardrailsPanel configId={configId} availableModels={guardrailModels} />;
  };

  return (
    <TabContentWrapper title="Guardrails" titleTestId="guardrails-section-title">
      {renderContent()}
    </TabContentWrapper>
  );
};

export default GuardrailsTabContent;
