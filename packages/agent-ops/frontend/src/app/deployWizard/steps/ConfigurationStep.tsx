import * as React from 'react';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  protocolOptions,
  workloadTypeOptions,
} from '~/app/deployWizard/wizardOptions';
import { getProtocolError, isValidK8sLabelValue } from '~/app/deployWizard/utils';

const ConfigurationStep: React.FC = () => {
  const { formData, setFormField } = useAgentDeployWizardContext();

  const protocolError = getProtocolError(formData.protocol);
  const protocolInvalid = protocolError.length > 0;
  const frameworkInvalid =
    formData.framework.trim().length > 0 && !isValidK8sLabelValue(formData.framework);

  return (
    <Form>
      <FormSection title="Configuration">
        <FormGroup label="Protocol" isRequired fieldId="deploy-agent-protocol">
          <DeployWizardSelectField>
            <SimpleSelect
              dataTestId="deploy-agent-protocol-select"
              placeholder="Select a protocol"
              value={formData.protocol}
              options={protocolOptions}
              onChange={(key) => setFormField('protocol', key)}
              isFullWidth
              maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
              popperProps={{ appendTo: 'inline' }}
              toggleProps={{
                id: 'deploy-agent-protocol',
                'aria-label': 'Protocol',
                'aria-invalid': protocolInvalid,
                'aria-describedby': protocolInvalid
                  ? 'deploy-agent-protocol-error'
                  : 'deploy-agent-protocol-helper',
              }}
            />
          </DeployWizardSelectField>
          {protocolInvalid ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem id="deploy-agent-protocol-error" variant="error">
                  {protocolError}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : (
            <FormHelperText id="deploy-agent-protocol-helper">
              <HelperText>
                <HelperTextItem>
                  Agent communication protocol for discovery and routing. Example: A2A
                  (Agent-to-Agent).
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
        <FormGroup label="Framework" fieldId="deploy-agent-framework">
          <TextInput
            id="deploy-agent-framework"
            data-testid="deploy-agent-framework"
            value={formData.framework}
            maxLength={63}
            validated={frameworkInvalid ? ValidatedOptions.error : ValidatedOptions.default}
            aria-invalid={frameworkInvalid}
            aria-describedby={
              frameworkInvalid ? 'deploy-agent-framework-error' : 'deploy-agent-framework-helper'
            }
            onChange={(_event, value) => setFormField('framework', value)}
            placeholder="e.g., langgraph"
          />
          {frameworkInvalid ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem id="deploy-agent-framework-error" variant="error">
                  Framework must be a valid Kubernetes label value (max 63 characters).
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : (
            <FormHelperText id="deploy-agent-framework-helper">
              <HelperText>
                <HelperTextItem>
                  Optional agent framework identifier (valid Kubernetes label value).
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
        <FormGroup label="Workload type" fieldId="deploy-agent-workload-type">
          <DeployWizardSelectField>
            <SimpleSelect
              dataTestId="deploy-agent-workload-type-select"
              value={formData.workloadType}
              options={workloadTypeOptions}
              onChange={(key) => setFormField('workloadType', key)}
              isFullWidth
              isDisabled
              maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
              popperProps={{ appendTo: 'inline' }}
              toggleProps={{ id: 'deploy-agent-workload-type', 'aria-label': 'Workload type' }}
            />
          </DeployWizardSelectField>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>Agents deploy as Sandbox custom resources.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default ConfigurationStep;
