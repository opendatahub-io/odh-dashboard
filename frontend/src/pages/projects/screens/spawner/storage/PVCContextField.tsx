import React, { useState } from 'react';
import { FormGroup, FormHelperText, FormSection, Radio, TextInput } from '@patternfly/react-core';
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
                The storage context is optional and used to identify the purpose of the storage.
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
          description="General storage for all use cases."
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
          description="Helps identify where a model is stored inside your storage."
          body={
            !isGeneralPurpose && (
              <FormSection title="Model details">
                <FormGroup
                  label="Model path"
                  fieldId="storage-context-model-storage-model-path"
                  isRequired
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
                    Where in the cluster storage your model is located.
                  </FormHelperText>
                </FormGroup>
                <FormGroup label="Model name" fieldId="storage-context-model-storage-model-name">
                  <TextInput
                    id="storage-context-model-storage-model-name"
                    aria-label="Model name"
                    data-testid="model-name-input"
                    value={modelName}
                    onChange={(_, value) => setModelName(value.trim())}
                  />
                  <FormHelperText>
                    Optionally, the name of the model to help identify it later.
                  </FormHelperText>
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
