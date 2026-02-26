import {
  Checkbox,
  Spinner,
  Tab,
  TabContentBody,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
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

  // eslint-disable-next-line camelcase
  const { field: generationModelField } = useController({
    control,
    name: 'generation_constraints',
  });

  // eslint-disable-next-line camelcase
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
      <Title headingLevel="h2">Model selection</Title>
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
                    models.map((model) => (
                      <Checkbox
                        key={model.id}
                        id={`model-${modelType}-${model.id}`}
                        label={model.id}
                        isChecked={(field.value ?? []).some((c) => c.model === model.id)}
                        onChange={(_, checked) => {
                          const current = field.value ?? [];
                          field.onChange(
                            checked
                              ? [...current, { model: model.id }]
                              : current.filter((c) => c.model !== model.id),
                          );
                        }}
                        data-testid={`model-checkbox-${model.id}`}
                      />
                    ))
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
