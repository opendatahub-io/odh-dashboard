import React from 'react';
import {
  Checkbox,
  TextInput,
  StackItem,
  Stack,
  FormGroup,
  Popover,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { OnUnRender } from '../dynamicFormUtils';

export type ModelAvailabilityFieldsData = {
  saveAsAiAsset: boolean;
  saveAsMaaS: boolean;
  useCase?: string;
};

export type ModelAvailabilityFields = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  showField: boolean;
  showSaveAsMaaS: boolean;
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
  const [data, setData] = React.useState<ModelAvailabilityFieldsData>(
    existingData ?? {
      saveAsAiAsset: false,
      saveAsMaaS: false,
      useCase: '',
    },
  );

  const AiAssetData = React.useMemo(() => {
    if (modelType && modelType !== ServingRuntimeModelType.GENERATIVE) {
      return {
        saveAsAiAsset: false,
        saveAsMaaS: false,
        useCase: '',
      };
    }
    return data;
  }, [data, modelType]);

  return {
    data: AiAssetData,
    setData,
    showField: modelType === ServingRuntimeModelType.GENERATIVE,
    showSaveAsMaaS: false, // Hide by default, unless an extension modifies it
  };
};

type AvailableAiAssetsFieldsComponentProps = {
  data: ModelAvailabilityFieldsData;
  setData: (data: ModelAvailabilityFieldsData) => void;
  showSaveAsMaaS: boolean;
};

export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  data,
  setData,
  showSaveAsMaaS,
}) => {
  const setDataWithClearUseCase = React.useCallback(
    (originalData: ModelAvailabilityFieldsData) => {
      if (!data.saveAsAiAsset && !data.saveAsMaaS) {
        setData({ ...originalData, useCase: '' });
      } else {
        setData(originalData);
      }
    },
    [setData],
  );

  return (
    <StackItem>
      <FormGroup
        label="Model Availability"
        data-testid="model-availability-section"
        fieldId="model-availability"
        labelHelp={
          <Popover bodyContent="POPOVER BODY CONTENT" headerContent="POPOVER HEADER CONTENT">
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
      >
        <Stack hasGutter>
          <StackItem>
            <Checkbox
              id="save-as-ai-asset-checkbox"
              data-testid="save-as-ai-asset-checkbox"
              label={
                <Flex>
                  <FlexItem>Make this deployment available as an AI asset</FlexItem>
                  <Label isCompact color="yellow" variant="outline">
                    Tech Preview
                  </Label>
                </Flex>
              }
              isChecked={data.saveAsAiAsset}
              onChange={(_, checked) =>
                setDataWithClearUseCase({ ...data, saveAsAiAsset: checked })
              }
            />
          </StackItem>
          {showSaveAsMaaS && (
            <OnUnRender callback={() => setData({ ...data, saveAsMaaS: false })}>
              <StackItem>
                <Checkbox
                  id="save-as-maas-checkbox"
                  data-testid="save-as-maas-checkbox"
                  label={
                    <Flex>
                      <FlexItem>Make this deployment available as a MaaS asset</FlexItem>
                      <Label isCompact color="yellow" variant="outline">
                        Developer Preview
                      </Label>
                    </Flex>
                  }
                  isChecked={data.saveAsMaaS}
                  onChange={(_, checked) =>
                    setDataWithClearUseCase({ ...data, saveAsMaaS: checked })
                  }
                />
              </StackItem>
            </OnUnRender>
          )}
          {(data.saveAsAiAsset || (showSaveAsMaaS && data.saveAsMaaS)) && (
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
      </FormGroup>
    </StackItem>
  );
};
