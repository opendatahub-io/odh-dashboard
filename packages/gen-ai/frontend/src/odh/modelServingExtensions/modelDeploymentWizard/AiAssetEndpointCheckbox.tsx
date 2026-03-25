import React from 'react';
import {
  Checkbox,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Label,
  FormGroup,
  TextInput,
  Content,
} from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';

export type AiAssetFieldValue = {
  saveAsAiAsset: boolean;
  useCase?: string;
};

export const aiAssetFieldSchema = z.object({
  saveAsAiAsset: z.boolean(),
  useCase: z.string().optional(),
});

const setAiAssetFieldData = (value: AiAssetFieldValue): AiAssetFieldValue => value;
const getInitialAiAssetFieldData = (value?: AiAssetFieldValue): AiAssetFieldValue =>
  value ?? { saveAsAiAsset: false, useCase: '' };

type AiAssetFieldProps = {
  id: string;
  value: AiAssetFieldValue;
  onChange: (value: AiAssetFieldValue) => void;
};

const AiAssetField: React.FC<AiAssetFieldProps> = ({ id, value, onChange }) => {
  const handleCheckboxChange = (_: React.FormEvent<HTMLInputElement>, checked: boolean): void => {
    // Clear use case when unchecking
    onChange({ saveAsAiAsset: checked, useCase: checked ? value.useCase : '' });
  };

  const handleUseCaseChange = (_: React.FormEvent<HTMLInputElement>, newValue: string): void => {
    onChange({ ...value, useCase: newValue });
  };

  return (
    <StackItem>
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            id={id}
            data-testid={id}
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
            isChecked={value.saveAsAiAsset}
            onChange={handleCheckboxChange}
          />
        </StackItem>
        {value.saveAsAiAsset && (
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
                  value={value.useCase || ''}
                  onChange={handleUseCaseChange}
                />
              </FormGroup>
            </div>
          </StackItem>
        )}
      </Stack>
    </StackItem>
  );
};

type AiAssetFieldType = WizardField<AiAssetFieldValue, undefined>;

// Fix for RHOAIENG-37896: Gate AAA checkbox behind genAiStudio feature flag
// The extension system will ensure this only renders when PLUGIN_GEN_AI area is enabled
export const AiAssetEndpointFieldWizardField: AiAssetFieldType = {
  id: 'gen-ai/save-as-ai-asset-checkbox',
  parentId: 'model-playground-availability',
  step: 'advancedOptions',
  type: 'addition',
  isActive: (wizardFormData) =>
    wizardFormData.modelType?.data?.type === ServingRuntimeModelType.GENERATIVE,
  reducerFunctions: {
    setFieldData: setAiAssetFieldData,
    getInitialFieldData: getInitialAiAssetFieldData,
    validationSchema: aiAssetFieldSchema,
  },
  component: AiAssetField,
  getReviewSections: (value) => [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'ai-asset-endpoint-enabled',
          label: 'AI asset endpoint',
          value: () => (value.saveAsAiAsset ? 'Yes' : 'No'),
        },
        ...(value.saveAsAiAsset && value.useCase
          ? [
              {
                key: 'ai-asset-use-case',
                label: 'Use case',
                value: () => value.useCase || '',
              },
            ]
          : []),
      ],
    },
  ],
};
