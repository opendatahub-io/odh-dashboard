import * as React from 'react';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import {
  formatAuthBridgeSummary,
  formatEnvVarsSummary,
  formatPersistentStorageSummary,
  formatProtocolSummary,
  formatServicePortsSummary,
  formatWorkloadTypeSummary,
} from '~/app/deployWizard/utils';

const SummaryStep: React.FC = () => {
  const { formData } = useAgentDeployWizardContext();

  const summaryItems = [
    { label: 'Container image', value: formData.containerImage },
    { label: 'Image tag', value: formData.imageTag },
    { label: 'Agent name', value: formData.agentName },
    { label: 'Project', value: formData.project },
    { label: 'Protocol', value: formatProtocolSummary(formData.protocol) },
    { label: 'Framework', value: '—' },
    { label: 'Workload type', value: formatWorkloadTypeSummary(formData.workloadType) },
    {
      label: 'Persistent storage',
      value: formatPersistentStorageSummary(formData),
    },
    { label: 'Service ports', value: formatServicePortsSummary(formData.servicePorts) },
    {
      label: 'External route',
      value: formData.createRoute ? 'Enabled' : 'Disabled',
    },
    { label: 'AuthBridge', value: formatAuthBridgeSummary(formData) },
    { label: 'Environment variables', value: formatEnvVarsSummary(formData.envVars) },
  ];

  return (
    <Form>
      <FormSection title="Summary">
        <DescriptionList isHorizontal>
          {summaryItems.map((item) => (
            <DescriptionListGroup key={item.label}>
              <DescriptionListTerm>{item.label}</DescriptionListTerm>
              <DescriptionListDescription
                data-testid={`deploy-agent-summary-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.value}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
      </FormSection>
    </Form>
  );
};

export default SummaryStep;
