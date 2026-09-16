import React, { useState } from 'react';
import {
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Radio,
  Skeleton,
  TextInput,
} from '@patternfly/react-core';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import {
  GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
  getContextStorageTypeExplanation,
  getPVCContextStorageType,
  MODEL_STORAGE_PVC_CONTEXT_TYPE,
  StorageContextType,
} from '#~/pages/projects/screens/detail/storage/useStorageContextType';

export const PVCContextFieldSkeleton: React.FC = () => (
  <FormGroup label="Storage context" fieldId="storage-context">
    <Skeleton height="80px" screenreaderText="Loading storage context options" />
  </FormGroup>
);

type PVCContextFieldProps = {
  setModelName: (name: string) => void;
  setModelPath: (path: string) => void;
  modelName: string;
  modelPath: string;
  setValid: (isValid: boolean) => void;
  removeModelAnnotations: () => void;
  existingPvc?: PersistentVolumeClaimKind;
  storageContextTypes?: StorageContextType[];
  setContextTypeAnnotations: (annotations: Record<string, string>) => void;
};

const PVCContextField: React.FC<PVCContextFieldProps> = ({
  setModelName,
  setModelPath,
  modelName,
  modelPath,
  setValid,
  removeModelAnnotations,
  existingPvc,
  storageContextTypes,
  setContextTypeAnnotations,
}) => {
  const [contextType, setContextType] = useState<StorageContextType>(() =>
    existingPvc
      ? getPVCContextStorageType(existingPvc, storageContextTypes)
      : GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
  );

  // Scope limitation: extension-provided context types (which use `fields`) only support editing and cannot change.
  const existingExtensionContextType = existingPvc
    ? storageContextTypes?.find(
        (type) => type.fields && type.isPVCUsingStorageContextType?.(existingPvc),
      )
    : undefined;
  const isLocked = !!(existingExtensionContextType && existingPvc);

  const validatePath = (path: string) => {
    const trimmedPath = path.trim();
    const pathRegex = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\/?$/;
    if (
      contextType.title === GENERAL_PURPOSE_PVC_CONTEXT_TYPE.title ||
      (trimmedPath && pathRegex.test(trimmedPath))
    ) {
      setValid(true);
    } else {
      setValid(false);
    }
  };

  const SettingsFields = existingExtensionContextType?.fields;

  return (
    <FormGroup
      label="Storage context"
      fieldId="storage-context"
      labelHelp={
        <FieldGroupHelpLabelIcon
          content={
            <p>
              {isLocked
                ? 'The context indicates the purpose of the storage. It cannot be changed.'
                : getContextStorageTypeExplanation(
                    storageContextTypes || [
                      GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
                      MODEL_STORAGE_PVC_CONTEXT_TYPE,
                    ],
                  )}
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
        label={GENERAL_PURPOSE_PVC_CONTEXT_TYPE.title}
        description={GENERAL_PURPOSE_PVC_CONTEXT_TYPE.description}
        isChecked={contextType.title === GENERAL_PURPOSE_PVC_CONTEXT_TYPE.title}
        isDisabled={isLocked}
        onChange={() => {
          setContextType(GENERAL_PURPOSE_PVC_CONTEXT_TYPE);
          setValid(true);
          removeModelAnnotations();
        }}
      />
      <br />
      <Radio
        value="model-storage"
        name="storage-context-model-storage-radio"
        id="storage-context-model-storage-radio"
        data-testid="model-storage-radio"
        label={MODEL_STORAGE_PVC_CONTEXT_TYPE.title}
        description={MODEL_STORAGE_PVC_CONTEXT_TYPE.description}
        isChecked={contextType.title === MODEL_STORAGE_PVC_CONTEXT_TYPE.title}
        isDisabled={isLocked}
        onChange={() => {
          setContextType(MODEL_STORAGE_PVC_CONTEXT_TYPE);
          if (!modelPath.trim()) {
            setValid(false);
          } else {
            validatePath(modelPath);
          }
        }}
        body={
          contextType.title === MODEL_STORAGE_PVC_CONTEXT_TYPE.title && (
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
                      Enter a path to your model or a folder containing your model. The path cannot
                      point to a root folder.
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
      {existingExtensionContextType && existingPvc ? (
        <>
          <br />
          <Radio
            value="extension-context"
            name="storage-context-extension-radio"
            id="storage-context-extension-radio"
            data-testid="extension-context-radio"
            label={existingExtensionContextType.title}
            description={existingExtensionContextType.description}
            isChecked={contextType.title === existingExtensionContextType.title}
            isDisabled
            body={
              SettingsFields ? (
                <SettingsFields existingPvc={existingPvc} onChange={setContextTypeAnnotations} />
              ) : null
            }
          />
        </>
      ) : null}
    </FormGroup>
  );
};

export default PVCContextField;
