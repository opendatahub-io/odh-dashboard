import React, { useState } from 'react';
import {
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon.tsx';

type PVCContextFieldProps = {
  setModelName: (name: string) => void;
  setModelPath: (path: string) => void;
  modelName: string;
  modelPath: string;
  setValid: (isValid: boolean) => void;
  removeModelAnnotations: () => void;
};

const PVCContextField: React.FC<PVCContextFieldProps> = ({
  setModelName,
  setModelPath,
  modelName,
  modelPath,
  setValid,
  removeModelAnnotations,
}) => {
  const [isGeneralPurpose, setIsGeneralPurpose] = useState(!modelName && !modelPath);

  const validatePath = (path: string) => {
    const trimmedPath = path.trim();
    const pathRegex = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\/?$/;
    if (isGeneralPurpose || (trimmedPath && pathRegex.test(trimmedPath))) {
      setValid(true);
    } else {
      setValid(false);
    }
  };

  return (
    <>
      <FormGroup
        label="Storage context"
        fieldId="storage-context"
        labelHelp={
          <FieldGroupHelpLabelIcon
            content={
              <p>
                The context indicates the purpose of the storage: general purpose, or model storage.
              </p>
            }
          />
        }
      >
        <Radio
          value="general-purpose"
          name="storage-context-general-radio"
          id="storage-context-general-radio"
          data-testid="general-purpose-radio"
          label="General purpose"
          isChecked={isGeneralPurpose}
          onChange={() => {
            setIsGeneralPurpose(true);
            setValid(true);
            removeModelAnnotations();
          }}
          description="Appropriate for all use cases."
        />
        <br />
        <Radio
          value="model-storage"
          name="storage-context-model-storage-radio"
          id="storage-context-model-storage-radio"
          data-testid="model-storage-radio"
          label="Model storage"
          isChecked={!isGeneralPurpose}
          onChange={() => {
            setIsGeneralPurpose(false);
            if (!modelPath.trim()) {
              setValid(false);
            } else {
              validatePath(modelPath);
            }
          }}
          description="Appropriate for model storage. Enables you to define the model name and path."
          body={
            !isGeneralPurpose && (
              <FormSection title="Model details">
                <FormGroup
                  label="Model path"
                  fieldId="storage-context-model-storage-model-path"
                  isRequired
                  labelHelp={
                    <FieldGroupHelpLabelIcon
                      content={
                        <p>Enter the path to the model location within the cluster storage.</p>
                      }
                    />
                  }
                >
                  <TextInput
                    id="storage-context-model-storage-model-path"
                    aria-label="Model path"
                    data-testid="model-path-input"
                    value={modelPath}
                    onChange={(_, value) => {
                      setModelPath(value.trim());
                      validatePath(value);
                    }}
                    isRequired
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Enter a path to your model or a folder containing your model. The path
                        cannot point to a root folder.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                <FormGroup
                  label="Model name"
                  fieldId="storage-context-model-storage-model-name"
                  labelHelp={
                    <FieldGroupHelpLabelIcon content={<p>Enter the name of the model.</p>} />
                  }
                >
                  <TextInput
                    id="storage-context-model-storage-model-name"
                    aria-label="Model name"
                    data-testid="model-name-input"
                    value={modelName}
                    onChange={(_, value) => setModelName(value.trim())}
                  />
                </FormGroup>
              </FormSection>
            )
          }
        />
      </FormGroup>
    </>
  );
};

export default PVCContextField;
