import React from 'react';
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
} from '@patternfly/react-core';

type FineTunedModelOciPathFieldProps = {
  ociHost?: string;
  modelUri?: string;
  setModelUri: (modelPath?: string) => void;
};

const FineTunedModelOciPathField: React.FC<FineTunedModelOciPathFieldProps> = ({
  ociHost,
  modelUri,
  setModelUri,
}) => {
  const hideUriPrefix = (text?: string) => {
    if (text?.includes('://')) {
      return text.substring(text.indexOf('://') + 3);
    }
    return text;
  };

  const addUriPrefix = (text?: string) => {
    if (text && !text.includes('://')) {
      return `oci://${text}`;
    }
    return text;
  };

  return (
    <FormSection title="Deployment details">
      {ociHost && (
        <FormGroup label="Registry host" className="pf-v6-u-mb-lg">
          {ociHost}
        </FormGroup>
      )}
      <FormGroup fieldId="model-uri" label="Model URI">
        <InputGroup>
          <InputGroupText>oci://</InputGroupText>
          <InputGroupItem isFill>
            <TextInput
              id="model-uri"
              aria-label="Model URI"
              data-testid="model-uri"
              type="text"
              value={hideUriPrefix(modelUri)}
              onChange={(e, value: string) => {
                setModelUri(addUriPrefix(value));
              }}
            />
          </InputGroupItem>
        </InputGroup>

        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Example model path structure is Base URL / Registry organization / Model Name:Model
              Version
            </HelperTextItem>
            <HelperTextItem>
              Example: registry.connect.redhat.com/redhat-test/test-mymodel:v3.2
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </FormSection>
  );
};

export default FineTunedModelOciPathField;
