import React from 'react';
import {
  Form,
  Checkbox,
  TextInput,
  StackItem,
  Stack,
  Popover,
  FormGroup,
} from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

export type AvailableAiAssetsFieldsData = {
  saveAsAAA: boolean;
  useCase?: string;
  description?: string;
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
): AvailableAiAssetsFields => {
  const [data, setData] = React.useState<AvailableAiAssetsFieldsData>(
    existingData ?? {
      saveAsAAA: false,
      useCase: '',
      description: '',
    },
  );
  return {
    data,
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
  const resetAAAData = React.useCallback(
    (save: boolean) => {
      setData({
        saveAsAAA: save,
        useCase: '',
        description: '',
      });
    },
    [setData],
  );
  const showSaveAsAAA = React.useMemo(() => {
    if (wizardData.state.modelType.data === ServingRuntimeModelType.GENERATIVE) return true;
    resetAAAData(false);
    return false;
  }, [data.saveAsAAA, wizardData.state.modelType.data]);

  return (
    <>
      {showSaveAsAAA && (
        <Form maxWidth="450px">
          <FormGroup
            label="AI Asset"
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
                  id="save-as-aaa-checkbox"
                  data-testid="save-as-aaa-checkbox"
                  label="Make this deployment available as an AI asset"
                  isChecked={data.saveAsAAA}
                  onChange={(_, checked) => resetAAAData(checked)}
                />
              </StackItem>
              <StackItem>
                <TextInput
                  id="use-case-input"
                  data-testid="use-case-input"
                  isDisabled={!data.saveAsAAA}
                  placeholder="Use case"
                  value={data.useCase}
                  onChange={(_, value) => setData({ ...data, useCase: value })}
                  label="Use case"
                />
              </StackItem>
            </Stack>
          </FormGroup>
        </Form>
      )}
    </>
  );
};
