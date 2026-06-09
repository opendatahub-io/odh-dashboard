import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import ConnectionValidationButton from '~/app/components/ConnectionValidationButton';
import type { ConnectionValidationState } from '~/app/types';

type SourceAgentFieldsProps = {
  agentName: string;
  onAgentNameChange: (val: string) => void;
  endpointUrl: string;
  onEndpointUrlChange: (val: string) => void;
  apiKeySecretRef: string;
  onApiKeyChange: (val: string) => void;
  endpointUrlError: string | undefined;
  touched: Record<string, boolean>;
  markTouched: (field: string) => void;
  connectionValidation: ConnectionValidationState;
  canVerifyConnection: boolean;
  onVerifyConnection: () => void;
};

const SourceAgentFields: React.FC<SourceAgentFieldsProps> = ({
  agentName,
  onAgentNameChange,
  endpointUrl,
  onEndpointUrlChange,
  apiKeySecretRef,
  onApiKeyChange,
  endpointUrlError,
  touched,
  markTouched,
  connectionValidation,
  canVerifyConnection,
  onVerifyConnection,
}) => {
  const endpointUrlValidated =
    touched.endpointUrl && endpointUrlError ? ValidatedOptions.error : ValidatedOptions.default;

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Agent name" isRequired fieldId="agent-name">
          <TextInput
            id="agent-name"
            data-testid="agent-name-input"
            value={agentName}
            onChange={(_e, val) => onAgentNameChange(val)}
            onBlur={() => markTouched('agentName')}
            isRequired
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>The agent name is case-sensitive.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Endpoint URL" isRequired fieldId="endpoint-url">
          <TextInput
            id="endpoint-url"
            data-testid="endpoint-url-input"
            value={endpointUrl}
            onChange={(_e, val) => onEndpointUrlChange(val)}
            onBlur={() => markTouched('endpointUrl')}
            placeholder="https://api.example.com/v1/agent"
            isRequired
            validated={endpointUrlValidated}
          />
          {touched.endpointUrl && endpointUrlError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{endpointUrlError}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup
          label="API key secret name"
          fieldId="api-key"
          labelHelp={
            <LabelHelpPopover
              ariaLabel="More info for API key secret name"
              content="The name of the Kubernetes Secret that contains your API key. The secret is stored securely in your cluster and referenced by name — the actual key value is never exposed in the evaluation configuration."
            />
          }
        >
          <TextInput
            id="api-key"
            data-testid="api-key-input"
            value={apiKeySecretRef}
            onChange={(_e, val) => onApiKeyChange(val)}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <ConnectionValidationButton
          connectionValidation={connectionValidation}
          canVerify={canVerifyConnection}
          onVerify={onVerifyConnection}
          isValidating={connectionValidation.status === 'validating'}
        />
      </StackItem>
    </Stack>
  );
};

export default SourceAgentFields;
