import { Spinner, Tab, TabContentBody, Tabs, TabTitleText, Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { LlamaStackModelType } from '~/app/types';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';

type ModelTab = {
  modelType: LlamaStackModelType;
  label: string;
  testId: string;
};

const MODEL_TABS: ModelTab[] = [
  { modelType: 'llm', label: 'Foundation Models', testId: 'foundation-models-tab' },
  { modelType: 'embedding', label: 'Embedding Models', testId: 'embedding-models-tab' },
];

const ExperimentSettingsModelSelection: React.FC = () => {
  const [activeModelType, setActiveModelType] = React.useState<LlamaStackModelType>('llm');

  const { control } = useFormContext<ConfigureSchema>();
  const { data: llamaStackModels, isLoading } = useLlamaStackModelsQuery();

  const { field: generationModelField } = useController({
    control,
    name: 'generation_constraints',
  });

  const { field: embeddingModelField } = useController({
    control,
    name: 'embeddings_constraints',
  });

  const tabData = {
    llm: { field: generationModelField, models: llamaStackModels?.llm ?? [] },
    embedding: { field: embeddingModelField, models: llamaStackModels?.embedding ?? [] },
  };

  return (
    <div data-testid="model-selection-section">
      <Title headingLevel="h2">Models to test</Title>
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
            const selectedModels = field.value ?? [];
            const allSelected =
              models.length > 0 &&
              models.every((model) =>
                selectedModels.some((selectedModel) => selectedModel.model === model.id),
              );

            const handleSelectAll = (isSelecting: boolean) => {
              field.onChange(isSelecting ? models.map((model) => ({ model: model.id })) : []);
            };

            const handleToggleModel = (modelId: string, isSelecting: boolean) => {
              field.onChange(
                isSelecting
                  ? [...selectedModels, { model: modelId }]
                  : selectedModels.filter((selectedModel) => selectedModel.model !== modelId),
              );
            };

            return (
              <Tab
                key={modelType}
                eventKey={modelType}
                title={<TabTitleText>{label}</TabTitleText>}
                data-testid={testId}
              >
                <TabContentBody hasPadding>
                  {models.length === 0 ? (
                    <p>No models available.</p>
                  ) : (
                    <Table aria-label={`${label} table`} data-testid={`${modelType}-models-table`}>
                      <Thead>
                        <Tr>
                          <Th
                            select={{
                              isSelected: allSelected,
                              onSelect: (_, isSelecting) => handleSelectAll(isSelecting),
                            }}
                          />
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
                                  (selectedModel) => selectedModel.model === model.id,
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

export default ExperimentSettingsModelSelection;
