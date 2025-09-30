import React from 'react';
import { Checkbox, TextInput, StackItem, Stack, FormGroup } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { ModelTypeFieldData } from './ModelTypeSelectField';

export type AvailableAiAssetsFieldsData = {
  saveAsAiAsset: boolean;
  useCase?: string;
};

export type AvailableAiAssetsFields = {
  data: AvailableAiAssetsFieldsData;
  setData: (data: AvailableAiAssetsFieldsData) => void;
};

export const isValidAvailableAiAssetsFieldsData = (): boolean => {
  // All fields are optional (for now)
  return true;
};

export const availableAiAssetsFieldsSchema = z.custom<AvailableAiAssetsFieldsData>(() => {
  return isValidAvailableAiAssetsFieldsData();
});

export const useAvailableAiAssetsFields = (
  existingData?: AvailableAiAssetsFieldsData,
  modelType?: ModelTypeFieldData,
): AvailableAiAssetsFields => {
  const [data, setData] = React.useState<AvailableAiAssetsFieldsData>(
    existingData ?? {
      saveAsAiAsset: false,
      useCase: '',
    },
  );

  const AiAssetData = React.useMemo(() => {
    if (modelType && modelType !== ServingRuntimeModelType.GENERATIVE) {
      return {
        saveAsAiAsset: false,
        useCase: '',
      };
    }
    return data;
  }, [data, modelType]);
  return {
    data: AiAssetData,
    setData,
  };
};

type AvailableAiAssetsFieldsComponentProps = {
  data: AvailableAiAssetsFieldsData;
  setData: (data: AvailableAiAssetsFieldsData) => void;
};

export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  data,
  setData,
}) => {
  const resetAiAssetData = React.useCallback(
    (save: boolean) => {
      setData({
        saveAsAiAsset: save,
        useCase: '',
      });
    },
    [setData],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <Checkbox
          id="save-as-ai-asset-checkbox"
          data-testid="save-as-ai-asset-checkbox"
          label="Make this deployment available as an AI asset"
          isChecked={data.saveAsAiAsset}
          onChange={(_, checked) => resetAiAssetData(checked)}
        />
      </StackItem>
      {data.saveAsAiAsset && (
        <StackItem>
          <FormGroup label="Use case">
            <TextInput
              id="use-case-input"
              data-testid="use-case-input"
              value={data.useCase}
              onChange={(_, value) => setData({ ...data, useCase: value })}
            />
          </FormGroup>
        </StackItem>
      )}
    </Stack>
  );
};
