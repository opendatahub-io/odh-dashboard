import React from 'react';
import { Checkbox, TextInput, StackItem, Stack, FormGroup, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { ModelTypeFieldData } from './ModelTypeSelectField';

export type ModelAvailabilityFieldsData = {
  saveAsAiAsset: boolean;
  useCase?: string;
};

export type ModelAvailabilityFields = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  isGenAiEnabled: boolean;
  showField?: boolean;
  showSaveAsMaaS?: boolean;
  isDisabled?: boolean;
};

export const isValidModelAvailabilityFieldsData = (): boolean => {
  // All fields are optional (for now)
  return true;
};

export const modelAvailabilityFieldsSchema = z.custom<ModelAvailabilityFieldsData>(() => {
  return isValidModelAvailabilityFieldsData();
});

export const useModelAvailabilityFields = (
  existingData?: ModelAvailabilityFieldsData,
  modelType?: ModelTypeFieldData,
): ModelAvailabilityFields => {
  const isGenAiEnabled = useIsAreaAvailable(SupportedArea.PLUGIN_GEN_AI).status;

  const [data, setData] = React.useState<ModelAvailabilityFieldsData>(
    existingData ?? {
      saveAsAiAsset: true,
      useCase: '',
    },
  );

  const AiAssetData = React.useMemo(() => {
    if (modelType && modelType.type !== ServingRuntimeModelType.GENERATIVE) {
      return {
        saveAsAiAsset: false,
        useCase: '',
      };
    }
    if (!isGenAiEnabled) {
      return { ...data, saveAsAiAsset: false, useCase: '' };
    }
    return data;
  }, [data, modelType, isGenAiEnabled]);

  return {
    data: AiAssetData,
    setData,
    isGenAiEnabled,
    showField: modelType?.type === ServingRuntimeModelType.GENERATIVE,
  };
};

type GenAiStudioAvailabilityFieldsProps = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  isDisabled?: boolean;
};

export const GenAiStudioAvailabilityFields: React.FC<GenAiStudioAvailabilityFieldsProps> = ({
  data,
  setData,
  isDisabled = false,
}) => {
  const setDataWithClearUseCase = React.useCallback(
    (newData: ModelAvailabilityFieldsData) => {
      if (!newData.saveAsAiAsset) {
        setData({ ...newData, useCase: '' });
      } else {
        setData(newData);
      }
    },
    [setData],
  );

  return (
    <StackItem>
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            id="save-as-ai-asset-checkbox"
            data-testid="save-as-ai-asset-checkbox"
            label="Gen AI studio"
            description={
              <>
                Model endpoints are accessible from the <b>AI asset endpoints</b> page, which makes
                the model available on the <b>Playground</b> page.
              </>
            }
            isChecked={data.saveAsAiAsset}
            isDisabled={isDisabled}
            onChange={(_, checked) => setDataWithClearUseCase({ ...data, saveAsAiAsset: checked })}
          />
        </StackItem>
        {data.saveAsAiAsset && (
          <StackItem>
            <div className="pf-v6-u-ml-lg">
              <FormGroup
                label="Use case"
                labelHelp={
                  <Popover bodyContent="Enter the types of tasks that your model performs, such as chat, multimodal, or natural language processing.">
                    <OutlinedQuestionCircleIcon />
                  </Popover>
                }
              >
                <TextInput
                  id="use-case-input"
                  data-testid="use-case-input"
                  value={data.useCase}
                  onChange={(_, value) => setData({ ...data, useCase: value })}
                />
              </FormGroup>
            </div>
          </StackItem>
        )}
      </Stack>
    </StackItem>
  );
};
