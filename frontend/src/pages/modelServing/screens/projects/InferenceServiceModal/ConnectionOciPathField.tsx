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
} from '@patternfly/react-core';

type ConnectionOciPathFieldProps = {
  ociHost?: string;
  modelUri?: string;
  setModelUri: (modelPath?: string) => void;
};

const ConnectionOciPathField: React.FC<ConnectionOciPathFieldProps> = ({
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
    <>
      {ociHost && (
        <FormGroup label="Registry host" className="pf-v6-u-mb-lg">
          {ociHost}
        </FormGroup>
      )}
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
              onChange={(e, value: string) => {
                setModelUri(value);
              }}
              onBlur={() => setModelUri(addUriPrefix(modelUri))}
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
    </>
  );
};

export default ConnectionOciPathField;
