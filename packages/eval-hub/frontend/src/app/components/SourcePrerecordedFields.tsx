import * as React from 'react';
import {
  CodeBlock,
  CodeBlockCode,
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

type SourcePrerecordedFieldsProps = {
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
            <LabelHelpPopover
              ariaLabel="More info for S3 secret name"
              title="S3 secret name"
              content={
                <>
                  Enter the <strong>name</strong> of the Kubernetes Secret that stores the S3
                  credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION,
                  AWS_S3_ENDPOINT).
                  <br />
                  <br />
                  If it hasn&apos;t been created yet, run:
                  <CodeBlock className="pf-v6-u-mt-sm">
                    <CodeBlockCode>
                      {`oc create secret generic my-s3-secret\n  --from-literal=AWS_ACCESS_KEY_ID=<key-id>\n  --from-literal=AWS_SECRET_ACCESS_KEY=<secret>\n  --from-literal=AWS_DEFAULT_REGION=<region>\n  --from-literal=AWS_S3_ENDPOINT=<endpoint>\n  -n your-namespace`}
                    </CodeBlockCode>
                  </CodeBlock>
                </>
              }
            />
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
