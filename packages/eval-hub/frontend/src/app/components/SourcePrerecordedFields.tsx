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
import ConnectionValidationButton from '~/app/components/ConnectionValidationButton';
import type { ConnectionValidationState } from '~/app/types';

type SourcePrerecordedFieldsProps = {
  sourceName: string;
  onSourceNameChange: (val: string) => void;
  datasetUrl: string;
  onDatasetUrlChange: (val: string) => void;
  accessToken: string;
  onAccessTokenChange: (val: string) => void;
  datasetUrlError: string | undefined;
  touched: Record<string, boolean>;
  markTouched: (field: string) => void;
  connectionValidation: ConnectionValidationState;
  canVerifyConnection: boolean;
  onVerifyConnection: () => void;
};

const SourcePrerecordedFields: React.FC<SourcePrerecordedFieldsProps> = ({
  sourceName,
  onSourceNameChange,
  datasetUrl,
  onDatasetUrlChange,
  accessToken,
  onAccessTokenChange,
  datasetUrlError,
  touched,
  markTouched,
  connectionValidation,
  canVerifyConnection,
  onVerifyConnection,
}) => {
  const datasetUrlValidated =
    touched.datasetUrl && datasetUrlError ? ValidatedOptions.error : ValidatedOptions.default;

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Source name" isRequired fieldId="source-name">
          <TextInput
            id="source-name"
            data-testid="source-name-input"
            value={sourceName}
            onChange={(_e, val) => onSourceNameChange(val)}
            onBlur={() => markTouched('sourceName')}
            isRequired
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Dataset URL" isRequired fieldId="dataset-url">
          <TextInput
            id="dataset-url"
            data-testid="dataset-url-input"
            value={datasetUrl}
            onChange={(_e, val) => onDatasetUrlChange(val)}
            onBlur={() => markTouched('datasetUrl')}
            placeholder="s3://bucket-name/path"
            isRequired
            validated={datasetUrlValidated}
          />
          {touched.datasetUrl && datasetUrlError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{datasetUrlError}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Access token" fieldId="access-token">
          <TextInput
            id="access-token"
            data-testid="access-token-input"
            value={accessToken}
            onChange={(_e, val) => onAccessTokenChange(val)}
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

export default SourcePrerecordedFields;
