import * as React from 'react';
import {
  Badge,
  Divider,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarFilter,
} from '@patternfly/react-core';

type SearchableMultiSelectFilterProps = {
  categoryName: string;
  options: string[];
  selected: string[];
  formatLabel: (value: string) => string;
  onToggleOption: (value: string) => void;
  onClearAll: () => void;
  testIdPrefix: string;
  testId?: string;
  isDisabled?: boolean;
};

const SearchableMultiSelectFilter: React.FC<SearchableMultiSelectFilterProps> = ({
  categoryName,
  options,
  selected,
  formatLabel,
  onToggleOption,
  onClearAll,
  testIdPrefix,
  testId,
  isDisabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const filterTestId = testId ?? `${testIdPrefix}-filter`;

  const filtered = React.useMemo(() => {
    const term = search.toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter(
      (opt) => opt.toLowerCase().includes(term) || formatLabel(opt).toLowerCase().includes(term),
    );
  }, [options, search, formatLabel]);

  return (
    <ToolbarFilter
      labels={selected.map((v) => ({ key: v, node: formatLabel(v) }))}
      deleteLabel={(_category, label) => {
        const val = typeof label === 'string' ? label : label.key;
        onToggleOption(val);
      }}
      deleteLabelGroup={onClearAll}
      categoryName={categoryName}
    >
      <Select
        role="menu"
        isOpen={isOpen}
        onSelect={(_event, value) => {
          if (typeof value === 'string') {
            onToggleOption(value);
          }
        }}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSearch('');
          }
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen((prev) => !prev)}
            isExpanded={isOpen}
            isDisabled={isDisabled}
            data-testid={filterTestId}
            badge={
              selected.length > 0 ? (
                <Badge isRead data-testid={`${filterTestId}-badge`}>
                  {selected.length}
                </Badge>
              ) : undefined
            }
          >
            {categoryName}
          </MenuToggle>
        )}
        data-testid={`${filterTestId}-select`}
        maxMenuHeight="400px"
      >
        <MenuSearch>
          <MenuSearchInput>
            <SearchInput
              aria-label={`Search ${categoryName.toLowerCase()}`}
              placeholder={`Search ${categoryName.toLowerCase()}`}
              value={search}
              onChange={(_event, value) => setSearch(value)}
              onClear={() => setSearch('')}
              data-testid={`${testIdPrefix}-search-input`}
            />
          </MenuSearchInput>
        </MenuSearch>
        <Divider />
        <SelectList>
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <SelectOption
                key={opt}
                value={opt}
                hasCheckbox
                isSelected={selected.includes(opt)}
                data-testid={`${filterTestId}-option-${opt}`}
              >
                {formatLabel(opt)}
              </SelectOption>
            ))
          ) : (
            <SelectOption isDisabled>No results found</SelectOption>
          )}
        </SelectList>
      </Select>
    </ToolbarFilter>
  );
};

export default SearchableMultiSelectFilter;
