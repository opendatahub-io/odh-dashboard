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
  formatEnvVarsSummary,
  formatProtocolSummary,
  formatServicePortsSummary,
} from '~/app/deployWizard/utils';
import { deployAgentWizardStepSubtitles } from '~/app/deployWizard/wizardOptions';
import { DeployAgentWizardStepTitle } from '~/app/deployWizard/types';

const SummaryStep: React.FC = () => {
  const { formData } = useAgentDeployWizardContext();
  const envVarSummary = formatEnvVarsSummary(formData.envVars);

  return (
    <Form>
      <FormSection
        title="Summary"
        description={deployAgentWizardStepSubtitles[DeployAgentWizardStepTitle.SUMMARY]}
      >
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Container image</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-container-image">
              {formData.containerImage || 'Not specified'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Image tag</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-image-tag">
              {formData.imageTag || 'Not specified'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {formData.pullSecret.trim() ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Pull secret</DescriptionListTerm>
              <DescriptionListDescription data-testid="deploy-agent-summary-pull-secret">
                {formData.pullSecret}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Agent name</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-agent-name">
              {formData.agentName || 'Not specified'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-description">
              {formData.description.trim() || 'Not specified'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Project</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-project">
              {formData.project}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Protocol</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-protocol">
              {formatProtocolSummary(formData.protocol)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Framework</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-framework">
              {formData.framework.trim() || 'Not specified'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Service ports</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-service-ports">
              {formatServicePortsSummary(formData.servicePorts)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {envVarSummary ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Environment variables</DescriptionListTerm>
              <DescriptionListDescription data-testid="deploy-agent-summary-environment-variables">
                {envVarSummary}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>
      </FormSection>
    </Form>
  );
};

export default SummaryStep;
