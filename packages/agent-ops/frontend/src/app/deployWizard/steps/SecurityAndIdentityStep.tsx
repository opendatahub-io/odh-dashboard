import * as React from 'react';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Checkbox,
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  defaultOutboundPolicyOptions,
  mtlsModeOptions,
} from '~/app/deployWizard/wizardOptions';

const SecurityAndIdentityStep: React.FC = () => {
  const { formData, setFormField } = useAgentDeployWizardContext();

  const handleAuthBridgeEnabledChange = (_event: React.FormEvent, checked: boolean) => {
    setFormField('authBridgeEnabled', checked);
    if (!checked) {
      setFormField('useEnvoySidecar', false);
      setFormField('mtlsMode', '');
      setFormField('authBridgeOutboundPortsExclude', '');
      setFormField('authBridgeInboundPortsExclude', '');
      setFormField('authBridgeDefaultOutboundPolicy', '');
    }
  };

  return (
    <Form>
      <FormSection title="Security and identity">
        <FormGroup fieldId="deploy-agent-auth-bridge-enabled">
          <Checkbox
            id="deploy-agent-auth-bridge-enabled"
            data-testid="deploy-agent-auth-bridge-enabled"
            label="Enable AuthBridge sidecar injection"
            description="When enabled, the operator injects a combined AuthBridge sidecar for inbound JWT validation and outbound token exchange. Defaults to proxy-sidecar mode (HTTP_PROXY)."
            isChecked={formData.authBridgeEnabled}
            onChange={handleAuthBridgeEnabledChange}
          />
        </FormGroup>
        {formData.authBridgeEnabled ? (
          <>
            <FormGroup fieldId="deploy-agent-use-envoy-sidecar">
              <Checkbox
                id="deploy-agent-use-envoy-sidecar"
                data-testid="deploy-agent-use-envoy-sidecar"
                label="Use envoy-sidecar mode"
                description="Switch from proxy-sidecar (default) to envoy-sidecar mode (Envoy + ext_proc + iptables interception)."
                isChecked={formData.useEnvoySidecar}
                onChange={(_event, checked) => setFormField('useEnvoySidecar', checked)}
              />
            </FormGroup>
            <ExpandableSection
              toggleText="AuthBridge Advanced Configuration"
              data-testid="deploy-agent-auth-bridge-advanced"
            >
              <FormGroup
                label="Outbound Ports to Exclude"
                fieldId="deploy-agent-auth-bridge-outbound-ports"
              >
                <TextInput
                  id="deploy-agent-auth-bridge-outbound-ports"
                  data-testid="deploy-agent-auth-bridge-outbound-ports"
                  value={formData.authBridgeOutboundPortsExclude}
                  placeholder="e.g. 11434,443"
                  aria-label="Outbound ports to exclude"
                  onChange={(_event, value) =>
                    setFormField('authBridgeOutboundPortsExclude', value)
                  }
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Comma-separated ports to bypass outbound proxy interception.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup
                label="Inbound Ports to Exclude"
                fieldId="deploy-agent-auth-bridge-inbound-ports"
              >
                <TextInput
                  id="deploy-agent-auth-bridge-inbound-ports"
                  data-testid="deploy-agent-auth-bridge-inbound-ports"
                  value={formData.authBridgeInboundPortsExclude}
                  placeholder="e.g. 9090"
                  aria-label="Inbound ports to exclude"
                  onChange={(_event, value) => setFormField('authBridgeInboundPortsExclude', value)}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Comma-separated ports to bypass inbound proxy interception.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup
                label="Default Outbound Policy"
                fieldId="deploy-agent-auth-bridge-default-outbound-policy"
              >
                <DeployWizardSelectField>
                  <SimpleSelect
                    dataTestId="deploy-agent-auth-bridge-default-outbound-policy-select"
                    placeholder="Cluster default"
                    value={formData.authBridgeDefaultOutboundPolicy}
                    options={defaultOutboundPolicyOptions}
                    onChange={(key) => setFormField('authBridgeDefaultOutboundPolicy', key)}
                    isFullWidth
                    maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{
                      id: 'deploy-agent-auth-bridge-default-outbound-policy',
                      'aria-label': 'Default outbound policy',
                    }}
                  />
                </DeployWizardSelectField>
              </FormGroup>
              <FormGroup label="mTLS" fieldId="deploy-agent-mtls-mode">
                <DeployWizardSelectField>
                  <SimpleSelect
                    dataTestId="deploy-agent-mtls-mode-select"
                    placeholder="Cluster default"
                    value={formData.mtlsMode}
                    options={mtlsModeOptions}
                    onChange={(key) => setFormField('mtlsMode', key)}
                    isFullWidth
                    maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{ id: 'deploy-agent-mtls-mode', 'aria-label': 'mTLS mode' }}
                  />
                </DeployWizardSelectField>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      envoy-sidecar mode requires mTLS to be disabled or use the cluster default.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </ExpandableSection>
          </>
        ) : null}
        <FormGroup fieldId="deploy-agent-enable-spire-identity">
          <Checkbox
            id="deploy-agent-enable-spire-identity"
            data-testid="deploy-agent-enable-spire-identity"
            label="Enable SPIRE identity (JWT-SVID via spiffe-helper)"
            isChecked={formData.enableSpireIdentity}
            onChange={(_event, checked) => setFormField('enableSpireIdentity', checked)}
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default SecurityAndIdentityStep;
