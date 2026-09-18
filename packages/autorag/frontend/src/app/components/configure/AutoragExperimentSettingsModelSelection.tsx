import {
  CodeBlock,
  CodeBlockCode,
  Checkbox,
  Content,
  Flex,
  Label,
  Pagination,
  Popover,
  Stack,
  StackItem,
  Skeleton,
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
import './AutoragExperimentSettingsModelSelection.scss';
import type { MaaSModel } from '~/app/types';

type ModelTab = {
  modelType: 'llm' | 'embedding';
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

const MODEL_CATALOG_HELP_INTRO =
  'To verify model details, including language support, view the models in the Model catalog.';

const MODEL_TOOL_CALL_PARSER_HELP =
  'For multilingual AutoRAG setups, you must enable a tool-call parser on the model server. To ensure tooling functions correctly, redeploy the model with:';

/** Runtime args to enable tool calling; full deploy command varies by model. */
const MODEL_TOOL_CALL_PARSER_ARGS = '--enable-auto-tool-choice --tool-call-parser=mistral';

const ModelsToTestHelpContent: React.FC = () => (
  <Stack hasGutter>
    <StackItem>
      <Content component="p">{MODEL_CATALOG_HELP_INTRO}</Content>
    </StackItem>
    <StackItem>
      <Content component="p">{MODEL_TOOL_CALL_PARSER_HELP}</Content>
    </StackItem>
    <StackItem>
      <CodeBlock>
        <CodeBlockCode data-testid="models-to-test-tool-call-parser-args">
          {MODEL_TOOL_CALL_PARSER_ARGS}
        </CodeBlockCode>
      </CodeBlock>
    </StackItem>
  </Stack>
);

const DEFAULT_PER_PAGE = 5;

type AutoragExperimentSettingsModelSelectionProps = {
  generationModels: string[];
  embeddingModels: string[];
  onGenerationModelsChange: (models: string[]) => void;
  onEmbeddingModelsChange: (models: string[]) => void;
  models: MaaSModel[];
  modelsLoaded: boolean;
  modelsLoading: boolean;
};

const AutoragExperimentSettingsModelSelection: React.FC<
  AutoragExperimentSettingsModelSelectionProps
> = ({
  generationModels,
  embeddingModels,
  onGenerationModelsChange,
  onEmbeddingModelsChange,
  models,
  modelsLoaded,
  modelsLoading,
}) => {
  const [activeModelType, setActiveModelType] = React.useState<'llm' | 'embedding'>('llm');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const availableMaaSModels = models;
  const tabData = {
    llm: {
      selectedModels: generationModels,
      onChange: onGenerationModelsChange,
      models: availableMaaSModels,
    },
    embedding: {
      selectedModels: embeddingModels,
      onChange: onEmbeddingModelsChange,
      models: availableMaaSModels,
    },
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
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapSm' }}
      data-testid="models-to-test-section"
    >
      <Content
        component="h4"
        className="autorag-model-selection__label"
        data-testid="models-to-test-label"
      >
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          gap={{ default: 'gapSm' }}
          className="autorag-model-selection__label-row"
          data-testid="models-to-test-label-row"
        >
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
            <span>Models to test</span>
            <span
              aria-hidden="true"
              className="autorag-model-selection__required-asterisk"
              data-testid="models-to-test-required"
            >
              *
            </span>
            <span className="pf-v6-screen-reader">required</span>
          </Flex>
          <Popover
            bodyContent={<ModelsToTestHelpContent />}
            aria-label="Models to test help"
            maxWidth="30rem"
          >
            <DashboardPopupIconButton
              aria-label="More info for models to test"
              icon={<OutlinedQuestionCircleIcon />}
              hasNoPadding
              data-testid="models-to-test-help"
            />
          </Popover>
        </Flex>
      </Content>
      <div data-testid="model-selection-section">
        {modelsLoading || !modelsLoaded ? (
          <Skeleton
            data-testid="modal-maas-models-loading"
            width="100%"
            screenreaderText="Loading MaaS models"
          />
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
              const { selectedModels, onChange, models: tabModels } = tabData[modelType];
              const oppositeSelectedModels =
                tabData[modelType === 'llm' ? 'embedding' : 'llm'].selectedModels;
              const oppositeSelectedModelIds = new Set(oppositeSelectedModels);
              const selectableModels = tabModels.filter((model) => model.ready);
              const selectableModelsNotInOppositeCategory = selectableModels.filter(
                (model) => !oppositeSelectedModelIds.has(model.id),
              );
              const selectableModelIds = new Set(selectableModels.map((model) => model.id));
              const selectedCount = selectedModels.filter((id) =>
                selectableModelIds.has(id),
              ).length;
              const allSelected =
                selectableModelsNotInOppositeCategory.length > 0 &&
                selectableModelsNotInOppositeCategory.every((model) =>
                  selectedModels.some((selectedModel) => selectedModel === model.id),
                );

              const handleSelectAll = (isSelecting: boolean) => {
                if (!isSelecting) {
                  onChange([]);
                  return;
                }

                const selectedIds = selectableModels
                  .filter((model) => !oppositeSelectedModelIds.has(model.id))
                  .map((model) => model.id)
                  .toSorted((a, b) => a.localeCompare(b));
                const updatedOppositeModels = oppositeSelectedModels.filter(
                  (id) => !selectedIds.includes(id),
                );

                onChange(selectedIds);
                tabData[modelType === 'llm' ? 'embedding' : 'llm'].onChange(updatedOppositeModels);
              };

              const handleToggleModel = (model: MaaSModel, isSelecting: boolean) => {
                if (!model.ready) {
                  return;
                }
                const modelId = model.id;
                const updated = isSelecting
                  ? [
                      ...selectedModels.filter((selectedModel) => selectedModel !== modelId),
                      modelId,
                    ]
                  : selectedModels.filter((selectedModel) => selectedModel !== modelId);
                onChange(updated.toSorted((a, b) => a.localeCompare(b)));
                if (isSelecting) {
                  tabData[modelType === 'llm' ? 'embedding' : 'llm'].onChange(
                    oppositeSelectedModels.filter((id) => id !== modelId),
                  );
                }
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
                        {selectedCount}&#8725;{selectableModels.length}
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
                    {tabModels.length === 0 ? (
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
                              {sortedAndPaginatedModels.map((model) => (
                                <Tr key={model.id} data-testid={`model-row-${model.id}`}>
                                  <Td dataLabel="Select">
                                    {(() => {
                                      const selectedInOtherCategory = oppositeSelectedModelIds.has(
                                        model.id,
                                      );
                                      const isUnavailable = !model.ready;
                                      const checkboxDisabled =
                                        isUnavailable || selectedInOtherCategory;
                                      const modelName = model.display_name || model.id;
                                      const disabledReason = isUnavailable
                                        ? 'unavailable: model is not ready'
                                        : `unavailable: already selected in ${
                                            modelType === 'llm'
                                              ? 'Embedding models'
                                              : 'Foundation models'
                                          }`;

                                      return (
                                        <Checkbox
                                          id={`select-${modelType}-${model.id}`}
                                          isChecked={selectedModels.some(
                                            (selectedModel) => selectedModel === model.id,
                                          )}
                                          isDisabled={checkboxDisabled}
                                          aria-label={
                                            checkboxDisabled
                                              ? `${modelName} ${disabledReason}`
                                              : `Select ${modelName}`
                                          }
                                          onChange={(_, isSelecting) =>
                                            handleToggleModel(model, isSelecting)
                                          }
                                        />
                                      );
                                    })()}
                                  </Td>
                                  <Td dataLabel="Model name">
                                    <span title={model.description || model.owned_by || undefined}>
                                      {model.display_name || model.id}
                                    </span>
                                    {(!model.ready || oppositeSelectedModelIds.has(model.id)) && (
                                      <span className="pf-v6-screen-reader">
                                        {model.ready
                                          ? `Unavailable: already selected in ${
                                              modelType === 'llm'
                                                ? 'Embedding models'
                                                : 'Foundation models'
                                            }`
                                          : 'Unavailable: model is not ready'}
                                      </span>
                                    )}
                                  </Td>
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
    </Flex>
  );
};

export default AutoragExperimentSettingsModelSelection;
