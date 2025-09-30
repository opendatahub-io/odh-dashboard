import * as React from 'react';
import { DashboardEmptyTableView, Table, useCheckboxTableBase } from 'mod-arch-shared';
import {
  Content,
  Flex,
  SearchInput,
  Stack,
  StackItem,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import { AIModel } from '~/app/types';
import { chatbotConfigurationColumns } from './columns';
import ChatbotConfigurationTableRow from './ChatbotConfigurationTableRow';

type ChatbotConfigurationTableProps = {
  allModels: AIModel[];
  selectedModels: AIModel[];
  setSelectedModels: React.Dispatch<React.SetStateAction<AIModel[]>>;
};

const ChatbotConfigurationTable: React.FC<ChatbotConfigurationTableProps> = ({
  allModels,
  selectedModels,
  setSelectedModels,
}) => {
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
        <Title headingLevel="h4">Available models</Title>
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
          enablePagination
          data={filteredModels}
          columns={chatbotConfigurationColumns}
          rowRenderer={(model) => (
            <ChatbotConfigurationTableRow
              key={model.model_name}
              isChecked={isSelected(model)}
              onToggleCheck={() => toggleSelection(model)}
              model={model}
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
