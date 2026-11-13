/* eslint-disable camelcase */
import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import ConnectionValidationButton from '~/app/components/ConnectionValidationButton';
import { useConnectionValidation } from '~/app/hooks/useConnectionValidation';
import { getUrlValidationError } from '~/app/utils/validationUtils';

type GeneratorModelFieldsProps = {
  modelName: string;
  onModelNameChange: (value: string) => void;
  endpointUrl: string;
  onEndpointUrlChange: (value: string) => void;
  apiKeySecretRef: string;
  onApiKeyChange: (value: string) => void;
  touched: Record<string, boolean>;
  markTouched: (field: string) => void;
};

const GeneratorModelFields: React.FC<GeneratorModelFieldsProps> = ({
  modelName,
  onModelNameChange,
  endpointUrl,
  onEndpointUrlChange,
  apiKeySecretRef,
  onApiKeyChange,
  touched,
  markTouched,
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const modelNameError = modelName.trim() ? undefined : 'Model name is required.';
  const endpointUrlError = getUrlValidationError(endpointUrl);
  const { connectionValidation, handleVerifyConnection } = useConnectionValidation({
    namespace,
    sourceMode: 'model',
    endpointUrl,
    apiKeySecretRef,
    modelName,
    agentName: '',
  });
  const canVerifyConnection =
    !!namespace && !!modelName.trim() && !!endpointUrl.trim() && !endpointUrlError;

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup
          label="Model name"
          isRequired
          fieldId="model-name"
          labelHelp={
            <LabelHelpPopover
              ariaLabel="More info for model name"
              content="Model identifier expected by the endpoint."
            />
          }
        >
          <TextInput
            id="model-name"
            data-testid="model-name-input"
            value={modelName}
            onChange={(_event, value) => onModelNameChange(value)}
            onBlur={() => markTouched('modelName')}
            isRequired
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>The model name is case-sensitive.</HelperTextItem>
            </HelperText>
          </FormHelperText>
          {touched.modelName && modelNameError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{modelNameError}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Endpoint URL" isRequired fieldId="endpoint-url">
          <TextInput
            id="endpoint-url"
            data-testid="endpoint-url-input"
            value={endpointUrl}
            onChange={(_event, value) => onEndpointUrlChange(value)}
            onBlur={() => markTouched('endpointUrl')}
            placeholder="https://api.example.com"
            isRequired
            validated={
              touched.endpointUrl && endpointUrlError
                ? ValidatedOptions.error
                : ValidatedOptions.default
            }
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
          label="Authentication secret name"
          fieldId="api-key"
          labelHelp={
            <LabelHelpPopover
              ariaLabel="More info for authentication secret name"
              title="Authentication secret name"
              content="Name of a Secret containing this model’s authentication credentials in the project namespace."
            />
          }
        >
          <TextInput
            id="api-key"
            data-testid="api-key-input"
            value={apiKeySecretRef}
            onChange={(_event, value) => onApiKeyChange(value)}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <Alert
          variant="info"
          isInline
          isPlain
          title="This model must expose an OpenAI-compatible chat/completions endpoint."
          data-testid="external-endpoint-compatibility-alert"
        />
      </StackItem>
      <StackItem>
        <ConnectionValidationButton
          connectionValidation={connectionValidation}
          canVerify={canVerifyConnection}
          onVerify={handleVerifyConnection}
          isValidating={connectionValidation.status === 'validating'}
        />
      </StackItem>
    </Stack>
  );
};

export default GeneratorModelFields;
/* eslint-enable camelcase */
