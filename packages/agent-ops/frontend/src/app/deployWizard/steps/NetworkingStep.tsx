import * as React from 'react';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import DeployWizardSelectField from '~/app/deployWizard/DeployWizardSelectField';
import {
  DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT,
  servicePortProtocolOptions,
} from '~/app/deployWizard/wizardOptions';
import { MAX_SERVICE_PORT, MIN_SERVICE_PORT } from '~/app/deployWizard/constants';
import { getServicePortNameError, getServicePortNumberError } from '~/app/deployWizard/utils';
import './NetworkingStep.scss';

type ServicePortFieldColumnProps = {
  label: string;
  labelId: string;
  children: React.ReactNode;
};

const ServicePortFieldColumn: React.FC<ServicePortFieldColumnProps> = ({
  label,
  labelId,
  children,
}) => (
  <Flex
    direction={{ default: 'column' }}
    spaceItems={{ default: 'spaceItemsXs' }}
    className="agent-ops-service-port-field pf-v6-u-w-100"
  >
    <FlexItem>{children}</FlexItem>
    <FlexItem>
      <span id={labelId} className="agent-ops-service-port-field__label">
        {label}
      </span>
    </FlexItem>
  </Flex>
);

const NetworkingStep: React.FC = () => {
  const { formData, updateServicePort } = useAgentDeployWizardContext();

  return (
    <Form>
      <FormSection title="Networking">
        <FormGroup label="Service ports" isRequired fieldId="deploy-agent-service-ports">
          <Stack hasGutter>
            {formData.servicePorts.map((port, index) => {
              const portNameError = getServicePortNameError(port.name);
              const portNameInvalid = portNameError.length > 0;
              const servicePortError = getServicePortNumberError(port.port);
              const servicePortInvalid = servicePortError.length > 0;
              const targetPortError = getServicePortNumberError(port.targetPort);
              const targetPortInvalid = targetPortError.length > 0;

              return (
                <Flex
                  key={port.rowId}
                  className="agent-ops-service-port-row"
                  gap={{ default: 'gapMd' }}
                  alignItems={{ default: 'alignItemsFlexStart' }}
                  id={`deploy-agent-service-port-row-${index}`}
                >
                  <FlexItem grow={{ default: 'grow' }}>
                    <ServicePortFieldColumn
                      label="Port Name"
                      labelId={`deploy-agent-port-name-label-${index}`}
                    >
                      <TextInput
                        className="pf-v6-u-w-100"
                        id={`deploy-agent-port-name-${index}`}
                        data-testid={`deploy-agent-port-name-${index}`}
                        placeholder="http"
                        value={port.name}
                        validated={
                          portNameInvalid ? ValidatedOptions.error : ValidatedOptions.default
                        }
                        aria-labelledby={`deploy-agent-port-name-label-${index}`}
                        aria-invalid={portNameInvalid}
                        aria-describedby={
                          portNameError ? `deploy-agent-port-name-error-${index}` : undefined
                        }
                        onChange={(_event, value) => updateServicePort(port.rowId, { name: value })}
                      />
                      {portNameError ? (
                        <HelperText>
                          <HelperTextItem
                            id={`deploy-agent-port-name-error-${index}`}
                            variant="error"
                          >
                            {portNameError}
                          </HelperTextItem>
                        </HelperText>
                      ) : null}
                    </ServicePortFieldColumn>
                  </FlexItem>
                  <FlexItem>
                    <ServicePortFieldColumn
                      label="Service Port"
                      labelId={`deploy-agent-service-port-label-${index}`}
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
                        inputProps={{
                          'aria-labelledby': `deploy-agent-service-port-label-${index}`,
                          'aria-invalid': servicePortInvalid,
                          'aria-describedby': servicePortInvalid
                            ? `deploy-agent-service-port-error-${index}`
                            : undefined,
                        }}
                        onChange={(value) =>
                          updateServicePort(port.rowId, { port: value ?? port.port })
                        }
                      />
                      {servicePortInvalid ? (
                        <HelperText>
                          <HelperTextItem
                            id={`deploy-agent-service-port-error-${index}`}
                            variant="error"
                          >
                            {servicePortError}
                          </HelperTextItem>
                        </HelperText>
                      ) : null}
                    </ServicePortFieldColumn>
                  </FlexItem>
                  <FlexItem>
                    <ServicePortFieldColumn
                      label="Target Port"
                      labelId={`deploy-agent-target-port-label-${index}`}
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
                        inputProps={{
                          'aria-labelledby': `deploy-agent-target-port-label-${index}`,
                          'aria-invalid': targetPortInvalid,
                          'aria-describedby': targetPortInvalid
                            ? `deploy-agent-target-port-error-${index}`
                            : undefined,
                        }}
                        onChange={(value) =>
                          updateServicePort(port.rowId, { targetPort: value ?? port.targetPort })
                        }
                      />
                      {targetPortInvalid ? (
                        <HelperText>
                          <HelperTextItem
                            id={`deploy-agent-target-port-error-${index}`}
                            variant="error"
                          >
                            {targetPortError}
                          </HelperTextItem>
                        </HelperText>
                      ) : null}
                    </ServicePortFieldColumn>
                  </FlexItem>
                  <FlexItem className="agent-ops-service-port-row__protocol">
                    <ServicePortFieldColumn
                      label="Protocol"
                      labelId={`deploy-agent-port-protocol-label-${index}`}
                    >
                      <DeployWizardSelectField>
                        <SimpleSelect
                          dataTestId={`deploy-agent-port-protocol-${index}`}
                          placeholder="Select a protocol"
                          value={port.protocol}
                          options={servicePortProtocolOptions}
                          onChange={(key) => updateServicePort(port.rowId, { protocol: key })}
                          isFullWidth
                          maxMenuHeight={DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT}
                          popperProps={{ appendTo: 'inline' }}
                          toggleProps={{
                            id: `deploy-agent-port-protocol-${index}`,
                            'aria-labelledby': `deploy-agent-port-protocol-label-${index}`,
                          }}
                        />
                      </DeployWizardSelectField>
                    </ServicePortFieldColumn>
                  </FlexItem>
                </Flex>
              );
            })}
          </Stack>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                One service port is supported. The Sandbox controller uses this port for the
                container and cluster Service.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default NetworkingStep;
