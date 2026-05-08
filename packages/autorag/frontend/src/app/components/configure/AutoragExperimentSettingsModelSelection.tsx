import {
  Label,
  Pagination,
  Popover,
  Spinner,
  Tab,
  TabAction,
  TabContentBody,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, ThProps, Thead, Tr } from '@patternfly/react-table';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import './AutoragExperimentSettingsModelSelection.scss';
import { useParams } from 'react-router';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { LlamaStackModelType } from '~/app/types';

type ModelTab = {
  modelType: LlamaStackModelType;
  label: string;
  popoverHeader: string;
  description: string;
  testId: string;
};

const MODEL_TABS: ModelTab[] = [
  {
    modelType: 'llm',
    label: 'Foundation models',
    popoverHeader: 'Foundation models',
    description: 'Generates responses using retrieved context.',
    testId: 'foundation-models-tab',
  },
  {
    modelType: 'embedding',
    label: 'Embedding models',
    popoverHeader: 'Embedding models',
    description: 'Converts documents and queries into vectors for retrieval.',
    testId: 'embedding-models-tab',
  },
];

const DEFAULT_PER_PAGE = 5;

const AutoragExperimentSettingsModelSelection: React.FC = () => {
  const [activeModelType, setActiveModelType] = React.useState<LlamaStackModelType>('llm');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
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

  const activeModels = tabData[activeModelType].models;

  const sortedAndPaginatedModels = React.useMemo(() => {
    const sorted = activeModels.toSorted((a, b) =>
      sortDirection === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id),
    );
    return sorted.slice((page - 1) * perPage, page * perPage);
  }, [activeModels, sortDirection, page, perPage]);

  const getSortParams = (): ThProps['sort'] => ({
    sortBy: { index: 0, direction: sortDirection },
    onSort: (_e, _index, direction) => {
      setSortDirection(direction);
      setPage(1);
    },
    columnIndex: 0,
  });

  return (
    <div data-testid="model-selection-section">
      {isLoading ? (
        <Spinner size="md" aria-label="Loading models" />
      ) : (
        <Tabs
          activeKey={activeModelType}
          onSelect={(_, key) => {
            if (key === 'llm' || key === 'embedding') {
              setActiveModelType(key);
              setPage(1);
              setSortDirection('asc');
            }
          }}
          aria-label="Model selection tabs"
        >
          {MODEL_TABS.map(({ modelType, label, popoverHeader, description, testId }) => {
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
                      className="pf-v6-u-ml-xs"
                      data-testid={`${modelType}-selected-count`}
                    >
                      {selectedCount}
                    </Label>
                  </TabTitleText>
                }
                actions={
                  <TabAction>
                    <Popover headerContent={popoverHeader} bodyContent={description}>
                      <DashboardPopupIconButton
                        aria-label={`More info for ${label.toLowerCase()}`}
                        icon={<OutlinedQuestionCircleIcon />}
                        hasNoPadding
                      />
                    </Popover>
                  </TabAction>
                }
                data-testid={testId}
              >
                <TabContentBody className="pf-v6-u-pt-md">
                  {models.length === 0 ? (
                    <p>No models available.</p>
                  ) : (
                    <>
                      <Pagination
                        itemCount={models.length}
                        perPage={perPage}
                        page={page}
                        onSetPage={(_e, newPage) => setPage(newPage)}
                        onPerPageSelect={(_e, newPerPage) => {
                          setPerPage(newPerPage);
                          setPage(1);
                        }}
                        variant="top"
                        isCompact
                        data-testid={`${modelType}-pagination`}
                      />
                      <div className="autorag-model-selection__table-container">
                        <Table
                          aria-label={`${label} table`}
                          data-testid={`${modelType}-models-table`}
                          isStickyHeader
                        >
                          <Thead>
                            <Tr>
                              <Th
                                select={{
                                  onSelect: (_e, isSelecting) => handleSelectAll(isSelecting),
                                  isSelected: allSelected,
                                }}
                              />
                              <Th sort={getSortParams()}>Model name</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {sortedAndPaginatedModels.map((model, rowIndex) => (
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
                                <Td dataLabel="Model name">{model.id}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </div>
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
