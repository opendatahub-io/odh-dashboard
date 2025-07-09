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
import { 
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { useNIMCompatiblePVCs, NIMPVCInfo } from './useNIMCompatiblePVCs';

type NIMPVCSelectorProps = {
  selectedModel: string;
  namespace: string;
  existingPvcName: string;
  setExistingPvcName: (name: string) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
};

const DEFAULT_MODEL_PATH = '/mnt/models/cache';

const NIMPVCSelector: React.FC<NIMPVCSelectorProps> = ({
  selectedModel,
  namespace,
  existingPvcName,
  setExistingPvcName,
  modelPath,
  setModelPath,
}) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [showManualInput, setShowManualInput] = React.useState(false);
  
  const { compatiblePVCs, loading, error } = useNIMCompatiblePVCs(namespace, selectedModel);

  // Auto-set model path when a PVC is selected
  React.useEffect(() => {
    if (existingPvcName && !showManualInput) {
      // Use the standard NIM cache path
      setModelPath(DEFAULT_MODEL_PATH);
    }
  }, [existingPvcName, showManualInput, setModelPath]);

  const formatPVCOption = (pvcInfo: NIMPVCInfo): string => {
    const age = Math.floor((Date.now() - pvcInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const ageText = age === 0 ? 'Today' : `${age}d ago`;
    
    return `${pvcInfo.pvcName} (${ageText}) - From: ${pvcInfo.servingRuntimeName}`;
  };

  const onSelect = (selection: string) => {
    // Extract PVC name from the formatted option
    const selectedPVC = compatiblePVCs.find(pvc => selection.startsWith(pvc.pvcName));
    if (selectedPVC) {
      setExistingPvcName(selectedPVC.pvcName);
    }
    setIsSelectOpen(false);
  };

  const hasCompatiblePVCs = compatiblePVCs.length > 0;

  if (loading) {
    return (
      <FormGroup label="Existing storage name" fieldId="existing-pvc-name" isRequired>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner size="sm" />
          <span>Looking for storage with {selectedModel}...</span>
        </div>
      </FormGroup>
    );
  }

  if (error) {
    return (
      <FormGroup label="Existing storage name" fieldId="existing-pvc-name" isRequired>
        <Alert variant={AlertVariant.warning} isInline title="Error loading storage">
          {error}
        </Alert>
        <TextInput
          id="existing-pvc-name"
          value={existingPvcName}
          onChange={(_event, value) => setExistingPvcName(value)}
          placeholder="Enter PVC name manually"
        />
      </FormGroup>
    );
  }

  return (
    <>
      {/* Show alert when no compatible storage found */}
      {!hasCompatiblePVCs && (
        <Alert variant={AlertVariant.info} isInline title="No compatible storage found">
          No existing storage volumes found that contain {selectedModel}.
        </Alert>
      )}

      <FormGroup label="Existing storage name" fieldId="existing-pvc-name" isRequired>
        {hasCompatiblePVCs && !showManualInput ? (
          <>
            <Select
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setIsSelectOpen(!isSelectOpen)} isExpanded={isSelectOpen}>
                  {existingPvcName ? formatPVCOption(compatiblePVCs.find(pvc => pvc.pvcName === existingPvcName) || compatiblePVCs[0]) : `Select from ${compatiblePVCs.length} storage volume(s) with ${selectedModel}`}
                </MenuToggle>
              )}
              isOpen={isSelectOpen}
              onSelect={(_event, selection) => onSelect(selection as string)}
              onOpenChange={setIsSelectOpen}
            >
              <SelectList>
                {compatiblePVCs.map((pvcInfo) => (
                  <SelectOption key={pvcInfo.pvcName} value={formatPVCOption(pvcInfo)}>
                    {formatPVCOption(pvcInfo)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <HelperText>
              <HelperTextItem variant="success">
                Found {compatiblePVCs.length} storage volume(s) that contain {selectedModel}.
              </HelperTextItem>
              <HelperTextItem>
                <button 
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  style={{ color: 'var(--pf-global--link--Color)', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Enter PVC name manually instead
                </button>
              </HelperTextItem>
            </HelperText>
          </>
        ) : (
          <>
            <TextInput
              id="existing-pvc-name"
              value={existingPvcName}
              onChange={(_event, value) => setExistingPvcName(value)}
              placeholder="Enter PVC name (e.g., nim-pvc-f75f401f3966fvfnhxw6yvfc)"
              isDisabled={!hasCompatiblePVCs && !showManualInput}
            />
            {showManualInput && hasCompatiblePVCs && (
              <HelperText>
                <HelperTextItem>
                  <button 
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    style={{ color: 'var(--pf-global--link--Color)', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Back to compatible storage list
                  </button>
                </HelperTextItem>
              </HelperText>
            )}
            {!hasCompatiblePVCs && (
              <HelperText>
                <HelperTextItem variant="warning">
                  Field disabled - no compatible storage found for {selectedModel}.
                </HelperTextItem>
              </HelperText>
            )}
          </>
        )}
      </FormGroup>

      <FormGroup label="Model path in storage" fieldId="model-path" isRequired>
        <TextInput
          id="model-path"
          value={modelPath}
          onChange={(_event, value) => setModelPath(value)}
          placeholder={DEFAULT_MODEL_PATH}
          isDisabled={!hasCompatiblePVCs && !showManualInput}
        />
        <HelperText>
          {!hasCompatiblePVCs ? (
            <HelperTextItem variant="warning">
              Field disabled - no compatible storage found for {selectedModel}.
            </HelperTextItem>
          ) : (
            <>
              <HelperTextItem>
                Path within the storage where {selectedModel} model files are located.
              </HelperTextItem>
              <HelperTextItem>
                For most NIM deployments, the default path {DEFAULT_MODEL_PATH} is correct.
              </HelperTextItem>
            </>
          )}
        </HelperText>
      </FormGroup>
    </>
  );
};

export default NIMPVCSelector;