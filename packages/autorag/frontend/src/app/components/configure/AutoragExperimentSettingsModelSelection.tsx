import {
  Checkbox,
  Label,
  Spinner,
  Tab,
  TabContentBody,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { LlamaStackModelType } from '~/app/types';

type ModelTab = {
  modelType: LlamaStackModelType;
  label: string;
  testId: string;
};

const MODEL_TABS: ModelTab[] = [
  { modelType: 'llm', label: 'Foundation Models', testId: 'foundation-models-tab' },
  { modelType: 'embedding', label: 'Embedding Models', testId: 'embedding-models-tab' },
];

const AutoragExperimentSettingsModelSelection: React.FC = () => {
  const [activeModelType, setActiveModelType] = React.useState<LlamaStackModelType>('llm');
  const { namespace = '' } = useParams();

  const form = useFormContext<ConfigureSchema>();

  const llamaStackSecretName = useWatch({
    control: form.control,
    name: 'llama_stack_secret_name',
  });

  const { data: llmModelsData, isLoading: isLlmLoading } = useLlamaStackModelsQuery(
    namespace,
    llamaStackSecretName,
    'llm',
  );
  const { data: embeddingModelsData, isLoading: isEmbeddingLoading } = useLlamaStackModelsQuery(
    namespace,
    llamaStackSecretName,
    'embedding',
  );

  const isLoading = isLlmLoading || isEmbeddingLoading;

  const { field: generationModelField } = useController({
    control: form.control,
    name: 'generation_models',
  });

  const { field: embeddingModelField } = useController({
    control: form.control,
    name: 'embeddings_models',
  });

  const tabData = {
    llm: { field: generationModelField, models: llmModelsData?.models ?? [] },
    embedding: { field: embeddingModelField, models: embeddingModelsData?.models ?? [] },
  };

  return (
    <div data-testid="model-selection-section">
      <Title headingLevel="h6">
        Models to test
        <span className="pf-v6-u-text-color-required" aria-hidden="true">
          {' *'}
        </span>
      </Title>
      {isLoading ? (
        <Spinner size="md" aria-label="Loading models" />
      ) : (
        <Tabs
          activeKey={activeModelType}
          onSelect={(_, key) => {
            if (key === 'llm' || key === 'embedding') {
              setActiveModelType(key);
            }
          }}
          aria-label="Model selection tabs"
        >
          {MODEL_TABS.map(({ modelType, label, testId }) => {
            const { field, models } = tabData[modelType];
            const selectedModels = field.value;
            const selectedCount = selectedModels.filter((id) =>
              models.some((model) => model.id === id),
            ).length;
            const allSelected =
              models.length > 0 &&
              models.every((model) =>
                selectedModels.some((selectedModel) => selectedModel === model.id),
              );

            const handleSelectAll = (isSelecting: boolean) => {
              field.onChange(
                isSelecting
                  ? models.map((model) => model.id).toSorted((a, b) => a.localeCompare(b))
                  : [],
              );
            };

            const handleToggleModel = (modelId: string, isSelecting: boolean) => {
              const updated = isSelecting
                ? [...selectedModels, modelId]
                : selectedModels.filter((selectedModel) => selectedModel !== modelId);
              field.onChange(updated.toSorted((a, b) => a.localeCompare(b)));
            };

            return (
              <Tab
                key={modelType}
                eventKey={modelType}
                title={
                  <TabTitleText>
                    {label}{' '}
                    <Label
                      variant="outline"
                      color="blue"
                      isCompact
                      data-testid={`${modelType}-selected-count`}
                    >
                      {selectedCount}
                    </Label>
                  </TabTitleText>
                }
                data-testid={testId}
              >
                <TabContentBody className="pf-v6-u-pt-md">
                  {models.length === 0 ? (
                    <p>No models available.</p>
                  ) : (
                    <>
                      <Checkbox
                        id={`select-all-${modelType}`}
                        label="All available models"
                        isChecked={allSelected}
                        onChange={(_, checked) => handleSelectAll(checked)}
                        className="pf-v6-u-mb-sm"
                        data-testid={`select-all-${modelType}`}
                      />
                      <Table
                        aria-label={`${label} table`}
                        data-testid={`${modelType}-models-table`}
                      >
                        <Thead>
                          <Tr>
                            <Th />
                            <Th>Name</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {models.map((model, rowIndex) => (
                            <Tr key={model.id} data-testid={`model-row-${model.id}`}>
                              <Td
                                select={{
                                  rowIndex,
                                  isSelected: selectedModels.some(
                                    (selectedModel) => selectedModel === model.id,
                                  ),
                                  onSelect: (_, isSelecting) =>
                                    handleToggleModel(model.id, isSelecting),
                                }}
                              />
                              <Td dataLabel="Name">{model.id}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </>
                  )}
                </TabContentBody>
              </Tab>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default AutoragExperimentSettingsModelSelection;
