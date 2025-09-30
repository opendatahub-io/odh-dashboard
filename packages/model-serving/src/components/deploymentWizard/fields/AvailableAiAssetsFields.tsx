import React from 'react';
import { Checkbox, TextInput, StackItem, Stack, FormGroup, Popover } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

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
  wizardData: UseModelDeploymentWizardState;
};

export const AvailableAiAssetsFieldsComponent: React.FC<AvailableAiAssetsFieldsComponentProps> = ({
  data,
  setData,
  wizardData,
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
  const showSaveAsAiAsset = React.useMemo(() => {
    if (wizardData.state.modelType.data === ServingRuntimeModelType.GENERATIVE) return true;
    return false;
  }, [wizardData.state.modelType.data]);

  return showSaveAsAiAsset ? (
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
      </FormGroup>
    </StackItem>
  ) : null;
};
