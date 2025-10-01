import * as React from 'react';
import {
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  DropdownItem,
  MenuToggle,
  DropdownList,
  Label,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Popover,
  Content,
} from '@patternfly/react-core';
import { CloseIcon, FilterIcon } from '@patternfly/react-icons';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import { aiModelColumns } from '~/app/AIAssets/data/columns';
import useAIModelsFilter from '~/app/AIAssets/hooks/useAIModelsFilter';
import { AIAssetsFilterOptions, aiAssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';
import AIModelTableRow from './AIModelTableRow';

type AIModelsTableProps = {
  models: AIModel[];
  playgroundModels: LlamaModel[];
  onTryInPlayground: (model: AIModel) => void;
  lsdStatus: LlamaStackDistributionModel | null;
};

export const AIModelStatusPopoverContent: React.ReactNode = (
  <Content component="ol">
    <Content component="li">
      Go to your <strong>model deployments</strong> page
    </Content>
    <Content component="li">
      Select &apos;<strong>Edit</strong>&apos; to update your deployment
    </Content>
    <Content component="li">
      Check the box: &apos;
      <strong>Make this deployment available as an AI Asset</strong>&apos;
    </Content>
  </Content>
);

const AIModelsTable: React.FC<AIModelsTableProps> = ({
  models,
  playgroundModels,
  onTryInPlayground,
  lsdStatus,
}) => {
  const { filterData, onFilterUpdate, onClearFilters, filteredModels } = useAIModelsFilter(models);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<AIAssetsFilterOptions>(
    AIAssetsFilterOptions.NAME,
  );
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearch = () => {
    onFilterUpdate(currentFilterType, searchValue);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleRemoveFilter = (filterType: AIAssetsFilterOptions) => {
    onFilterUpdate(filterType, '');
  };

  // Get active filters for display
  const activeFilters = Object.entries(filterData).filter(([, value]) => value && value !== '');

  // Get label color based on filter type
  const getLabelColor = (filterType: string): 'blue' | 'green' | 'purple' => {
    switch (filterType) {
      case AIAssetsFilterOptions.NAME:
        return 'blue';
      case AIAssetsFilterOptions.KEYWORD:
        return 'green';
      case AIAssetsFilterOptions.USE_CASE:
        return 'purple';
      default:
        return 'blue';
    }
  };

  // Helper function to safely get filter type
  const getFilterType = (key: string): AIAssetsFilterOptions => {
    if (key === AIAssetsFilterOptions.NAME) {
      return AIAssetsFilterOptions.NAME;
    }
    if (key === AIAssetsFilterOptions.KEYWORD) {
      return AIAssetsFilterOptions.KEYWORD;
    }
    if (key === AIAssetsFilterOptions.USE_CASE) {
      return AIAssetsFilterOptions.USE_CASE;
    }
    return AIAssetsFilterOptions.NAME; // fallback
  };

  const toolbarContent = (
    <Toolbar data-testid="ai-models-table-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <Dropdown
              onOpenChange={(isOpen) => setIsFilterDropdownOpen(isOpen)}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="Filter toggle"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  isExpanded={isFilterDropdownOpen}
                  icon={<FilterIcon />}
                >
                  {aiAssetsFilterOptions[currentFilterType]}
                </MenuToggle>
              )}
              isOpen={isFilterDropdownOpen}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {Object.entries(aiAssetsFilterOptions).map(([key, label]) => (
                  <DropdownItem
                    key={key}
                    id={key}
                    onClick={() => {
                      setIsFilterDropdownOpen(false);
                      setCurrentFilterType(getFilterType(key));
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder={`Filter by ${aiAssetsFilterOptions[currentFilterType].toLowerCase()}...`}
              value={searchValue}
              onChange={(_event, value) => handleSearchChange(value || '')}
              onSearch={handleSearch}
            />
          </ToolbarItem>
        </ToolbarGroup>

        <ToolbarGroup variant="action-group">
          <ToolbarItem>
            <Popover
              position="bottom"
              showClose
              headerContent={
                <div style={{ padding: '16px 16px 0 16px' }}>
                  To make a model deployment available:
                </div>
              }
              bodyContent={
                <div style={{ padding: '0 16px 16px 16px' }}>{AIModelStatusPopoverContent}</div>
              }
            >
              <Button variant={ButtonVariant.link} data-testid="dont-see-model-button">
                Don&apos;t see the model you&apos;re looking for?
              </Button>
            </Popover>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>

      {activeFilters.length > 0 && (
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <span
                style={{
                  fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
                }}
              >
                Active filters:
              </span>
            </ToolbarItem>
            <ToolbarItem>
              <Flex gap={{ default: 'gapSm' }} wrap="wrap">
                {activeFilters.map(([filterType, value]) => {
                  const displayValue =
                    typeof value === 'string' ? value : value?.label || value?.value || '';
                  return (
                    <FlexItem key={filterType}>
                      <Label
                        color={getLabelColor(filterType)}
                        onClose={() => handleRemoveFilter(getFilterType(filterType))}
                        closeBtnProps={{
                          'aria-label': `Remove ${aiAssetsFilterOptions[getFilterType(filterType)]} filter`,
                        }}
                      >
                        {aiAssetsFilterOptions[getFilterType(filterType)]}: {displayValue}
                      </Label>
                    </FlexItem>
                  );
                })}
                <FlexItem>
                  <Button
                    variant={ButtonVariant.link}
                    onClick={onClearFilters}
                    icon={<CloseIcon />}
                  >
                    Clear all filters
                  </Button>
                </FlexItem>
              </Flex>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      )}
    </Toolbar>
  );

  return (
    <Table
      data-testid="ai-models-table"
      data={filteredModels}
      columns={aiModelColumns}
      disableRowRenderSupport
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
      rowRenderer={(model) => (
        <AIModelTableRow
          lsdStatus={lsdStatus}
          key={model.model_name}
          model={model}
          models={models}
          playgroundModels={playgroundModels}
          onTryInPlayground={onTryInPlayground}
        />
      )}
    />
  );
};

export default AIModelsTable;
