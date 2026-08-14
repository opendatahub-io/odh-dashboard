import * as React from 'react';
import {
  Content,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type SourcePrerecordedFieldsProps = {
  sourceName: string;
  onSourceNameChange: (val: string) => void;
  datasetUrl: string;
  onDatasetUrlChange: (val: string) => void;
  accessToken: string;
  onAccessTokenChange: (val: string) => void;
  datasetUrlError: string | undefined;
  accessTokenError: string | undefined;
  touched: Record<string, boolean>;
  markTouched: (field: string) => void;
};

const SourcePrerecordedFields: React.FC<SourcePrerecordedFieldsProps> = ({
  sourceName,
  onSourceNameChange,
  datasetUrl,
  onDatasetUrlChange,
  accessToken,
  onAccessTokenChange,
  datasetUrlError,
  accessTokenError,
  touched,
  markTouched,
}) => {
  const datasetUrlValidated =
    touched.datasetUrl && datasetUrlError ? ValidatedOptions.error : ValidatedOptions.default;
  const accessTokenValidated =
    touched.accessToken && accessTokenError ? ValidatedOptions.error : ValidatedOptions.default;

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
        <FormGroup
          label="S3 secret name"
          isRequired
          fieldId="access-token"
          labelHelp={
            <Popover
              aria-label="S3 secret name help"
              bodyContent={
                <Content component="p">
                  The name of the Kubernetes Secret containing credentials to access the S3 bucket
                  where pre-recorded responses are stored.
                </Content>
              }
            >
              <button
                type="button"
                aria-label="More info about S3 secret name"
                onClick={(e) => e.preventDefault()}
                className="pf-v6-c-form__group-label-help"
              >
                <OutlinedQuestionCircleIcon />
              </button>
            </Popover>
          }
        >
          <TextInput
            id="access-token"
            data-testid="access-token-input"
            value={accessToken}
            onChange={(_e, val) => onAccessTokenChange(val)}
            onBlur={() => markTouched('accessToken')}
            isRequired
            validated={accessTokenValidated}
          />
          {touched.accessToken && accessTokenError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{accessTokenError}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default SourcePrerecordedFields;
