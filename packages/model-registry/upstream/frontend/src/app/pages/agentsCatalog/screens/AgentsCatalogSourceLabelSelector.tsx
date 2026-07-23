import * as React from 'react';
import {
  Button,
  Flex,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { ArrowRightIcon, FilterIcon } from '@patternfly/react-icons';
import { useThemeContext } from 'mod-arch-kubeflow';
import { ThemeAwareSearchInput } from 'mod-arch-shared';
import { RESET_ALL_FILTERS_LABEL } from '~/app/shared/components/catalog';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { hasAgentFiltersApplied } from '~/app/pages/agentsCatalog/utils/agentsCatalogUtils';
import AgentsCatalogActiveFilters from '~/app/pages/agentsCatalog/components/AgentsCatalogActiveFilters';
import AgentsCatalogSourceLabelBlocks from './AgentsCatalogSourceLabelBlocks';

type AgentsCatalogSourceLabelSelectorProps = {
  searchTerm: string;
  onSearch: (term: string) => void;
  onClearSearch: () => void;
  onResetAllFilters: () => void;
};

const AgentsCatalogSourceLabelSelector: React.FC<AgentsCatalogSourceLabelSelectorProps> = ({
  searchTerm,
  onSearch,
  onClearSearch,
  onResetAllFilters,
}) => {
  const [inputValue, setInputValue] = React.useState(searchTerm || '');
  const { isMUITheme } = useThemeContext();
  const { filters } = React.useContext(AgentsCatalogContext);

  const hasFiltersAppliedValue = hasAgentFiltersApplied(filters, searchTerm);

  React.useEffect(() => {
    setInputValue(searchTerm || '');
  }, [searchTerm]);

  const handleClearAllFilters = React.useCallback(() => {
    if (hasFiltersAppliedValue) {
      onResetAllFilters();
    }
  }, [hasFiltersAppliedValue, onResetAllFilters]);

  const handleSearch = React.useCallback(() => {
    if (inputValue.trim() !== searchTerm) {
      onSearch(inputValue.trim());
    }
  }, [inputValue, searchTerm, onSearch]);

  const handleClear = React.useCallback(() => {
    onClearSearch();
  }, [onClearSearch]);

  const handleSearchInputChange = React.useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleSearchInputSearch = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, value: string) => {
      onSearch(value.trim());
    },
    [onSearch],
  );

  const toolbarClearAllProps = hasFiltersAppliedValue
    ? {
        clearAllFilters: handleClearAllFilters,
        clearFiltersButtonText: RESET_ALL_FILTERS_LABEL,
      }
    : undefined;

  return (
    <Stack hasGutter>
      <StackItem>
        <Toolbar
          className="pf-v6-u-pb-0"
          key={hasFiltersAppliedValue ? 'has-filters' : 'no-filters'}
          {...(toolbarClearAllProps ?? {})}
        >
          <ToolbarContent rowWrap={{ default: 'wrap' }}>
            <Flex style={{ flex: 1 }}>
              <ToolbarToggleGroup style={{ flex: 1 }} breakpoint="md" toggleIcon={<FilterIcon />}>
                <ToolbarGroup
                  style={{ flex: 1 }}
                  variant="filter-group"
                  gap={{ default: 'gapMd' }}
                  alignItems="center"
                >
                  <ToolbarItem style={{ flex: 1 }}>
                    <ThemeAwareSearchInput
                      data-testid="agents-catalog-search-input"
                      aria-label="Search agents"
                      className="toolbar-fieldset-wrapper"
                      placeholder="Search by name, keyword, or description"
                      value={inputValue}
                      onChange={handleSearchInputChange}
                      onSearch={handleSearchInputSearch}
                      onClear={handleClear}
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    {isMUITheme && (
                      <Button
                        isInline
                        aria-label="arrow-right-button"
                        data-testid="agents-search-button"
                        variant="link"
                        icon={<ArrowRightIcon />}
                        iconPosition="right"
                        onClick={handleSearch}
                      />
                    )}
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarToggleGroup>
              {hasFiltersAppliedValue && <AgentsCatalogActiveFilters />}
            </Flex>
          </ToolbarContent>
        </Toolbar>
      </StackItem>
      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <AgentsCatalogSourceLabelBlocks />
        </Flex>
      </StackItem>
    </Stack>
  );
};

export default AgentsCatalogSourceLabelSelector;
