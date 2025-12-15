import React from 'react';
import {
  Checkbox,
  TextInput,
  StackItem,
  Stack,
  FormGroup,
  Label,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { ModelServerSelectFieldData, isModelAvailabilityField } from '../types';
import { useWizardFieldFromExtension } from '../dynamicFormUtils';

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

export const useModelAvailabilityFields = (
  existingData?: ModelAvailabilityFieldsData,
  modelType?: ModelTypeFieldData,
  modelServer?: ModelServerSelectFieldData,
): ModelAvailabilityFields => {
  const modelAvailabilityExtension = useWizardFieldFromExtension(isModelAvailabilityField, {
    modelType: { data: modelType },
    modelServer: { data: modelServer },
  });
  const [data, setData] = React.useState<ModelAvailabilityFieldsData>(
    existingData ?? {
      saveAsAiAsset: false,
      saveAsMaaS: undefined,
      useCase: '',
    },
  );

  const AiAssetData = React.useMemo(() => {
    if (modelType && modelType !== ServingRuntimeModelType.GENERATIVE) {
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
    showField: modelType === ServingRuntimeModelType.GENERATIVE,
    showSaveAsMaaS: modelAvailabilityExtension?.showSaveAsMaaS,
  };
};

type AvailableAiAssetsFieldsComponentProps = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  showSaveAsMaaS?: boolean;
};

export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  data,
  setData,
  showSaveAsMaaS,
}) => {
  const setDataWithClearUseCase = React.useCallback(
    (newData: ModelAvailabilityFieldsData) => {
      if (!newData.saveAsAiAsset && !newData.saveAsMaaS) {
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
            label={
              <>
                <div className="pf-v6-c-form__label-text">Add as AI asset endpoint</div>
                <Flex>
                  <FlexItem>
                    Enable users in your namespace to test this model in the playground by adding
                    its endpoint to the{' '}
                    <span className="pf-v6-c-form__label-text">AI asset endpoints</span> page.
                  </FlexItem>
                  <Label isCompact color="yellow" variant="outline">
                    Tech preview
                  </Label>
                </Flex>
              </>
            }
            isChecked={data.saveAsAiAsset}
            onChange={(_, checked) => setDataWithClearUseCase({ ...data, saveAsAiAsset: checked })}
          />
        </StackItem>
        {showSaveAsMaaS && (
          <StackItem>
            <Checkbox
              id="save-as-maas-checkbox"
              data-testid="save-as-maas-checkbox"
              label={
                <>
                  <div className="pf-v6-c-form__label-text">Add as MaaS endpoint</div>
                  <Flex>
                    <FlexItem>
                      Enable users in any namespace to access this model by adding its endpoint to
                      the <span className="pf-v6-c-form__label-text">Models as a service</span>{' '}
                      page. This is best for production models.
                    </FlexItem>
                    <Label isCompact color="yellow" variant="outline">
                      Developer preview
                    </Label>
                  </Flex>
                </>
              }
              isChecked={data.saveAsMaaS}
              onChange={(_, checked) => setDataWithClearUseCase({ ...data, saveAsMaaS: checked })}
            />
          </StackItem>
        )}
        {(data.saveAsAiAsset || (showSaveAsMaaS && data.saveAsMaaS)) && (
          <StackItem>
            <div style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}>
              <FormGroup label="Use case">
                <Content style={{ marginTop: '-8px' }}>
                  Enter the types of tasks that your model performs, such as chat, multimodal, or
                  natural language processing.
                </Content>
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
