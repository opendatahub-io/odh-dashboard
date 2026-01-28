import * as React from 'react';
import { DashboardEmptyTableView, Table, useCheckboxTableBase } from 'mod-arch-shared';
import {
  Content,
  Flex,
  FlexItem,
  SearchInput,
  Stack,
  StackItem,
  Switch,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import useFetchGuardrailsStatus from '~/app/hooks/useFetchGuardrailsStatus';
import { AIModel } from '~/app/types';
import { chatbotConfigurationColumns } from './columns';
import ChatbotConfigurationTableRow from './ChatbotConfigurationTableRow';
import { GuardrailsNotConfiguredAlert } from './GuardrailsNotConfiguredAlert';

type ChatbotConfigurationTableProps = {
  allModels: AIModel[];
  selectedModels: AIModel[];
  setSelectedModels: React.Dispatch<React.SetStateAction<AIModel[]>>;
  maxTokensMap: Map<string, number | undefined>;
  onMaxTokensChange: (modelName: string, value: number | undefined) => void;
  enableGuardrails?: boolean;
  setEnableGuardrails?: React.Dispatch<React.SetStateAction<boolean>>;
};

const ChatbotConfigurationTable: React.FC<ChatbotConfigurationTableProps> = ({
  allModels,
  selectedModels,
  setSelectedModels,
  maxTokensMap,
  onMaxTokensChange,
  enableGuardrails = false,
  setEnableGuardrails,
}) => {
  // Gate all guardrails UI behind the guardrails feature flag
  const isGuardrailsFeatureEnabled = useGuardrailsEnabled();
  const { isReady: isGuardrailsReady, loaded: guardrailsStatusLoaded } = useFetchGuardrailsStatus();

  const { tableProps, isSelected, toggleSelection } = useCheckboxTableBase<AIModel>(
    allModels,
    selectedModels,
    setSelectedModels,
    React.useCallback((model) => model.model_name, []),
  );

  const [search, setSearch] = React.useState('');
  const filteredModels = React.useMemo(
    () =>
      allModels.filter((model) => model.display_name.toLowerCase().includes(search.toLowerCase())),
    [allModels, search],
  );

  const availableModels = React.useMemo(
    () => filteredModels.filter((model) => model.status === 'Running'),
    [filteredModels],
  );

  const selectedModelsIds = selectedModels.map((model) => model.model_name);
  const availableModelsIds = availableModels.map((model) => model.model_name);

  const isAllSelected =
    availableModels.length > 0 && availableModelsIds.every((id) => selectedModelsIds.includes(id));

  const handleSelectAll = (value: boolean) => {
    setSelectedModels((prev) => {
      // Create a set of the filtered model names
      const availableIds = new Set(availableModels.map((m) => m.model_name));

      // If the select all checkbox is checked, we want to add the filtered models to the selected models
      if (value) {
        // Create a map of the current selected models by model name
        const byId = new Map(prev.map((m) => [m.model_name, m]));
        // Add the filtered models to the map
        availableModels.forEach((m) => byId.set(m.model_name, m));
        // Return the selected model names as an array from the map
        return Array.from(byId.values());
      }

      // If the select all checkbox is unchecked, we want to remove the filtered models from the selected models
      return prev.filter((m) => !availableIds.has(m.model_name));
    });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <GuardrailsNotConfiguredAlert />
      </StackItem>
      {/* Only show guardrails toggle when feature flag is enabled */}
      {isGuardrailsFeatureEnabled && guardrailsStatusLoaded && (
        <StackItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Title headingLevel="h3" size="md">
                Guardrails
              </Title>
            </FlexItem>
            <FlexItem>
              <Switch
                id="guardrails-toggle"
                label=""
                aria-label="Toggle guardrails"
                isChecked={enableGuardrails}
                onChange={(_, checked) => {
                  if (setEnableGuardrails) {
                    setEnableGuardrails(checked);
                  }
                }}
                // Ensure the toggle is disabled when status ≠ Ready
                isDisabled={!isGuardrailsReady}
                data-testid="guardrails-toggle-switch"
              />
            </FlexItem>
          </Flex>
        </StackItem>
      )}
      <StackItem>
        <Title headingLevel="h2" size="md">
          Available models
        </Title>
      </StackItem>
      <StackItem>
        <Table
          {...tableProps}
          toolbarContent={
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <ToolbarItem style={{ minWidth: '350px' }}>
                <SearchInput
                  aria-label="Search by model name"
                  placeholder="Find by name"
                  onChange={(_, value) => setSearch(value)}
                  onClear={() => setSearch('')}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Content component="small">
                  {selectedModels.length} out of {allModels.length} selected
                </Content>
              </ToolbarItem>
            </Flex>
          }
          defaultSortColumn={1}
          enablePagination
          data={filteredModels}
          columns={chatbotConfigurationColumns}
          rowRenderer={(model) => (
            <ChatbotConfigurationTableRow
              key={model.model_name}
              isChecked={isSelected(model)}
              onToggleCheck={() => toggleSelection(model)}
              model={model}
              maxTokens={maxTokensMap.get(model.model_name)}
              onMaxTokensChange={(value) => onMaxTokensChange(model.model_name, value)}
            />
          )}
          selectAll={{
            disabled: filteredModels.length === 0,
            onSelect: handleSelectAll,
            selected: isAllSelected,
            tooltip: 'Select all models',
          }}
          emptyTableView={<DashboardEmptyTableView onClearFilters={() => setSearch('')} />}
          data-testid="chatbot-configuration-table"
        />
      </StackItem>
    </Stack>
  );
};

export default ChatbotConfigurationTable;
