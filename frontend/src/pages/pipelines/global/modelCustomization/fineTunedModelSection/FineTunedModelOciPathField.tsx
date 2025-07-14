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
} from '@patternfly/react-core';
import { ValidationContext } from '#~/utilities/useValidation';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import FormSection from '#~/components/pf-overrides/FormSection';

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

  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const uriValidationIssues = modelUri
    ? getAllValidationIssues(['outputModel', 'connectionData', 'uri'])
    : [];

  return (
    <FormSection
      title="OCI storage location"
      description="Provide the location of the model. This is not part of your connection instance."
    >
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
              validated={uriValidationIssues.length > 0 ? 'error' : 'default'}
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
              Example of recommended path structure is
              registryHost/registryOrganization/modelName:modelVersion
            </HelperTextItem>
            <HelperTextItem>
              Example, registry.redhat.io/rhelai1/modelcar-granite-7b-starter:1.4.0
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <ZodErrorHelperText zodIssue={uriValidationIssues} />
      </FormGroup>
    </FormSection>
  );
};

export default FineTunedModelOciPathField;
