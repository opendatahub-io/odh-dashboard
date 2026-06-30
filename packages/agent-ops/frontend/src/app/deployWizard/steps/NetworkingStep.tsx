import * as React from 'react';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  servicePortProtocolOptions,
} from '~/app/deployWizard/wizardOptions';
import { isValidPortNumber, isValidServicePortName } from '~/app/deployWizard/utils';
import { MAX_SERVICE_PORT, MIN_SERVICE_PORT } from '~/app/deployWizard/constants';

const NetworkingStep: React.FC = () => {
  const { formData, setFormField, updateServicePort, addServicePort, removeServicePort } =
    useAgentDeployWizardContext();

  return (
    <Form>
      <FormSection title="Networking">
        <FormGroup label="Service ports" isRequired fieldId="deploy-agent-service-ports">
          {formData.servicePorts.map((port, index) => {
            const portNameInvalid =
              port.name.trim().length > 0 && !isValidServicePortName(port.name);
            const servicePortInvalid = !isValidPortNumber(port.port);
            const targetPortInvalid = !isValidPortNumber(port.targetPort);

            return (
              <Split hasGutter key={`service-port-${index}`}>
                <SplitItem isFilled>
                  <FormGroup
                    label="Port name"
                    isRequired
                    fieldId={`deploy-agent-port-name-${index}`}
                  >
                    <TextInput
                      id={`deploy-agent-port-name-${index}`}
                      data-testid={`deploy-agent-port-name-${index}`}
                      value={port.name}
                      validated={
                        portNameInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      onChange={(_event, value) => updateServicePort(index, { name: value })}
                    />
                  </FormGroup>
                </SplitItem>
                <SplitItem isFilled>
                  <FormGroup
                    label="Service port"
                    isRequired
                    fieldId={`deploy-agent-service-port-${index}`}
                  >
                    <NumberInputWrapper
                      id={`deploy-agent-service-port-${index}`}
                      data-testid={`deploy-agent-service-port-${index}`}
                      value={port.port}
                      min={MIN_SERVICE_PORT}
                      max={MAX_SERVICE_PORT}
                      validated={
                        servicePortInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      onChange={(value) => updateServicePort(index, { port: value ?? port.port })}
                    />
                  </FormGroup>
                </SplitItem>
                <SplitItem isFilled>
                  <FormGroup
                    label="Target port"
                    isRequired
                    fieldId={`deploy-agent-target-port-${index}`}
                  >
                    <NumberInputWrapper
                      id={`deploy-agent-target-port-${index}`}
                      data-testid={`deploy-agent-target-port-${index}`}
                      value={port.targetPort}
                      min={MIN_SERVICE_PORT}
                      max={MAX_SERVICE_PORT}
                      validated={
                        targetPortInvalid ? ValidatedOptions.error : ValidatedOptions.default
                      }
                      onChange={(value) =>
                        updateServicePort(index, { targetPort: value ?? port.targetPort })
                      }
                    />
                  </FormGroup>
                </SplitItem>
                <SplitItem isFilled>
                  <FormGroup
                    label="Protocol"
                    isRequired
                    fieldId={`deploy-agent-port-protocol-${index}`}
                  >
                    <DeployWizardSelectField>
                      <SimpleSelect
                        dataTestId={`deploy-agent-port-protocol-${index}`}
                        placeholder="Select a protocol"
                        value={port.protocol}
                        options={servicePortProtocolOptions}
                        onChange={(key) => updateServicePort(index, { protocol: key })}
                        isFullWidth
                        maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                        popperProps={{ appendTo: 'inline' }}
                        toggleProps={{
                          id: `deploy-agent-port-protocol-${index}`,
                          'aria-label': 'Protocol',
                        }}
                      />
                    </DeployWizardSelectField>
                  </FormGroup>
                </SplitItem>
                <SplitItem>
                  <Button
                    aria-label={`Remove service port ${index + 1}`}
                    data-testid={`deploy-agent-remove-service-port-${index}`}
                    onClick={() => removeServicePort(index)}
                    variant="plain"
                    icon={<MinusCircleIcon />}
                    isDisabled={formData.servicePorts.length === 1}
                  />
                </SplitItem>
              </Split>
            );
          })}
          <Button
            isInline
            data-testid="deploy-agent-add-service-port"
            variant="link"
            onClick={addServicePort}
            icon={<PlusCircleIcon />}
          >
            Add Service Port
          </Button>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>Configure service ports for the agent pod.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup fieldId="deploy-agent-create-route">
          <Checkbox
            id="deploy-agent-create-route"
            data-testid="deploy-agent-create-route"
            label="Enable external access to the agent endpoint."
            isChecked={formData.createRoute}
            onChange={(_event, checked) => setFormField('createRoute', checked)}
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default NetworkingStep;
