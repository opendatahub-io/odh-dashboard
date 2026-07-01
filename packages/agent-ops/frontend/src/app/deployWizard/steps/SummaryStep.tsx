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
  formatPersistentStorageSummary,
  formatProtocolSummary,
  formatServicePortsSummary,
  formatWorkloadTypeSummary,
  getOptionLabel,
} from '~/app/deployWizard/utils';
import { defaultOutboundPolicyOptions, mtlsModeOptions } from '~/app/deployWizard/wizardOptions';

const SummaryStep: React.FC = () => {
  const { formData } = useAgentDeployWizardContext();
  const envVarSummary = formatEnvVarsSummary(formData.envVars);

  return (
    <Form>
      <FormSection title="Summary">
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
              {formData.framework}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Workload type</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-workload-type">
              {formatWorkloadTypeSummary(formData.workloadType)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Persistent storage</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-persistent-storage">
              {formatPersistentStorageSummary(formData)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Service ports</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-service-ports">
              {formatServicePortsSummary(formData.servicePorts)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>External route</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-external-route">
              {formData.createRoute ? 'Enabled' : 'Disabled'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>AuthBridge</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-auth-bridge">
              {formData.authBridgeEnabled ? 'Enabled' : 'Disabled'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {formData.authBridgeEnabled ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>AuthBridge mode</DescriptionListTerm>
                <DescriptionListDescription data-testid="deploy-agent-summary-auth-bridge-mode">
                  {formData.useEnvoySidecar ? 'envoy-sidecar' : 'proxy-sidecar (default)'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {formData.authBridgeOutboundPortsExclude.trim() ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Outbound ports to exclude</DescriptionListTerm>
                  <DescriptionListDescription data-testid="deploy-agent-summary-auth-bridge-outbound-ports">
                    {formData.authBridgeOutboundPortsExclude.trim()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              {formData.authBridgeInboundPortsExclude.trim() ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Inbound ports to exclude</DescriptionListTerm>
                  <DescriptionListDescription data-testid="deploy-agent-summary-auth-bridge-inbound-ports">
                    {formData.authBridgeInboundPortsExclude.trim()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>Default outbound policy</DescriptionListTerm>
                <DescriptionListDescription data-testid="deploy-agent-summary-default-outbound-policy">
                  {getOptionLabel(
                    defaultOutboundPolicyOptions,
                    formData.authBridgeDefaultOutboundPolicy,
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>mTLS</DescriptionListTerm>
                <DescriptionListDescription data-testid="deploy-agent-summary-mtls-mode">
                  {getOptionLabel(mtlsModeOptions, formData.mtlsMode)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>SPIRE identity</DescriptionListTerm>
            <DescriptionListDescription data-testid="deploy-agent-summary-spire-identity">
              {formData.enableSpireIdentity ? 'Enabled' : 'Disabled'}
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
