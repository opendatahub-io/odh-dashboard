import React from 'react';
import { StackItem, Stack } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { GenericFieldRenderer } from './GenericFieldRenderer';
import type { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import type { ExternalDataMap } from '../ExternalDataLoader';

// DEPRECATED: This type is maintained for backward compatibility with existing code.
// AAA checkbox data is now handled by the gen-ai package via WizardField2Extension.
// MaaS checkbox data is handled by the maas package via WizardField2Extension.
// See: RHOAIENG-37896
export type ModelAvailabilityFieldsData = {
  saveAsAiAsset: boolean;
  saveAsMaaS?: boolean;
  useCase?: string;
};

export type ModelAvailabilityFields = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  showField?: boolean;
  showSaveAsMaaS?: boolean;
};

export const isValidModelAvailabilityFieldsData = (): boolean => {
  // All fields are optional (for now)
  return true;
};

export const modelAvailabilityFieldsSchema = z.custom<ModelAvailabilityFieldsData>(() => {
  return isValidModelAvailabilityFieldsData();
});

// DEPRECATED: This hook is maintained for backward compatibility.
// Model availability fields are now managed by extensions (gen-ai and maas packages).
// See: RHOAIENG-37896
export const useModelAvailabilityFields = (
  existingData?: ModelAvailabilityFieldsData,
  modelType?: ModelTypeFieldData,
): ModelAvailabilityFields => {
  const [data, setData] = React.useState<ModelAvailabilityFieldsData>(
    existingData ?? {
      saveAsAiAsset: false,
      useCase: '',
    },
  );

  const AiAssetData = React.useMemo(() => {
    if (modelType && modelType.type !== ServingRuntimeModelType.GENERATIVE) {
      return {
        saveAsAiAsset: false,
        saveAsMaaS: undefined,
        useCase: '',
      };
    }
    return data;
  }, [data, modelType]);

  return {
    data: AiAssetData,
    setData,
    showField: modelType?.type === ServingRuntimeModelType.GENERATIVE,
  };
};

// RHOAIENG-37896: data and setData are now optional for backward compatibility
// The component no longer uses these props directly; extensions handle the data
type AvailableAiAssetsFieldsComponentProps = {
  data?: ModelAvailabilityFieldsData;
  setData?: (data: ModelAvailabilityFieldsData) => void;
  wizardState: UseModelDeploymentWizardState;
  externalData?: ExternalDataMap;
};

// Fix for RHOAIENG-37896: AAA checkbox is now rendered via gen-ai package extension
// This component now only renders extension-based fields (AAA and MaaS checkboxes)
export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  wizardState,
  externalData,
}) => {
  return (
    <StackItem>
      <Stack hasGutter>
        <GenericFieldRenderer
          parentId="model-playground-availability"
          wizardState={wizardState}
          externalData={externalData}
        />
      </Stack>
    </StackItem>
  );
};
