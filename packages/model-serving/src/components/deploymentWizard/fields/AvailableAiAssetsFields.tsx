import React from 'react';
import { Checkbox, TextInput, StackItem, Stack, FormGroup, Popover } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ModelTypeFieldData } from './ModelTypeSelectField';

export type AvailableAiAssetsFieldsData = {
  saveAsAiAsset: boolean;
  saveAsMaaS: boolean;
  useCase?: string;
};

export type AvailableAiAssetsFields = {
  data: AvailableAiAssetsFieldsData;
  setData: (data: AvailableAiAssetsFieldsData) => void;
  showField: boolean;
  showSaveAsMaaS: boolean;
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
    showSaveAsMaaS: false,
  };
};

type AvailableAiAssetsFieldsComponentProps = {
  data: AvailableAiAssetsFieldsData;
  setData: (data: AvailableAiAssetsFieldsData) => void;
  showSaveAsMaaS: boolean;
};

export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  data,
  setData,
  showSaveAsMaaS,
}) => {
  return (
    <StackItem>
      <FormGroup
        label="AI Asset"
        data-testid="ai-asset-section"
        fieldId="ai-asset"
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
              label="Make this deployment available as an AI asset"
              isChecked={data.saveAsAiAsset}
              onChange={(_, checked) => setData({ ...data, saveAsAiAsset: checked })}
            />
          </StackItem>
          {showSaveAsMaaS && (
            <StackItem>
              <Checkbox
                id="save-as-maas-checkbox"
                data-testid="save-as-maas-checkbox"
                label="Make this deployment available as a MaaS asset"
                isChecked={data.saveAsMaaS}
                onChange={(_, checked) => setData({ ...data, saveAsMaaS: checked })}
              />
            </StackItem>
          )}
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
      </FormGroup>
    </StackItem>
  );
};
