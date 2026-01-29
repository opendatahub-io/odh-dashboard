import * as React from 'react';
import { Switch, EmptyState, EmptyStateBody, Spinner, Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import GuardrailsPanel from '~/app/Chatbot/components/guardrails/GuardrailsPanel';
import { useChatbotConfigStore, selectGuardrailsEnabled } from '~/app/Chatbot/store';
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
  const guardrailsEnabled = useChatbotConfigStore(selectGuardrailsEnabled(configId));
  const updateGuardrailsEnabled = useChatbotConfigStore((state) => state.updateGuardrailsEnabled);

  const hasGuardrailModels = guardrailModelsLoaded && guardrailModels.length > 0;
  const isLoading = !guardrailModelsLoaded;

  const handleGuardrailsToggle = React.useCallback(
    (enabled: boolean) => {
      updateGuardrailsEnabled(configId, enabled);
      fireMiscTrackingEvent('Playground Guardrails Toggle Selected', {
        isGuardrailsEnabled: enabled,
      });
    },
    [configId, updateGuardrailsEnabled],
  );

  const headerActions = (
    <Switch
      id="guardrails-toggle-switch"
      isChecked={guardrailsEnabled}
      isDisabled={!hasGuardrailModels || isLoading}
      data-testid="guardrails-toggle-switch"
      onChange={(_, checked) => handleGuardrailsToggle(checked)}
      aria-label="Toggle Guardrails"
    />
  );

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

    if (!guardrailsEnabled) {
      return (
        <EmptyState
          titleText="Guardrails are not enabled"
          icon={CogIcon}
          variant="sm"
          data-testid="guardrails-disabled-state"
        >
          <EmptyStateBody>
            No active guardrails. Enable guardrails to secure your inputs and playground responses.
          </EmptyStateBody>
        </EmptyState>
      );
    }

    return <GuardrailsPanel configId={configId} availableModels={guardrailModels} />;
  };

  return (
    <TabContentWrapper
      title="Guardrails"
      headerActions={headerActions}
      titleTestId="guardrails-section-title"
    >
      {renderContent()}
    </TabContentWrapper>
  );
};

export default GuardrailsTabContent;
