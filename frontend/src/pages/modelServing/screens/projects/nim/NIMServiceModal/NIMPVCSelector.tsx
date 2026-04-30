import React from 'react';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  TextInput,
  Spinner,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { relativeTime } from '#~/utilities/time';
import { useNIMCompatiblePVCs, NIMPVCInfo } from './useNIMCompatiblePVCs';

type NIMPVCSelectorProps = {
  selectedModel: string;
  namespace: string;
  existingPvcName: string;
  setExistingPvcName: (name: string) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
  // NEW: subPath support for multi-model PVCs
  pvcSubPath: string;
  setPvcSubPath: (path: string) => void;
};

const DEFAULT_MODEL_PATH = '/mnt/models/cache';

const NIMPVCSelector: React.FC<NIMPVCSelectorProps> = ({
  selectedModel,
  namespace,
  existingPvcName,
  setExistingPvcName,
  modelPath,
  setModelPath,
  pvcSubPath,
  setPvcSubPath,
}) => {
  const [showManualInput, setShowManualInput] = React.useState(false);

  const { compatiblePVCs, loading, error } = useNIMCompatiblePVCs(namespace, selectedModel);

  // Clear existing PVC name when model changes and the selected PVC is not compatible
  React.useEffect(() => {
    if (existingPvcName && !loading && !showManualInput && hasCompatiblePVCs) {
      const isCurrentPvcCompatible = compatiblePVCs.some((pvc) => pvc.pvcName === existingPvcName);
      if (!isCurrentPvcCompatible) {
        setExistingPvcName('');
      }
    }
  }, [compatiblePVCs, existingPvcName, loading, showManualInput, setExistingPvcName]);

  // Auto-set model path when a PVC is selected (only if not manually entered)
  React.useEffect(() => {
    if (existingPvcName && !showManualInput && !modelPath) {
      setModelPath(DEFAULT_MODEL_PATH);
    }
  }, [existingPvcName, showManualInput, modelPath, setModelPath]);

  const formatPVCOption = (pvcInfo: NIMPVCInfo): string => {
    const ageText = relativeTime(Date.now(), pvcInfo.createdAt.getTime());
    return `${pvcInfo.pvcName} (${ageText}) - From: ${pvcInfo.servingRuntimeName}`;
  };

  const onSelect = (key: string) => {
    const selectedPVC = compatiblePVCs.find((pvc) => pvc.pvcName === key);
    if (selectedPVC) {
      setExistingPvcName(selectedPVC.pvcName);
    }
  };

  const hasCompatiblePVCs = compatiblePVCs.length > 0;

  if (loading) {
    return (
      <FormGroup label="Existing storage name" fieldId="existing-pvc-name" isRequired>
        <div
          data-testid="pvc-loading-spinner"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Spinner size="sm" />
          <span>Looking for storage with {selectedModel}...</span>
        </div>
      </FormGroup>
    );
  }

  if (error) {
    return (
      <FormGroup label="Existing storage name" fieldId="existing-pvc-name" isRequired>
        <Alert
          data-testid="pvc-loading-error-alert"
          variant={AlertVariant.warning}
          isInline
          title="Error loading storage"
        >
          {error}
        </Alert>
        <TextInput
          data-testid="manual-pvc-input-error"
          id="existing-pvc-name"
          value={existingPvcName}
          onChange={(_event, value) => setExistingPvcName(value)}
          placeholder="Enter PVC name manually"
        />
      </FormGroup>
    );
  }

  const selectOptions: SimpleSelectOption[] = compatiblePVCs.map((pvcInfo) => ({
    key: pvcInfo.pvcName,
    label: formatPVCOption(pvcInfo),
    description: `Created from ${pvcInfo.servingRuntimeName}`,
  }));

  return (
    <>
      {/* Info when no compatible storage found - but still allow manual entry */}
      {!hasCompatiblePVCs && !showManualInput && (
        <Alert
          data-testid="no-compatible-pvcs-alert"
          variant={AlertVariant.info}
          isInline
          title="No compatible storage found"
        >
          {selectedModel
            ? `No existing storage volumes found that contain ${selectedModel}. Enter your PVC name below.`
            : 'Enter the name of your PVC that contains pre-downloaded model files.'}
        </Alert>
      )}

      <FormGroup
        data-testid="pvc-selection-section"
        label="Existing storage name"
        fieldId="existing-pvc-name"
        isRequired
      >
        {/* Show dropdown when compatible PVCs exist AND manual mode is not active */}
        {hasCompatiblePVCs && !showManualInput ? (
          <>
            <SimpleSelect
              data-testid="existing-pvc-select"
              options={selectOptions}
              value={existingPvcName}
              onChange={onSelect}
              placeholder={`Select from ${compatiblePVCs.length} storage volume(s) with ${selectedModel}`}
            />
            <HelperText>
              <HelperTextItem data-testid="compatible-pvcs-found-message" variant="success">
                Found {compatiblePVCs.length} storage volume(s) that contain {selectedModel}.
              </HelperTextItem>
              <HelperTextItem>
                <button
                  data-testid="use-manual-pvc-button"
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  style={{
                    color: 'var(--pf-global--link--Color)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Enter PVC name manually instead
                </button>
              </HelperTextItem>
            </HelperText>
          </>
        ) : (
          <>
            <TextInput
              data-testid="manual-pvc-input"
              id="existing-pvc-name"
              value={existingPvcName}
              onChange={(_event, value) => setExistingPvcName(value)}
              placeholder="Enter PVC name (e.g., nim-air-gapped-multi-llm)"
              isDisabled={false} // ← ALWAYS ENABLED!
            />
            {showManualInput && hasCompatiblePVCs && (
              <HelperText>
                <HelperTextItem>
                  <button
                    data-testid="back-to-compatible-list-button"
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    style={{
                      color: 'var(--pf-global--link--Color)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Back to compatible storage list
                  </button>
                </HelperTextItem>
              </HelperText>
            )}
            <HelperText>
              <HelperTextItem data-testid="manual-entry-helper">
                Enter the name of your PVC that contains pre-downloaded NIM model files.
              </HelperTextItem>
            </HelperText>
          </>
        )}
      </FormGroup>
      <FormGroup
        data-testid="pvc-subpath-section"
        label="PVC subPath (optional)"
        fieldId="pvc-subpath"
      >
        <TextInput
          data-testid="pvc-subpath-input"
          id="pvc-subpath"
          value={pvcSubPath}
          onChange={(_event, value) => setPvcSubPath(value)}
          placeholder="/llama-3.1-8b-instruct"
          isDisabled={false} // ← Always enabled
        />
        <HelperText>
          <HelperTextItem data-testid="subpath-description">
            Optional: Subdirectory within the PVC. Use this if you have multiple models stored in
            the same PVC (e.g., /llama-3.1-8b-instruct, /mistral-7b). Leave empty to use the root of
            the PVC.
          </HelperTextItem>
        </HelperText>
      </FormGroup>
      <FormGroup
        data-testid="model-path-section"
        label="Model path in storage"
        fieldId="model-path"
        isRequired
      >
        <TextInput
          data-testid="model-path-input"
          id="model-path"
          value={modelPath}
          onChange={(_event, value) => setModelPath(value)}
          placeholder={DEFAULT_MODEL_PATH}
          isDisabled={false} // ← ALWAYS ENABLED!
        />
        <HelperText>
          <HelperTextItem data-testid="model-path-description">
            Path within the container where the model files will be mounted. For model cache
            deployments, use {DEFAULT_MODEL_PATH}.
          </HelperTextItem>
        </HelperText>
      </FormGroup>
    </>
  );
};

export default NIMPVCSelector;
