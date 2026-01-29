import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import TabContentWrapper from './TabContentWrapper';

interface GuardrailsTabContentProps {
  guardrailsEnabled: boolean;
  onGuardrailsToggle: (enabled: boolean) => void;
}

const GuardrailsTabContent: React.FunctionComponent<GuardrailsTabContentProps> = ({
  guardrailsEnabled,
  onGuardrailsToggle,
}) => {
  const headerActions = (
    <Switch
      id="guardrails-toggle-switch"
      isChecked={guardrailsEnabled}
      data-testid="guardrails-toggle-switch"
      onChange={(_, checked) => {
        onGuardrailsToggle(checked);
      }}
      aria-label="Toggle Guardrails"
    />
  );

  return (
    <TabContentWrapper
      title="Guardrails"
      headerActions={headerActions}
      titleTestId="guardrails-section-title"
    >
      Guardrails content here
    </TabContentWrapper>
  );
};

export default GuardrailsTabContent;
