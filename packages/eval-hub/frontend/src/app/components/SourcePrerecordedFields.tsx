import * as React from 'react';
import { useParams } from 'react-router-dom';
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
  const { namespace } = useParams<{ namespace: string }>();
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
            <LabelHelpPopover
              ariaLabel="More info for S3 secret name"
              title="S3 secret name"
              content={
                <>
                  Enter the <strong>name</strong> of a Kubernetes Secret containing S3 credentials.
                  The secret must include the following keys: AWS_ACCESS_KEY_ID,
                  AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, and AWS_S3_ENDPOINT. These match the
                  format of S3 connection Secrets created by OpenShift AI.
                  <br />
                  <br />
                  If it hasn&apos;t been created yet, run:
                  <pre
                    style={{
                      background: 'var(--pf-t--global--background--color--secondary--default)',
                      padding: 'var(--pf-t--global--spacer--sm)',
                      borderRadius: 'var(--pf-t--global--border--radius--small)',
                      marginTop: 'var(--pf-t--global--spacer--sm)',
                      whiteSpace: 'pre',
                      overflowX: 'auto',
                    }}
                  >
                    {[
                      'oc create secret generic my-s3-secret \\',
                      '  --from-literal=AWS_ACCESS_KEY_ID=<your-key> \\',
                      '  --from-literal=AWS_SECRET_ACCESS_KEY=<your-secret> \\',
                      '  --from-literal=AWS_DEFAULT_REGION=<region> \\',
                      '  --from-literal=AWS_S3_ENDPOINT=<endpoint> \\',
                      `  -n ${namespace ?? '<namespace>'}`,
                    ].join('\n')}
                  </pre>
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
