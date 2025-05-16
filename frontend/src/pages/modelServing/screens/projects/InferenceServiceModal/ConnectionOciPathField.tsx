import * as React from 'react';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroupText,
  InputGroup,
  InputGroupItem,
  FormSection,
  Alert,
} from '@patternfly/react-core';
import { trimInputOnPaste } from '~/concepts/connectionTypes/utils';

type ConnectionOciPathFieldProps = {
  ociHost?: string;
  modelUri?: string;
  setModelUri: (modelPath?: string) => void;
  isNewConnection?: boolean;
};

const ConnectionOciPathField: React.FC<ConnectionOciPathFieldProps> = ({
  ociHost,
  modelUri,
  setModelUri,
  isNewConnection = false,
}) => {
  const hideUriPrefix = (text?: string) => {
    if (text?.includes('://')) {
      return text.substring(text.indexOf('://') + 3);
    }
    return text || '';
  };

  const addUriPrefix = (text?: string) => {
    if (text && !text.includes('://')) {
      return `oci://${text}`;
    }
    return text || '';
  };

  const isOciHostInModelUri = React.useMemo(() => {
    if (modelUri === undefined || (ociHost && hideUriPrefix(modelUri).startsWith(ociHost))) {
      return true;
    }
    return false;
  }, [modelUri, ociHost]);

  return (
    <>
      {!isNewConnection && ociHost && (
        <FormGroup label="Registry host" className="pf-v6-u-mb-lg">
          {ociHost}
        </FormGroup>
      )}
      <FormSection
        title="OCI storage location"
        style={{ gap: 'var(--pf-t--global--spacer--sm)', marginTop: 0 }}
      >
        Provide the location of the model. This is not part of your connection instance.
        <FormGroup fieldId="model-uri" label="Model URI" isRequired>
          <InputGroup>
            <InputGroupText>oci://</InputGroupText>
            <InputGroupItem isFill>
              <TextInput
                id="model-uri"
                aria-label="Model URI"
                data-testid="model-uri"
                type="text"
                value={hideUriPrefix(modelUri)}
                validated={isOciHostInModelUri ? 'default' : 'warning'}
                onChange={(e, value: string) => {
                  setModelUri(value);
                }}
                onBlur={() => {
                  setModelUri(addUriPrefix(hideUriPrefix(modelUri?.trim())));
                }}
                onPaste={(e) => trimInputOnPaste(modelUri, setModelUri)(e)}
              />
            </InputGroupItem>
          </InputGroup>

          {!isOciHostInModelUri && (
            <Alert
              variant="warning"
              isInline
              isPlain
              style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
              title="Registry host within model URI must match the selected connection's registry host"
            />
          )}

          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Example of recommended path structure is
                <i> registryHost/registryOrganization/modelName:modelVersion</i>
              </HelperTextItem>
              <HelperTextItem>
                Example, <i>registry.redhat.io/rhelai1/modelcar-granite-7b-starter:1.4.0</i>
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
    </>
  );
};

export default ConnectionOciPathField;
