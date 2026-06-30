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
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  mtlsModeOptions,
} from '~/app/deployWizard/wizardOptions';

const SecurityAndIdentityStep: React.FC = () => {
  const { formData, setFormField } = useAgentDeployWizardContext();

  return (
    <Form>
      <FormSection title="Security and identity">
        <FormGroup fieldId="deploy-agent-auth-bridge-enabled">
          <Checkbox
            id="deploy-agent-auth-bridge-enabled"
            data-testid="deploy-agent-auth-bridge-enabled"
            label="Enable AuthBridge sidecar injection"
            isChecked={formData.authBridgeEnabled}
            onChange={(_event, checked) => setFormField('authBridgeEnabled', checked)}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                When enabled, the operator injects a combined AuthBridge sidecar for inbound JWT
                validation and outbound token exchange. Defaults to proxy-sidecar mode (HTTP_PROXY).
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup fieldId="deploy-agent-use-envoy-sidecar">
          <Checkbox
            id="deploy-agent-use-envoy-sidecar"
            data-testid="deploy-agent-use-envoy-sidecar"
            label="Use envoy-sidecar mode"
            isChecked={formData.useEnvoySidecar}
            isDisabled={!formData.authBridgeEnabled}
            onChange={(_event, checked) => setFormField('useEnvoySidecar', checked)}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Switch from proxy-sidecar (default) to envoy-sidecar mode (Envoy + ext_proc +
                iptables interception).
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <ExpandableSection
          toggleText="AuthBridge advanced configuration"
          data-testid="deploy-agent-auth-bridge-advanced"
        >
          <FormGroup label="mTLS mode" fieldId="deploy-agent-mtls-mode">
            <DeployWizardSelectField>
              <SimpleSelect
                dataTestId="deploy-agent-mtls-mode-select"
                placeholder="Select mTLS mode"
                value={formData.mtlsMode}
                options={mtlsModeOptions}
                onChange={(key) => setFormField('mtlsMode', key)}
                isFullWidth
                maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                popperProps={{ appendTo: 'inline' }}
                toggleProps={{ id: 'deploy-agent-mtls-mode', 'aria-label': 'mTLS mode' }}
              />
            </DeployWizardSelectField>
          </FormGroup>
        </ExpandableSection>
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
